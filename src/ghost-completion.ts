/** Ghost Tab completion: 热路径 = 本地补全器（命令/本页token/词库，零 LLM）；FIM LLM 仅手动 Ctrl+Shift+G，硬隔离。 */
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type ViewUpdate,
  type DecorationSet,
} from "@codemirror/view";
import { Prec, StateEffect, StateField } from "@codemirror/state";
import type { AiClient } from "./ai-client";
import type { TopicCollabSettings } from "./settings";
import type { LocalCompleter, GhostCandidate } from "./local-completer";

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: GhostWidget): boolean {
    return other.text === this.text;
  }
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "topic-collab-ghost";
    span.textContent = this.text;
    return span;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

const setGhost = StateEffect.define<GhostCandidate | null>();

const ghostField = StateField.define<GhostCandidate | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGhost)) return e.value;
    }
    if (tr.docChanged || tr.selection) return null;
    return value;
  },
  provide: (f) =>
    EditorView.decorations.from(f, (v) => {
      if (!v || !v.text) return Decoration.none;
      return Decoration.set([
        Decoration.widget({
          widget: new GhostWidget(v.text),
          side: 1,
        }).range(v.pos),
      ]);
    }),
});

/** Rule-based pre-scan: should we ask the LLM? */
export function shouldRequestGhost(
  doc: string,
  pos: number,
  latexBias: number
): "latex" | "prose" | "none" {
  const before = doc.slice(Math.max(0, pos - 400), pos);
  const after = doc.slice(pos, Math.min(doc.length, pos + 80));

  const dollars = (before.match(/\$/g) || []).length;
  const inInlineMath = dollars % 2 === 1;
  const lastOpenBlock = before.lastIndexOf("$$");
  const lastCloseHint = before.lastIndexOf("$$\n");
  const inBlockMath =
    lastOpenBlock >= 0 &&
    (lastCloseHint < lastOpenBlock ||
      !before.slice(lastOpenBlock + 2).includes("$$"));

  if (inInlineMath || inBlockMath || /\\begin\{/.test(before.slice(-80))) {
    return "latex";
  }
  if (/\[公式\]\s*$/.test(before)) return "latex";
  if (latexBias >= 0.85) {
    if (/[=\\]\s*$/.test(before) || /\$\s*$/.test(before)) return "latex";
    return "none";
  }
  if (
    latexBias <= 0.35 &&
    /[。；：\n]\s*$/.test(before) &&
    after.trim() === ""
  ) {
    return "prose";
  }
  if (/\\\\\s*$/.test(before) || /[=,]\s*$/.test(before)) return "latex";
  return "none";
}

function buildFimPrompt(
  prefix: string,
  suffix: string,
  mode: "latex" | "prose",
  latexBias: number
): { system: string; user: string } {
  const latexHeavy = latexBias >= 0.5;
  const system =
    mode === "latex" || latexHeavy
      ? `你是 Obsidian 数学笔记的 fill-in-the-middle 补全器。
只输出应插入在光标处的续写片段，不要解释、不要 markdown 围栏、不要重复 prefix。
优先补全 LaTeX（$...$ 或公式片段）。不要写长段中文论述。最多约 120 字符。`
      : `你是 Obsidian 课题笔记的 fill-in-the-middle 补全器。
只输出光标处短续写。不要解释。不要复述 prefix。最多约 80 汉字或等价符号。`;

  const user = `PREFIX:
<<<
${prefix.slice(-1200)}
>>>

SUFFIX:
<<<
${suffix.slice(0, 400)}
>>>

MODE: ${mode}
输出续写片段：`;

  return { system, user };
}

export interface GhostHost {
  getSettings: () => TopicCollabSettings;
  getAiClient: () => AiClient;
  /** Optional UI notice (Obsidian Notice) */
  notify?: (msg: string) => void;
  /** 当前活动笔记路径（用于词库 / 本页索引定位） */
  getActiveNotePath?: () => string;
  /** 本地补全器（命令 + 本页 token + 词库 + 别名），null 则本地层关闭 */
  local?: LocalCompleter;
}

/** Shared controller so commands can trigger the same request path. */
export class GhostController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private localSeq = 0;
  private inFlight = false;
  private lastRequestAt = 0;
  private lastView: EditorView | null = null;

  constructor(private host: GhostHost) {}

  /** Track active editor from ViewPlugin updates. */
  attachView(view: EditorView): void {
    this.lastView = view;
  }

  clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Cancel pending idle request; bump seq so in-flight result is ignored. */
  cancelPending(): void {
    this.clearTimer();
    this.seq++;
    this.localSeq++;
  }

  scheduleIdle(view: EditorView): void {
    const settings = this.host.getSettings();
    if (settings.ghostMode !== "idle") return;
    this.attachView(view);
    this.clearTimer();
    const delay = Math.max(800, settings.ghostDebounceMs);
    const my = ++this.seq;
    this.timer = setTimeout(() => {
      void this.request(view, my, "idle");
    }, delay);
  }

  /**
   * 本地补全（命令 / 本页 token / 词库）。零 LLM。
   * CM 禁止在 ViewPlugin.update 内 dispatch，故延后到下一个宏任务；
   * localSeq 用于丢弃过期计算。
   */
  scheduleLocal(view: EditorView): void {
    const settings = this.host.getSettings();
    if (!settings.localCompletion) return;
    if (!this.host.local) return;
    const my = ++this.localSeq;
    const path = this.host.getActiveNotePath?.() ?? "";
    setTimeout(() => {
      if (my !== this.localSeq) return;
      const doc = view.state.doc.toString();
      const pos = view.state.selection.main.head;
      this.host.local!.updateDocument(doc);
      const cand = this.host.local!.complete(doc, pos, path);
      if (cand) {
        view.dispatch({ effects: setGhost.of(cand) });
      }
    }, 0);
  }

  /** Manual hotkey / command. */
  requestManual(view?: EditorView): void {
    const settings = this.host.getSettings();
    if (settings.ghostMode === "off") {
      this.host.notify?.("幽灵补全已关闭（设置 → 幽灵模式）");
      return;
    }
    const v = view ?? this.lastView;
    if (!v) {
      this.host.notify?.("请先把光标放在笔记编辑器里");
      return;
    }
    this.clearTimer();
    const my = ++this.seq;
    void this.request(v, my, "manual");
  }

  private async request(
    view: EditorView,
    my: number,
    reason: "idle" | "manual"
  ): Promise<void> {
    const settings = this.host.getSettings();
    if (settings.ghostMode === "off") return;
    if (settings.ghostMode === "idle" && reason !== "idle" && reason !== "manual")
      return;
    // manual allowed in both manual and idle modes
    if (settings.ghostMode === "manual" && reason === "idle") return;

    if (!settings.apiKey.trim()) {
      if (reason === "manual") this.host.notify?.("请先填写 API Key");
      return;
    }

    const cooldown = Math.max(3000, settings.ghostCooldownMs);
    const now = Date.now();
    if (this.inFlight) {
      if (reason === "manual") this.host.notify?.("补全请求进行中，请稍候");
      return;
    }
    if (now - this.lastRequestAt < cooldown) {
      const wait = Math.ceil((cooldown - (now - this.lastRequestAt)) / 1000);
      if (reason === "manual") {
        this.host.notify?.(`冷却中，约 ${wait}s 后再试（防刷爆 API）`);
      }
      return;
    }

    const pos = view.state.selection.main.head;
    const doc = view.state.doc.toString();
    const mode = shouldRequestGhost(doc, pos, settings.latexBias);
    if (mode === "none") {
      if (reason === "manual") {
        this.host.notify?.(
          "当前位置不像公式环境（调低 latexBias 或写到 $...$ 内再试）"
        );
      }
      return;
    }

    const prefix = doc.slice(0, pos);
    const suffix = doc.slice(pos);
    const { system, user } = buildFimPrompt(
      prefix,
      suffix,
      mode,
      settings.latexBias
    );

    this.inFlight = true;
    this.lastRequestAt = now;
    if (reason === "manual") this.host.notify?.("正在请求幽灵补全…");

    try {
      const client = this.host.getAiClient();
      let text = await client.completeRaw(system, user, {
        maxTokens: mode === "latex" ? 160 : 100,
        temperature: 0.2,
        model: settings.ghostModel,
      });
      if (my !== this.seq) return;
      text = sanitizeGhost(text, mode);
      if (!text) {
        if (reason === "manual") this.host.notify?.("模型未返回可用片段");
        return;
      }
      view.dispatch({
        effects: setGhost.of({ text, pos: view.state.selection.main.head }),
      });
    } catch (e) {
      console.warn("[topic-collab] ghost failed", e);
      if (reason === "manual") {
        const msg = e instanceof Error ? e.message : String(e);
        this.host.notify?.(`补全失败：${msg.slice(0, 80)}`);
      }
    } finally {
      this.inFlight = false;
    }
  }
}

export function createGhostExtension(controller: GhostController) {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {
        controller.attachView(view);
      }

      update(update: ViewUpdate) {
        controller.attachView(update.view);
        if (!(update.docChanged || update.selectionSet)) return;
        // 幽灵的清除由 ghostField 的 doc/selection 变化自动完成，勿在此 dispatch
        controller.cancelPending();
        if (update.docChanged) {
          controller.scheduleLocal(update.view);
          controller.scheduleIdle(update.view);
        }
      }
    }
  );

  const acceptKeymap = Prec.high(
    keymap.of([
      {
        key: "Tab",
        run: (view) => {
          const g = view.state.field(ghostField, false);
          if (!g?.text) return false;
          view.dispatch({
            changes: { from: g.pos, insert: g.text },
            selection: { anchor: g.pos + (g.cursorOffset ?? g.text.length) },
            effects: setGhost.of(null),
          });
          return true;
        },
      },
      {
        key: "Escape",
        run: (view) => {
          const g = view.state.field(ghostField, false);
          if (!g) return false;
          view.dispatch({ effects: setGhost.of(null) });
          return true;
        },
      },
    ])
  );

  return [ghostField, plugin, acceptKeymap];
}

function sanitizeGhost(raw: string, mode: "latex" | "prose"): string {
  let t = raw.trim();
  t = t.replace(/^```[\s\S]*?\n/, "").replace(/```$/, "").trim();
  t = t.replace(/^续写片段[：:]\s*/i, "");
  if (t.startsWith("PREFIX") || t.startsWith("<<<")) return "";
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("「") && t.endsWith("」"))
  ) {
    t = t.slice(1, -1);
  }
  if (mode === "latex" && t.length > 200) t = t.slice(0, 200);
  if (mode === "prose" && t.length > 120) t = t.slice(0, 120);
  if ((t.match(/[\u4e00-\u9fff]/g) || []).length > 80 && mode === "latex") {
    if (!/[\\$^=_{}]/.test(t)) return "";
  }
  return t;
}

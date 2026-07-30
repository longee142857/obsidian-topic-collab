import { App, MarkdownView, TFile } from "obsidian";
import type TopicCollabPlugin from "./main";
import type { Intent } from "./settings";
import type { SubmitSource } from "./prompts";

/** 单篇笔记的协作会话 */
export interface NoteSession {
  filePath: string;
  baseline: string;
  pendingText: string;
}

export interface SubmitPayload {
  filePath: string;
  primary: string;
  context: string;
  prompt: string;
  source: SubmitSource;
}

export class CollabController {
  collabActive = false;
  private debounceTimer: number | null = null;
  private sessions = new Map<string, NoteSession>();

  /** @ 绑定的笔记路径列表（打开笔记时自动加入） */
  boundNotePaths: string[] = [];
  /** 当前活跃的笔记路径（正在编辑的文件） */
  activeNotePath = "";
  userPrompt = "";

  pendingText = "";
  pendingWords = 0;
  hasComplexEdit = false;

  cachedSelection = "";
  cachedSelectionPath = "";

  constructor(private plugin: TopicCollabPlugin) {}

  toggle(): boolean {
    this.collabActive = !this.collabActive;
    if (this.collabActive) {
      void this.plugin.ensureSidebar();
      this.tryBindFromWorkspace();
    } else {
      this.plugin.cancelStream();
      this.clearAllSessions();
    }
    this.plugin.refreshSidebar();
    void this.plugin.refreshConversationUI();
    return this.collabActive;
  }

  setActive(active: boolean): void {
    if (this.collabActive === active) return;
    this.collabActive = active;
    if (active) {
      void this.plugin.ensureSidebar();
      this.tryBindFromWorkspace();
    } else {
      this.plugin.cancelStream();
      this.clearAllSessions();
    }
    this.plugin.refreshSidebar();
    void this.plugin.refreshConversationUI();
  }

  /** 将笔记加入 @ 列表，设为当前活跃 */
  addBoundNote(path: string): void {
    if (!path.endsWith(".md")) return;
    if (!this.boundNotePaths.includes(path)) {
      this.boundNotePaths.push(path);
    }
    this.activeNotePath = path;
    if (!this.sessions.has(path)) {
      void this.initSessionFromVault(path);
    } else {
      this.syncPendingState(path);
    }
    this.plugin.refreshSidebar();
    void this.plugin.refreshConversationUI();
  }

  /** 从 @ 列表移除笔记 */
  removeBoundNote(path: string): void {
    this.boundNotePaths = this.boundNotePaths.filter((p) => p !== path);
    if (this.activeNotePath === path) {
      this.activeNotePath = this.boundNotePaths[0] ?? "";
    }
    if (this.activeNotePath) {
      this.syncPendingState(this.activeNotePath);
    } else {
      this.pendingText = "";
      this.pendingWords = 0;
      this.hasComplexEdit = false;
    }
    this.plugin.refreshSidebar();
    void this.plugin.refreshConversationUI();
  }

  tryBindFromWorkspace(): void {
    const count = this.boundNotePaths.length;
    const md = this.plugin.getAnyMarkdownView();
    if (md?.file) {
      this.addBoundNote(md.file.path);
      return;
    }
    if (count > 0) return;
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view.file?.path.endsWith(".md")) {
        this.addBoundNote(view.file.path);
        return;
      }
    }
  }

  onEditorChange(view: MarkdownView): void {
    if (!this.collabActive || !view.file) return;
    this.cacheSelection(view);
    if (!this.boundNotePaths.includes(view.file.path)) {
      this.addBoundNote(view.file.path);
    }
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      void this.updatePendingFromEditor(view);
    }, this.plugin.settings.debounceMs);
  }

  onActiveLeafChange(): void {
    if (!this.collabActive) return;
    const md = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (md?.file) {
      this.cacheSelection(md);
      this.addBoundNote(md.file.path);
    }
    this.plugin.refreshSidebar();
  }

  onFileOpen(file: TFile): void {
    if (!this.collabActive || file.extension !== "md") return;
    this.addBoundNote(file.path);
  }

  cacheSelection(view: MarkdownView): void {
    const sel = view.editor.getSelection().trim();
    if (sel && view.file) {
      this.cachedSelection = sel;
      this.cachedSelectionPath = view.file.path;
    }
  }

  /** 优先读编辑器缓冲（含未保存修改），否则读磁盘 */
  async readNoteContent(path: string): Promise<string> {
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view.file?.path === path) {
        return view.editor.getValue();
      }
    }
    return this.readVaultFile(path);
  }

  private truncateContext(content: string): string {
    const max = this.plugin.settings.contextMaxChars;
    if (max <= 0 || content.length <= max) return content;
    return "…\n" + content.slice(-max);
  }

  private async initSessionFromVault(path: string): Promise<void> {
    const content = await this.readNoteContent(path);
    this.sessions.set(path, {
      filePath: path,
      baseline: content,
      pendingText: "",
    });
    this.syncPendingState(path);
  }

  private async updatePendingFromEditor(view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file) return;
    const path = file.path;
    if (!this.sessions.has(path)) {
      await this.initSessionFromVault(path);
    }
    const session = this.sessions.get(path)!;
    const current = view.editor.getValue();
    const { delta, complex } = extractDelta(session.baseline, current);
    session.pendingText = delta;
    this.hasComplexEdit = complex && delta.length > 0;
    this.syncPendingState(path);
  }

  async syncPendingFromVault(path: string): Promise<void> {
    const session = this.sessions.get(path);
    if (!session) {
      await this.initSessionFromVault(path);
      return;
    }
    const current = await this.readNoteContent(path);
    const { delta, complex } = extractDelta(session.baseline, current);
    session.pendingText = delta;
    this.hasComplexEdit = complex && delta.length > 0;
    this.syncPendingState(path);
  }

  syncPendingState(path: string): void {
    const session = this.sessions.get(path);
    this.activeNotePath = path;
    this.pendingText = session?.pendingText ?? "";
    this.pendingWords = countChars(this.pendingText);
    this.plugin.refreshSidebar();
  }

  async commitPending(path: string): Promise<void> {
    const current = await this.readNoteContent(path);
    this.sessions.set(path, {
      filePath: path,
      baseline: current,
      pendingText: "",
    });
    this.syncPendingState(path);
  }

  clearPending(): void {
    if (!this.activeNotePath) return;
    void this.initSessionFromVault(this.activeNotePath);
  }

  getSelectionText(): string {
    if (!this.plugin.settings.useSelection) return "";
    if (
      this.cachedSelection &&
      this.cachedSelectionPath === this.activeNotePath
    ) {
      return this.cachedSelection;
    }
    const view = this.plugin.getAnyMarkdownView();
    if (view?.file?.path === this.activeNotePath) {
      const live = view.editor.getSelection().trim();
      if (live) return live;
    }
    return this.cachedSelection;
  }

  async buildPayload(
    app: App,
    userPrompt: string,
    intent?: Intent
  ): Promise<SubmitPayload | null> {
    const filePath = this.activeNotePath;
    if (!filePath) return null;

    const prompt = userPrompt.trim();
    const useSelection = this.plugin.settings.useSelection;
    const selection =
      useSelection && this.cachedSelectionPath === filePath
        ? this.cachedSelection.trim()
        : "";

    await this.syncPendingFromVault(filePath);
    const pending = this.pendingText.trim();

    // 读取笔记上下文（供 LLM 参考，不展示在聊天界面）
    const fileContent = await this.readNoteContent(filePath);
    let context = this.truncateContext(fileContent);

    const otherContexts: string[] = [];
    for (const p of this.boundNotePaths) {
      if (p === filePath) continue;
      const content = await this.readNoteContent(p);
      if (content.trim()) {
        const name = p.split("/").pop() || p;
        otherContexts.push(`【${name}】\n${this.truncateContext(content)}`);
      }
    }
    if (otherContexts.length > 0) {
      context =
        `${context}\n\n---\n### 其他已绑定笔记\n\n${otherContexts.join("\n\n---\n\n")}`;
    }

    if (selection) {
      return {
        filePath,
        primary: selection,
        context,
        prompt,
        source: "selection",
      };
    }

    if (prompt) {
      return {
        filePath,
        primary: prompt,
        context,
        prompt: "",
        source: "prompt",
      };
    }

    if (pending) {
      const session = this.sessions.get(filePath);
      const base = session?.baseline.trim() ?? "";
      const ctx = this.truncateContext(base);
      return {
        filePath,
        primary: pending,
        context: ctx,
        prompt: "",
        source: "delta",
      };
    }

    if (intent === "check" || intent === "discuss") {
      return {
        filePath,
        primary: context,
        context: "",
        prompt: "",
        source: "note",
      };
    }

    return null;
  }

  private async readVaultFile(path: string): Promise<string> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return "";
    return this.plugin.app.vault.read(file);
  }

  private clearAllSessions(): void {
    this.sessions.clear();
    this.boundNotePaths = [];
    this.activeNotePath = "";
    this.pendingText = "";
    this.pendingWords = 0;
    this.hasComplexEdit = false;
    this.userPrompt = "";
    this.cachedSelection = "";
    this.cachedSelectionPath = "";
  }
}

function countChars(text: string): number {
  return text.replace(/\s+/g, "").length;
}

/**
 * 从 baseline 到 current 提取新增/改动文本。
 */
export function extractDelta(
  baseline: string,
  current: string
): { delta: string; complex: boolean } {
  if (current === baseline) {
    return { delta: "", complex: false };
  }

  if (current.startsWith(baseline)) {
    return { delta: current.slice(baseline.length), complex: false };
  }

  let prefixLen = 0;
  const minLen = Math.min(baseline.length, current.length);
  while (prefixLen < minLen && baseline[prefixLen] === current[prefixLen]) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    baseline[baseline.length - 1 - suffixLen] ===
      current[current.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const inserted = current.slice(prefixLen, current.length - suffixLen);
  const removed = baseline.slice(prefixLen, baseline.length - suffixLen);

  if (inserted && !removed) {
    return { delta: inserted, complex: prefixLen < baseline.length };
  }

  if (inserted) {
    return { delta: inserted, complex: true };
  }

  return { delta: "", complex: true };
}

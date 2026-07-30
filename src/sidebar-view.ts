import {
  ItemView,
  MarkdownRenderer,
  WorkspaceLeaf,
  setIcon,
} from "obsidian";
import type TopicCollabPlugin from "./main";
import type { ConversationRound } from "./memory-session";
import { ALL_INTENTS, INTENT_LABELS, VIEW_TYPE_TOPIC_COLLAB } from "./settings";

export class TopicCollabSidebarView extends ItemView {
  private boundNoteEl!: HTMLElement;
  private stopBtn!: HTMLButtonElement;
  private memoryBarEl!: HTMLElement;
  private bufferEl!: HTMLElement;
  private clearBtn!: HTMLButtonElement;
  private promptArea!: HTMLTextAreaElement;
  private actionsEl!: HTMLElement;
  private responseEl!: HTMLElement;
  private actionBarEl!: HTMLElement;
  lastResponse = "";

  constructor(leaf: WorkspaceLeaf, private plugin: TopicCollabPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_TOPIC_COLLAB;
  }

  getDisplayText(): string {
    return "课题协作";
  }

  getIcon(): string {
    return "bot";
  }

  async onOpen(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("topic-collab-sidebar");

    const controls = containerEl.createDiv({ cls: "topic-collab-controls" });

    const toolbar = controls.createDiv({ cls: "topic-collab-toolbar" });
    toolbar.createSpan({ cls: "topic-collab-at", text: "@" });
    this.boundNoteEl = toolbar.createDiv({ cls: "topic-collab-bound-path" });
    this.stopBtn = toolbar.createEl("button", {
      cls: "topic-collab-stop-btn",
      text: "停止",
    });
    this.stopBtn.addEventListener("click", () => {
      this.plugin.cancelStream();
    });

    this.memoryBarEl = controls.createDiv({ cls: "topic-collab-memory-bar" });
    this.memoryBarEl.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-action]");
      if (!btn || !this.memoryBarEl.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute("data-action");
      if (action === "mode-single") this.plugin.setMemoryMode("single");
      else if (action === "mode-continuous") this.plugin.setMemoryMode("continuous");
      else if (action === "mode-toggle") this.plugin.toggleMemoryMode();
      else if (action === "memory-start") void this.plugin.startMemorySession();
      else if (action === "memory-end") void this.plugin.endMemorySession();
    });

    this.bufferEl = controls.createDiv({
      cls: "topic-collab-buffer is-empty",
    });

    const promptRow = controls.createDiv({ cls: "topic-collab-prompt-row" });
    this.promptArea = promptRow.createEl("textarea", {
      cls: "topic-collab-prompt",
      attr: {
        placeholder: "可选：写具体问题…",
        rows: "2",
      },
    });
    this.clearBtn = promptRow.createEl("button", {
      cls: "topic-collab-clear-btn",
      text: "清",
    });
    this.clearBtn.addEventListener("click", () => {
      this.clearBuffer();
    });
    this.promptArea.addEventListener("input", () => {
      this.plugin.collab.userPrompt = this.promptArea.value;
    });

    this.actionsEl = controls.createDiv({ cls: "topic-collab-actions" });
    ALL_INTENTS.forEach((intent) => {
      const btn = this.actionsEl.createEl("button", {
        text: INTENT_LABELS[intent],
        cls: "topic-collab-action-btn",
      });
      btn.addEventListener("click", () => {
        void this.plugin.runIntent(intent);
      });
    });

    const responseWrap = containerEl.createDiv({
      cls: "topic-collab-response-wrap",
    });

    this.actionBarEl = responseWrap.createDiv({
      cls: "topic-collab-response-actions is-hidden",
    });
    this.actionBarEl
      .createEl("button", { text: "插入光标" })
      .addEventListener("click", () => void this.plugin.insertResponse(false));
    this.actionBarEl
      .createEl("button", { text: "追加文末" })
      .addEventListener("click", () => void this.plugin.insertResponse(true));

    this.responseEl = responseWrap.createDiv({ cls: "topic-collab-response" });

    await this.renderConversation();
    this.render();
  }

  render(): void {
    if (!this.boundNoteEl) return;

    const c = this.plugin.collab;
    this.boundNoteEl.empty();
    if (c.boundNotePaths.length === 0) {
      this.boundNoteEl.createSpan({
        cls: "topic-collab-bound-placeholder",
        text: "（无绑定笔记，打开笔记自动 @）",
      });
    } else {
      for (const path of c.boundNotePaths) {
        const row = this.boundNoteEl.createDiv({
          cls: "topic-collab-bound-row",
        });
        row.toggleClass("is-active", path === c.activeNotePath);
        const name = path.split("/").pop() || path;
        row.createSpan({ text: `@ ${name}` });
        row.addEventListener("click", () => {
          c.activeNotePath = path;
          c.syncPendingState(path);
          void this.renderConversation();
          this.render();
        });
        const rmBtn = row.createEl("span", { text: " ×" });
        const targetPath = path;
        rmBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          c.removeBoundNote(targetPath);
          void this.renderConversation();
        });
      }
    }

    this.renderMemoryBar();

    if (this.promptArea && this.promptArea.value !== c.userPrompt) {
      this.promptArea.value = c.userPrompt;
    }

    const selection = c.getSelectionText();
    const hasSel = this.plugin.settings.useSelection && selection.length > 0;
    const hasPrompt = c.userPrompt.trim().length > 0;

    if (this.bufferEl) {
      this.bufferEl.empty();
      const hasContent = hasSel || hasPrompt;
      this.bufferEl.toggleClass("is-empty", !hasContent);

      if (hasSel) {
        const row = this.bufferEl.createDiv({ cls: "topic-collab-buffer-row" });
        row.createSpan({ cls: "topic-collab-buffer-icon", text: "▸" });
        const preview =
          selection.length > 34 ? selection.slice(0, 31) + "…" : selection;
        row.createSpan({
          cls: "topic-collab-buffer-text",
          text: `"${preview}"`,
        });
        row.createSpan({
          cls: "topic-collab-buffer-count",
          text: `${selection.length} 字`,
        });
        row.createSpan({ cls: "topic-collab-buffer-tag", text: "选区" });
      }
      if (hasPrompt) {
        const row = this.bufferEl.createDiv({ cls: "topic-collab-buffer-row" });
        row.createSpan({ cls: "topic-collab-buffer-icon", text: "✎" });
        const preview =
          c.userPrompt.length > 34
            ? c.userPrompt.slice(0, 31) + "…"
            : c.userPrompt;
        row.createSpan({
          cls: "topic-collab-buffer-text",
          text: `"${preview}"`,
        });
        row.createSpan({
          cls: "topic-collab-buffer-count",
          text: `${c.userPrompt.length} 字`,
        });
        row.createSpan({ cls: "topic-collab-buffer-tag", text: "输入" });
      }
    }

    const useSelection = this.plugin.settings.useSelection;
    const hasBound = c.boundNotePaths.length > 0;
    const hasRequest =
      hasPrompt ||
      (useSelection && selection.length > 0) ||
      c.pendingText.trim().length > 0 ||
      hasBound;

    const continuous = this.plugin.settings.memoryMode === "continuous";
    const recording = this.plugin.isMemoryRecording();
    const needStart = continuous && !recording;

    const canSubmit =
      c.collabActive &&
      hasBound &&
      hasRequest &&
      !this.plugin.isStreaming &&
      !needStart;

    this.actionsEl?.toggleClass("is-muted", !canSubmit);

    this.actionBarEl?.toggleClass(
      "is-hidden",
      !this.lastResponse.trim() || this.plugin.isStreaming
    );
  }

  private renderMemoryBar(): void {
    if (!this.memoryBarEl) return;
    this.memoryBarEl.empty();

    const mode = this.plugin.settings.memoryMode;
    const recording = this.plugin.isMemoryRecording();
    const rounds = this.plugin.getConversationRounds().length;

    const modeRow = this.memoryBarEl.createDiv({
      cls: "topic-collab-memory-mode",
    });
    const toggleBtn = modeRow.createEl("button", {
      cls: "topic-collab-mode-btn",
      attr: { "data-action": "mode-toggle" },
    });
    toggleBtn.setText(mode === "continuous" ? "连续" : "单次");
    toggleBtn.toggleClass("is-continuous", mode === "continuous");

    if (mode === "continuous") {
      const ctrl = this.memoryBarEl.createDiv({
        cls: "topic-collab-memory-ctrl",
      });
      if (recording) {
        ctrl.createSpan({
          cls: "topic-collab-recording-dot",
          text: "●",
        });
        ctrl.createSpan({
          cls: "topic-collab-recording-label",
          text: `记录中 · ${rounds} 轮`,
        });
        ctrl.createEl("button", {
          text: "结束记忆",
          attr: { "data-action": "memory-end" },
        });
      } else {
        ctrl.createEl("button", {
          text: "开始记忆",
          attr: { "data-action": "memory-start" },
        });
      }
    }
  }

  async renderConversation(streamingText?: string): Promise<void> {
    if (!this.responseEl) return;

    const rounds = this.plugin.getConversationRounds();
    this.responseEl.empty();

    if (rounds.length === 0 && !streamingText) {
      this.responseEl.createDiv({
        cls: "topic-collab-response-placeholder",
        text:
          this.plugin.settings.memoryMode === "continuous"
            ? "连续模式：点「开始记忆」后对话会累积显示"
            : "回复将显示在这里",
      });
      return;
    }

    const thread = this.responseEl.createDiv({ cls: "topic-collab-thread" });
    for (const round of rounds) {
      await this.appendRound(thread, round);
    }

    if (streamingText !== undefined) {
      const pending = thread.createDiv({
        cls: "topic-collab-turn topic-collab-turn-ai is-pending",
      });
      pending.setText(streamingText);
    }

    this.responseEl.scrollTop = this.responseEl.scrollHeight;
  }

  private async appendRound(
    container: HTMLElement,
    round: ConversationRound
  ): Promise<void> {
    const userEl = container.createDiv({
      cls: "topic-collab-turn topic-collab-turn-user",
    });
    userEl.createDiv({ cls: "topic-collab-turn-label", text: "我" });
    const userBody = userEl.createDiv({ cls: "topic-collab-turn-body" });
    userBody.setText(round.userDisplay);

    const aiEl = container.createDiv({
      cls: "topic-collab-turn topic-collab-turn-ai",
    });
    aiEl.createDiv({ cls: "topic-collab-turn-label", text: "AI" });
    const aiBody = aiEl.createDiv({ cls: "topic-collab-turn-body" });
    await MarkdownRenderer.render(
      this.plugin.app,
      round.assistant,
      aiBody,
      this.plugin.collab.activeNotePath ||
        this.plugin.collab.boundNotePaths[0] ||
        "",
      this
    );
  }

  beginStreaming(): void {
    void this.renderConversation("等待回复…（Thinking 模式可能 30–90 秒）");
    this.containerEl?.toggleClass("is-streaming", true);
    this.render();
  }

  endStreaming(): void {
    void this.renderConversation();
  }

  async showError(msg: string): Promise<void> {
    this.lastResponse = "";
    this.responseEl.empty();
    this.responseEl.createDiv({
      cls: "topic-collab-turn topic-collab-turn-ai is-error",
      text: `请求失败：${msg}`,
    });
    this.render();
  }

  setStreaming(active: boolean): void {
    this.containerEl?.toggleClass("is-streaming", active);
  }

  getPrompt(): string {
    return this.promptArea?.value ?? "";
  }

  clearPrompt(): void {
    if (this.promptArea) {
      this.promptArea.value = "";
    }
    this.plugin.collab.userPrompt = "";
    this.render();
  }

  clearBuffer(): void {
    this.plugin.collab.userPrompt = "";
    this.plugin.collab.cachedSelection = "";
    if (this.promptArea) {
      this.promptArea.value = "";
    }
    this.render();
  }
}

export function createRibbonIcon(el: HTMLElement): void {
  setIcon(el, "bot");
}

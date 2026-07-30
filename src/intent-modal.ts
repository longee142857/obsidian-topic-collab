import { App, Modal } from "obsidian";
import type { Intent } from "./settings";
import { ALL_INTENTS, INTENT_LABELS } from "./settings";

export interface ModalResult {
  intent: Intent;
}

export class IntentModal extends Modal {
  private chosen: Intent | null = null;
  private textarea!: HTMLTextAreaElement;

  constructor(
    app: App,
    private initialState: { selection: string; prompt: string }
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("topic-collab-intent-modal");

    contentEl.createEl("h2", { text: "课题协作" });

    // 缓冲区预览
    const hasSel = this.initialState.selection.length > 0;
    const hasPrompt = this.initialState.prompt.length > 0;
    if (hasSel || hasPrompt) {
      const prev = contentEl.createDiv({ cls: "topic-collab-modal-buffer" });
      if (hasSel) {
        const row = prev.createDiv({ cls: "topic-collab-modal-buffer-row" });
        row.createSpan({ cls: "topic-collab-modal-buffer-tag", text: "选区" });
        const sel = this.initialState.selection;
        const preview = sel.length > 60 ? sel.slice(0, 57) + "…" : sel;
        row.createSpan({ cls: "topic-collab-modal-buffer-text", text: preview });
      }
      if (hasPrompt) {
        const row = prev.createDiv({ cls: "topic-collab-modal-buffer-row" });
        row.createSpan({ cls: "topic-collab-modal-buffer-tag", text: "输入" });
        row.createSpan({ cls: "topic-collab-modal-buffer-text", text: this.initialState.prompt });
      }
    }

    // 输入框
    this.textarea = contentEl.createEl("textarea", {
      cls: "topic-collab-modal-textarea",
      attr: { placeholder: "在这里输入…（可选，已有内容会预填）", rows: "4" },
    });
    if (this.initialState.prompt) {
      this.textarea.value = this.initialState.prompt;
    }
    this.textarea.focus();

    // 四个输出选项
    const list = contentEl.createDiv({ cls: "topic-collab-intent-list" });
    ALL_INTENTS.forEach((intent) => {
      const btn = list.createEl("button", {
        cls: "mod-cta topic-collab-intent-btn",
        text: INTENT_LABELS[intent],
      });
      btn.addEventListener("click", () => {
        this.chosen = intent;
        this.close();
      });
    });

    contentEl.createEl("p", {
      cls: "topic-collab-intent-hint",
      text: "输入后点按钮选择输出方式 · Esc 取消",
    });
  }

  getText(): string {
    return this.textarea?.value ?? "";
  }

  async waitForChoice(): Promise<ModalResult | null> {
    this.open();
    return new Promise((resolve) => {
      this.onClose = () => {
        if (this.chosen) {
          resolve({ intent: this.chosen });
        } else {
          resolve(null);
        }
      };
    });
  }
}

import { App, Modal } from "obsidian";
import type { EditSuggestion } from "./edit-suggest";

export class EditConfirmModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private edits: EditSuggestion[],
    private onConfirm: (approved: EditSuggestion[]) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("topic-collab-edit-modal");

    contentEl.createEl("h2", { text: "确认修改笔记" });

    for (let i = 0; i < this.edits.length; i++) {
      const edit = this.edits[i];
      const section = contentEl.createDiv({
        cls: "topic-collab-edit-section",
      });

      const header = section.createDiv({ cls: "topic-collab-edit-header" });
      header.createSpan({
        cls: "topic-collab-edit-num",
        text: `#${i + 1}`,
      });
      header.createSpan({
        cls: "topic-collab-edit-file",
        text: edit.filePath.split("/").pop() || edit.filePath,
      });

      const origBox = section.createDiv({
        cls: "topic-collab-edit-box is-original",
      });
      origBox.createEl("div", { cls: "topic-collab-edit-box-label", text: "原文" });
      origBox.createEl("pre", { text: edit.original });

      const arrow = section.createDiv({ cls: "topic-collab-edit-arrow" });
      arrow.setText("↓");

      const newBox = section.createDiv({ cls: "topic-collab-edit-box is-new" });
      newBox.createEl("div", { cls: "topic-collab-edit-box-label", text: "改为" });
      newBox.createEl("pre", { text: edit.replacement });
    }

    const btnRow = contentEl.createDiv({ cls: "topic-collab-edit-buttons" });
    btnRow.createEl("button", {
      cls: "mod-cta",
      text: `应用 (${this.edits.length} 处)`,
    }).addEventListener("click", () => {
      this.confirmed = true;
      this.close();
    });
    btnRow.createEl("button", { text: "取消" }).addEventListener("click", () => {
      this.close();
    });
  }

  onClose(): void {
    this.onConfirm(this.confirmed ? this.edits : []);
    const { contentEl } = this;
    contentEl.empty();
  }
}

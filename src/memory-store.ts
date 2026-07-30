import { Vault, TFile, TFolder } from "obsidian";

const MEMORY_DIR = "collab-memory";

export interface MemoryRound {
  userContent: string;
  assistantContent: string;
}

/**
 * 连续模式「结束记忆」时写入一份 md（一段对话 = 一个文件）。
 * 格式：
 *
 * > 协作记忆 · 会话结束于 …
 * > 笔记：path/to/note.md
 *
 * ---
 * **我** · …
 * …
 * **AI** · …
 * …
 */
export class MemoryStore {
  constructor(private vault: Vault) {}

  private sanitize(notePath: string): string {
    return notePath
      .replace(/[/\\:?*"<>|]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private sessionFilePath(notePath: string, startedAt: string): string {
    const stamp = startedAt.slice(0, 16).replace("T", "-").replace(/:/g, "");
    return `${MEMORY_DIR}/${this.sanitize(notePath)}__${stamp}.md`;
  }

  private async ensureDir(): Promise<void> {
    if (!(await this.vault.adapter.exists(MEMORY_DIR))) {
      await this.vault.createFolder(MEMORY_DIR);
    }
  }

  /** 连续模式结束时：整段对话写入一个 md */
  async writeSession(
    notePath: string,
    startedAt: string,
    rounds: MemoryRound[]
  ): Promise<string> {
    if (rounds.length === 0) return "";

    await this.ensureDir();
    const path = this.sessionFilePath(notePath, startedAt);
    const ended = new Date().toISOString().slice(0, 16).replace("T", " ");
    const header = [
      `> 协作记忆 · 会话结束于 ${ended}`,
      `> 共 ${rounds.length} 轮对话`,
      `> 笔记：${notePath}`,
    ].join("\n");

    const body = rounds.map((r) => this.formatRound(r)).join("\n---\n\n");
    const content = header + "\n\n---\n\n" + body;

    const existing = this.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.vault.modify(existing, content);
    } else {
      await this.vault.create(path, content);
    }
    return path;
  }

  /** 删除某笔记相关的全部记忆 md */
  async removeNoteSessions(notePath: string): Promise<void> {
    const dir = this.vault.getAbstractFileByPath(MEMORY_DIR);
    if (!(dir instanceof TFolder)) return;
    const prefix = this.sanitize(notePath) + "__";
    for (const ch of dir.children) {
      if (ch instanceof TFile && ch.basename.startsWith(prefix)) {
        await this.vault.delete(ch);
      }
    }
  }

  /** 清空 collab-memory 目录 */
  async clearAll(): Promise<void> {
    const dir = this.vault.getAbstractFileByPath(MEMORY_DIR);
    if (!(dir instanceof TFolder)) return;
    for (const ch of dir.children) {
      if (ch instanceof TFile && ch.extension === "md") {
        await this.vault.delete(ch);
      }
    }
  }

  private formatRound(r: MemoryRound): string {
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    return [
      `**我** · ${ts}`,
      "",
      r.userContent,
      "",
      `**AI** · ${ts}`,
      "",
      r.assistantContent,
    ].join("\n");
  }
}

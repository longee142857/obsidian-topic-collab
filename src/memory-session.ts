import type { ChatMessage } from "./settings";

/** 侧边栏 / 记忆 md 展示用 */
export interface ConversationRound {
  userDisplay: string;
  userApi: string;
  assistant: string;
}

export interface NoteMemorySession {
  active: boolean;
  startedAt: string;
  rounds: ConversationRound[];
}

export type MemoryMode = "single" | "continuous";

export class MemorySessionManager {
  private sessions = new Map<string, NoteMemorySession>();

  getSession(notePath: string): NoteMemorySession | undefined {
    return this.sessions.get(notePath);
  }

  isActive(notePath: string): boolean {
    return this.sessions.get(notePath)?.active ?? false;
  }

  getRounds(notePath: string): ConversationRound[] {
    return this.sessions.get(notePath)?.rounds ?? [];
  }

  /** 连续模式：开始一段新记忆（清空当前轮次） */
  start(notePath: string): void {
    this.sessions.set(notePath, {
      active: true,
      startedAt: new Date().toISOString(),
      rounds: [],
    });
  }

  /** 连续模式：结束记忆，返回会话供落盘 */
  end(notePath: string): NoteMemorySession | null {
    const session = this.sessions.get(notePath);
    if (!session?.active) return null;
    session.active = false;
    return session;
  }

  addRound(
    notePath: string,
    userDisplay: string,
    userApi: string,
    assistant: string
  ): void {
    let session = this.sessions.get(notePath);
    if (!session) {
      session = {
        active: false,
        startedAt: new Date().toISOString(),
        rounds: [],
      };
      this.sessions.set(notePath, session);
    }
    session.rounds.push({ userDisplay, userApi, assistant });
  }

  /** 单次模式：只保留最近一轮用于展示 */
  setSingleRound(
    notePath: string,
    userDisplay: string,
    userApi: string,
    assistant: string
  ): void {
    this.sessions.set(notePath, {
      active: false,
      startedAt: new Date().toISOString(),
      rounds: [{ userDisplay, userApi, assistant }],
    });
  }

  getApiHistory(notePath: string, maxTurns: number): ChatMessage[] {
    const rounds = this.sessions.get(notePath)?.rounds ?? [];
    const slice =
      maxTurns > 0 ? rounds.slice(-maxTurns) : maxTurns === 0 ? [] : rounds;
    const msgs: ChatMessage[] = [];
    for (const r of slice) {
      msgs.push({ role: "user", content: r.userApi });
      msgs.push({ role: "assistant", content: r.assistant });
    }
    return msgs;
  }

  clear(notePath: string): void {
    this.sessions.delete(notePath);
  }

  clearAll(): void {
    this.sessions.clear();
  }

  serialize(): Record<string, NoteMemorySession> {
    const out: Record<string, NoteMemorySession> = {};
    for (const [path, session] of this.sessions) {
      if (session.active || session.rounds.length > 0) {
        out[path] = session;
      }
    }
    return out;
  }

  loadFrom(data: Record<string, NoteMemorySession> | undefined): void {
    this.sessions.clear();
    if (!data) return;
    for (const [path, session] of Object.entries(data)) {
      if (!session || typeof session !== "object") continue;
      this.sessions.set(path, {
        active: !!session.active,
        startedAt: session.startedAt || new Date().toISOString(),
        rounds: Array.isArray(session.rounds) ? session.rounds : [],
      });
    }
  }
}

import type { MemoryMode } from "./memory-session";

export type { MemoryMode };

export type Intent = "check" | "discuss" | "continue" | "latex" | "edit";

export type ApiProvider = "deepseek" | "anthropic";

export interface TopicCollabSettings {
  apiKey: string;
  apiProvider: ApiProvider;
  apiBaseUrl: string;
  model: string;
  enableThinking: boolean;
  reasoningEffort: "high" | "max";
  /** 开启后：编辑器有选区时，优先提交选区而非待提交增量 */
  useSelection: boolean;
  debounceMs: number;
  defaultIntent: Intent | "";
  /** 笔记上下文最大字符数，0 = 不截断（发全文） */
  contextMaxChars: number;
  /** 连续模式下发给 API 的历史轮数（0 = 不带历史） */
  historyTurns: number;
  /** 单次：每问独立；连续：手动开始/结束，结束时才写记忆 md */
  memoryMode: MemoryMode;
}

export const DEFAULT_SETTINGS: TopicCollabSettings = {
  apiKey: "",
  apiProvider: "deepseek",
  apiBaseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-pro",
  enableThinking: true,
  reasoningEffort: "high",
  useSelection: false,
  debounceMs: 500,
  defaultIntent: "",
  contextMaxChars: 0,
  historyTurns: 3,
  memoryMode: "single",
};

export const ALL_INTENTS: Intent[] = ["check", "discuss", "continue", "latex", "edit"];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const INTENT_LABELS: Record<Intent, string> = {
  check: "检错",
  discuss: "讨论",
  continue: "续写思路",
  latex: "LaTeX",
  edit: "修改笔记",
};

export const VIEW_TYPE_TOPIC_COLLAB = "topic-collab-sidebar";

/** 旧版 intent 迁移 */
export function migrateIntent(value: unknown): Intent | "" {
  if (value === "review" || value === "fix") return "check";
  if (
    value === "check" ||
    value === "discuss" ||
    value === "continue" ||
    value === "latex" ||
    value === "edit"
  ) {
    return value;
  }
  return "";
}

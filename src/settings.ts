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
  /**
   * 幽灵补全触发：off=关闭；manual=仅快捷键；idle=停笔自动（慢模型下易刷爆 API，慎用）
   */
  ghostMode: "off" | "manual" | "idle";
  /** 停笔后多久请求补全（仅 idle） */
  ghostDebounceMs: number;
  /** 两次幽灵请求最短间隔（毫秒），防连打 */
  ghostCooldownMs: number;
  /** 0=偏散文短续写，1=几乎只在数学环境补全 */
  latexBias: number;
  /** 本地补全（命令字典 + 本页 token + 词库）：纯本地零 LLM，默认开 */
  localCompletion: boolean;
  /** 打开/编辑笔记时自动建词库（hash 变化才写盘） */
  autoLexicon: boolean;
  /** 编辑停笔多久后自动重建词库（毫秒） */
  lexiconDebounceMs: number;
  /** 幽灵/别名冷路径专用模型；默认 dsv4f，不改聊天模块 model */
  ghostModel: string;
  /** @deprecated 由 ghostMode 取代；读入时迁移 */
  ghostEnabled?: boolean;
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
  ghostMode: "off",
  ghostDebounceMs: 2000,
  ghostCooldownMs: 12000,
  latexBias: 0.85,
  localCompletion: true,
  autoLexicon: true,
  lexiconDebounceMs: 5000,
  ghostModel: "deepseek-v4-flash",
};

export const ALL_INTENTS: Intent[] = ["check", "discuss", "continue", "latex", "edit"];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const INTENT_LABELS: Record<Intent, string> = {
  check: "检错",
  discuss: "讨论",
  continue: "提纲",
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

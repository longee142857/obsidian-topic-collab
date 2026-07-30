"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TopicCollabPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/ai-client.ts
var import_obsidian = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
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
  memoryMode: "single"
};
var ALL_INTENTS = ["check", "discuss", "continue", "latex", "edit"];
var INTENT_LABELS = {
  check: "\u68C0\u9519",
  discuss: "\u8BA8\u8BBA",
  continue: "\u7EED\u5199\u601D\u8DEF",
  latex: "LaTeX",
  edit: "\u4FEE\u6539\u7B14\u8BB0"
};
var VIEW_TYPE_TOPIC_COLLAB = "topic-collab-sidebar";
function migrateIntent(value) {
  if (value === "review" || value === "fix") return "check";
  if (value === "check" || value === "discuss" || value === "continue" || value === "latex" || value === "edit") {
    return value;
  }
  return "";
}

// src/prompts.ts
var BASE_RULES = `\u4F60\u662F\u6570\u5B66\u7B14\u8BB0\u5199\u4F5C\u52A9\u624B\u3002\u7528\u6237\u5728\u81EA\u5DF1\u7684 Obsidian vault \u91CC\u5199\u8BFE\u9898\u7B14\u8BB0\u3002
\u56DE\u590D\u4E00\u5F8B\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002\u5C0A\u91CD\u7528\u6237\u7684\u884C\u6587\u98CE\u683C\uFF0C\u4E0D\u8981\u6574\u7BC7\u91CD\u5199\u3002
\u53EA\u9488\u5BF9\u7528\u6237\u63D0\u4EA4\u7684\u5185\u5BB9\u7ED9\u53CD\u9988\uFF0C\u4E0D\u8981\u7F16\u9020 vault \u91CC\u4E0D\u5B58\u5728\u7684\u6587\u4EF6\u6216\u7AE0\u8282\u3002
LaTeX \u4E00\u5F8B\u7528 $...$\uFF08\u884C\u5185\uFF09\u6216 $$...$$\uFF08\u72EC\u7ACB\u516C\u5F0F\uFF09\uFF0C\u7981\u6B62\u4F7F\u7528 (...) \u6216 [...]\u3002`;
var SYSTEM_PROMPTS = {
  check: `${BASE_RULES}

\u4EFB\u52A1\uFF1A\u68C0\u9519\u4E0E\u4FEE\u6539\u610F\u89C1
- \u68C0\u67E5\u6570\u5B66\u8868\u8FF0\u3001\u7B26\u53F7\u3001\u903B\u8F91\u3001\u5B9A\u4E49\u3001\u8BBA\u8BC1\u662F\u5426\u6709\u8BEF\u6216\u4E0D\u4E25\u8C28
- \u627E\u51FA\u903B\u8F91\u8DF3\u6B65\u3001\u7ED3\u6784\u6DF7\u4E71\u3001\u8BBA\u8BC1\u4E0D\u5B8C\u6574\u4E4B\u5904
- \u6BCF\u6761\u95EE\u9898\u8981\u5177\u4F53\uFF1A\u8BF4\u660E\u9519\u5728\u54EA\u3001\u5EFA\u8BAE\u600E\u4E48\u6539\uFF1B\u53EF\u5F15\u7528\u539F\u6587\u77ED\u53E5
- \u5982\u679C\u6CA1\u6709\u660E\u663E\u9519\u8BEF\uFF0C\u7B80\u8981\u80AF\u5B9A\u5E76\u6307\u51FA 1\u20132 \u4E2A\u53EF\u52A0\u5F3A\u7684\u70B9`,
  discuss: `${BASE_RULES}

\u4EFB\u52A1\uFF1A\u8BA8\u8BBA\u4E0E\u8BB2\u89E3
- \u9488\u5BF9\u7528\u6237\u7B14\u8BB0\u6216\u9009\u4E2D\u7684\u5185\u5BB9\uFF0C\u7EE7\u7EED\u8BA8\u8BBA\u3001\u8BB2\u89E3\u6216\u7B54\u7591
- \u53EF\u4EE5\u8865\u5145\u80CC\u666F\u3001\u76F4\u89C9\u3001\u4E0E\u5176\u4ED6\u6982\u5FF5\u7684\u8054\u7CFB\uFF0C\u5E2E\u52A9\u7528\u6237\u7406\u89E3
- \u8BED\u6C14\u50CF\u4E00\u4F4D\u8010\u5FC3\u7684\u52A9\u6559\uFF0C\u4E0D\u8981\u66FF\u7528\u6237\u6574\u7BC7\u91CD\u5199
- \u82E5\u7528\u6237\u6709\u5177\u4F53\u95EE\u9898\uFF0C\u4F18\u5148\u76F4\u63A5\u56DE\u7B54\uFF1B\u82E5\u65E0\u5177\u4F53\u95EE\u9898\uFF0C\u5C31\u5F53\u524D\u5185\u5BB9\u505A\u9002\u5EA6\u5C55\u5F00`,
  continue: `${BASE_RULES}

\u4EFB\u52A1\uFF1A\u7EED\u5199\u601D\u8DEF
- \u57FA\u4E8E\u7528\u6237\u521A\u5199\u7684\u5185\u5BB9\u548C\u7B14\u8BB0\u4E0A\u4E0B\u6587\uFF0C\u7ED9\u51FA 2\u20133 \u6761\u53EF\u7EE7\u7EED\u5199\u4E0B\u53BB\u7684\u65B9\u5411
- \u6BCF\u6761\u65B9\u5411\u7528\u6807\u9898 + \u7EA6 2 \u53E5\u5C55\u5F00\uFF08\u8BF4\u660E\u53EF\u4EE5\u5199\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u503C\u5F97\u5199\uFF09
- \u4E0D\u8981\u76F4\u63A5\u66FF\u7528\u6237\u5199\u5927\u6BB5\u6B63\u6587\uFF0C\u53EA\u7ED9\u601D\u8DEF`,
  latex: `${BASE_RULES}

\u4EFB\u52A1\uFF1ALaTeX \u516C\u5F0F
- \u5C06\u7528\u6237\u7684\u6570\u5B66\u8868\u8FF0\u8F6C\u4E3A\u53EF\u76F4\u63A5\u7C98\u8D34\u7684 LaTeX
- \u884C\u5185\u7528 $...$\uFF0C\u72EC\u7ACB\u516C\u5F0F\u7528 $$...$$
- \u82E5\u5DF2\u6709 LaTeX\uFF0C\u68C0\u67E5\u8BED\u6CD5\u5E76\u7ED9\u51FA\u4FEE\u6B63\u7248\uFF1B\u82E5\u5DF2\u6B63\u786E\u5219\u8BF4\u660E\u5373\u53EF`,
  edit: `${BASE_RULES}

\u4EFB\u52A1\uFF1A\u4FEE\u6539\u7B14\u8BB0
- \u5148\u89E3\u91CA\u4F60\u8981\u505A\u4EC0\u4E48\u4FEE\u6539\u4EE5\u53CA\u4E3A\u4EC0\u4E48
- \u7136\u540E\u5728\u56DE\u590D\u672B\u5C3E\u7528\u3010\u7F16\u8F91\u5F00\u59CB\u3011...\u3010\u7F16\u8F91\u7ED3\u675F\u3011\u683C\u5F0F\u7ED9\u51FA\u6BCF\u4E2A\u4FEE\u6539\u5757
- \u6587\u4EF6\u5FC5\u987B\u6765\u81EA\u7528\u6237\u5F53\u524D @ \u7684\u7B14\u8BB0\u5217\u8868

\u683C\u5F0F\u793A\u4F8B\uFF1A

\u3010\u7F16\u8F91\u5F00\u59CB\u3011
\u6587\u4EF6\uFF1A\u8BFE\u9898\u96C6\u5408/\u4FE1\u53F7\u5206\u6790\u4E2D\u7684\u6570\u5B66\u539F\u7406.md
\u539F\u6587\uFF1A
\u9700\u8981\u66FF\u6362\u7684\u7CBE\u786E\u539F\u6587\u6587\u672C
---
\u6539\u4E3A\uFF1A
\u66FF\u6362\u540E\u7684\u65B0\u6587\u672C
\u3010\u7F16\u8F91\u7ED3\u675F\u3011

- \u53EF\u4EE5\u6709\u591A\u5757\uFF0C\u6BCF\u5757\u5BF9\u5E94\u4E00\u5904\u4FEE\u6539
- \u539F\u6587\u5FC5\u987B\u662F\u7B14\u8BB0\u4E2D\u5DF2\u6709\u7684\u7CBE\u786E\u6587\u672C\uFF0C\u4E0D\u8981\u5FFD\u7565\u7A7A\u767D\u6216\u6362\u884C\u5DEE\u5F02
- \u6C38\u8FDC\u4E0D\u8981\u4FEE\u6539\u975E @ \u6587\u4EF6
- \u5982\u679C\u7528\u6237\u6CA1\u8981\u6C42\u4FEE\u6539\u5177\u4F53\u4F4D\u7F6E\uFF0C\u5148\u8BE2\u95EE`
};
var SOURCE_LABELS = {
  selection: "\u7F16\u8F91\u5668\u9009\u533A",
  prompt: "\u4FA7\u8FB9\u680F\u8BF7\u6C42",
  delta: "\u534F\u4F5C\u589E\u91CF\uFF08\u65B0\u5199\u5185\u5BB9\uFF09",
  note: "\u7B14\u8BB0\u5168\u6587"
};
function buildUserMessage(intent, filePath, primary, contextSnippet, extraPrompt, source) {
  const parts = [
    `\u7B14\u8BB0\u8DEF\u5F84\uFF1A${filePath}`,
    `\u8BF7\u6C42\u7C7B\u578B\uFF1A${INTENT_LABELS[intent]}`,
    `\u63D0\u4EA4\u6765\u6E90\uFF1A${SOURCE_LABELS[source]}`
  ];
  if (source === "note") {
    parts.push(`\u7B14\u8BB0\u5185\u5BB9\uFF1A
${primary}`);
    if (extraPrompt) {
      parts.push(`\u7528\u6237\u8865\u5145\u8BF4\u660E\uFF1A
${extraPrompt}`);
    }
    return parts.join("\n\n");
  }
  if (source === "prompt") {
    parts.push(`\u7528\u6237\u8BF7\u6C42\uFF1A
${primary}`);
    if (contextSnippet.trim()) {
      parts.push(`\u7B14\u8BB0\u5185\u5BB9\uFF1A
${contextSnippet.trim()}`);
    }
    return parts.join("\n\n");
  }
  if (extraPrompt) {
    parts.push(`\u7528\u6237\u8865\u5145\u8BF4\u660E\uFF1A
${extraPrompt}`);
  }
  if (contextSnippet.trim()) {
    const ctxLabel = source === "selection" ? "\u7B14\u8BB0\u5168\u6587\uFF08\u4F9B\u53C2\u8003\uFF09" : "\u7B14\u8BB0\u4E0A\u4E0B\u6587\uFF08\u534F\u4F5C\u5F00\u59CB\u524D\u5DF2\u6709\u5185\u5BB9\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF09";
    parts.push(`${ctxLabel}\uFF1A
${contextSnippet.trim()}`);
  }
  const label = source === "selection" ? "\u9009\u4E2D\u5185\u5BB9\uFF08\u8BF7\u4E3B\u8981\u56DE\u5E94\u8FD9\u90E8\u5206\uFF09" : "\u672C\u6B21\u65B0\u5199\u5185\u5BB9\uFF08\u8BF7\u4E3B\u8981\u56DE\u5E94\u8FD9\u90E8\u5206\uFF09";
  parts.push(`${label}\uFF1A
${primary}`);
  return parts.join("\n\n");
}

// src/ai-client.ts
var AiClient = class {
  constructor(settings) {
    this.settings = settings;
  }
  async complete(intent, userMessage, history) {
    if (!this.settings.apiKey.trim()) {
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Key");
    }
    let response;
    if (this.settings.apiProvider === "anthropic") {
      response = await this.completeAnthropic(intent, userMessage, history);
    } else {
      response = await this.completeDeepSeek(intent, userMessage, history);
    }
    return this.normalizeLatex(response);
  }
  /** 将 \(...\) / \[...\] 替换为 Obsidian 兼容的 $...$ / $$...$$ */
  normalizeLatex(text) {
    const parts = [];
    const codeBlockRe = /```[\s\S]*?```/g;
    let last = 0;
    let match;
    while ((match = codeBlockRe.exec(text)) !== null) {
      parts.push(text.slice(last, match.index));
      parts.push(match[0]);
      last = match.index + match[0].length;
    }
    parts.push(text.slice(last));
    for (let j = 0; j < parts.length; j++) {
      if (parts[j].startsWith("```")) continue;
      parts[j] = parts[j].replace(/\\\[/g, "$$").replace(/\\\]/g, "$$").replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    }
    return parts.join("");
  }
  /** 设置页「测试连接」用 */
  async ping() {
    return this.completeDeepSeek(
      "check",
      "\u56DE\u590D OK \u4E24\u4E2A\u5B57\u6BCD\u5373\u53EF",
      []
    );
  }
  historyLimit() {
    const turns = Math.max(0, this.settings.historyTurns);
    return turns * 2;
  }
  async completeDeepSeek(intent, userMessage, history) {
    const base = this.settings.apiBaseUrl.replace(/\/$/, "");
    const urls = [
      `${base}/chat/completions`,
      `${base}/v1/chat/completions`
    ];
    const messages = [
      { role: "system", content: SYSTEM_PROMPTS[intent] },
      ...history.slice(-this.historyLimit()).map((m) => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: userMessage }
    ];
    const body = {
      model: this.settings.model,
      messages,
      stream: false,
      max_tokens: 8192
    };
    if (this.settings.enableThinking) {
      body.thinking = { type: "enabled" };
      body.reasoning_effort = this.settings.reasoningEffort;
    } else {
      body.thinking = { type: "disabled" };
    }
    const payload = JSON.stringify(body);
    let lastError = "";
    for (const url of urls) {
      try {
        console.log("[topic-collab] POST", url);
        const response = await (0, import_obsidian.requestUrl)({
          url,
          method: "POST",
          contentType: "application/json",
          headers: {
            Authorization: `Bearer ${this.settings.apiKey}`
          },
          body: payload,
          throw: false
        });
        if (response.status === 404 && url !== urls[urls.length - 1]) {
          lastError = `404 ${url}`;
          continue;
        }
        return this.parseChatResponse(response.status, response.text, response.json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        lastError = msg;
        console.error("[topic-collab] request failed:", url, msg);
      }
    }
    throw new Error(
      `\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF08Obsidian \u65E0\u6CD5\u8FDE\u63A5 DeepSeek\uFF09\u3002${lastError}
\u8BF7\u786E\u8BA4\uFF1A1) \u7CFB\u7EDF/ Obsidian \u4EE3\u7406\u5DF2\u5F00  2) API Key \u6B63\u786E  3) Base URL \u4E3A https://api.deepseek.com`
    );
  }
  async completeAnthropic(intent, userMessage, history) {
    var _a;
    const messages = [
      ...history.slice(-this.historyLimit()),
      { role: "user", content: userMessage }
    ];
    const body = {
      model: this.settings.model,
      max_tokens: 8192,
      stream: false,
      system: SYSTEM_PROMPTS[intent],
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    };
    if (this.settings.enableThinking) {
      body.thinking = { type: "adaptive" };
      body.output_config = { effort: this.settings.reasoningEffort };
    }
    let response;
    try {
      response = await (0, import_obsidian.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        contentType: "application/json",
        headers: {
          "x-api-key": this.settings.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body),
        throw: false
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Anthropic \u7F51\u7EDC\u9519\u8BEF: ${msg}`);
    }
    if (response.status !== 200) {
      throw new Error(
        `Anthropic API ${response.status}: ${response.text.slice(0, 400)}`
      );
    }
    const json = response.json;
    const text = ((_a = json.content) != null ? _a : []).filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n").trim();
    if (!text) {
      throw new Error(`Anthropic \u8FD4\u56DE\u65E0\u6B63\u6587: ${response.text.slice(0, 300)}`);
    }
    return text;
  }
  parseChatResponse(status, rawText, json) {
    var _a, _b, _c, _d, _e;
    if (status !== 200) {
      throw new Error(`API ${status}: ${rawText.slice(0, 400)}`);
    }
    const data = json;
    if ((_a = data.error) == null ? void 0 : _a.message) {
      throw new Error(data.error.message);
    }
    const message = (_c = (_b = data.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message;
    const content = (_e = (_d = message == null ? void 0 : message.content) == null ? void 0 : _d.trim()) != null ? _e : "";
    if (content) {
      return content;
    }
    throw new Error(
      `API 200 \u4F46\u65E0\u6B63\u6587\u3002\u539F\u59CB\u54CD\u5E94: ${rawText.slice(0, 350)}`
    );
  }
};

// src/collab-mode.ts
var import_obsidian2 = require("obsidian");
var CollabController = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.collabActive = false;
    this.debounceTimer = null;
    this.sessions = /* @__PURE__ */ new Map();
    /** @ 绑定的笔记路径列表（打开笔记时自动加入） */
    this.boundNotePaths = [];
    /** 当前活跃的笔记路径（正在编辑的文件） */
    this.activeNotePath = "";
    this.userPrompt = "";
    this.pendingText = "";
    this.pendingWords = 0;
    this.hasComplexEdit = false;
    this.cachedSelection = "";
    this.cachedSelectionPath = "";
  }
  toggle() {
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
  setActive(active) {
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
  addBoundNote(path) {
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
  removeBoundNote(path) {
    var _a;
    this.boundNotePaths = this.boundNotePaths.filter((p) => p !== path);
    if (this.activeNotePath === path) {
      this.activeNotePath = (_a = this.boundNotePaths[0]) != null ? _a : "";
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
  tryBindFromWorkspace() {
    var _a;
    const count = this.boundNotePaths.length;
    const md = this.plugin.getAnyMarkdownView();
    if (md == null ? void 0 : md.file) {
      this.addBoundNote(md.file.path);
      return;
    }
    if (count > 0) return;
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if ((_a = view.file) == null ? void 0 : _a.path.endsWith(".md")) {
        this.addBoundNote(view.file.path);
        return;
      }
    }
  }
  onEditorChange(view) {
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
  onActiveLeafChange() {
    if (!this.collabActive) return;
    const md = this.plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if (md == null ? void 0 : md.file) {
      this.cacheSelection(md);
      this.addBoundNote(md.file.path);
    }
    this.plugin.refreshSidebar();
  }
  onFileOpen(file) {
    if (!this.collabActive || file.extension !== "md") return;
    this.addBoundNote(file.path);
  }
  cacheSelection(view) {
    const sel = view.editor.getSelection().trim();
    if (sel && view.file) {
      this.cachedSelection = sel;
      this.cachedSelectionPath = view.file.path;
    }
  }
  /** 优先读编辑器缓冲（含未保存修改），否则读磁盘 */
  async readNoteContent(path) {
    var _a;
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (((_a = view.file) == null ? void 0 : _a.path) === path) {
        return view.editor.getValue();
      }
    }
    return this.readVaultFile(path);
  }
  truncateContext(content) {
    const max = this.plugin.settings.contextMaxChars;
    if (max <= 0 || content.length <= max) return content;
    return "\u2026\n" + content.slice(-max);
  }
  async initSessionFromVault(path) {
    const content = await this.readNoteContent(path);
    this.sessions.set(path, {
      filePath: path,
      baseline: content,
      pendingText: ""
    });
    this.syncPendingState(path);
  }
  async updatePendingFromEditor(view) {
    const file = view.file;
    if (!file) return;
    const path = file.path;
    if (!this.sessions.has(path)) {
      await this.initSessionFromVault(path);
    }
    const session = this.sessions.get(path);
    const current = view.editor.getValue();
    const { delta, complex } = extractDelta(session.baseline, current);
    session.pendingText = delta;
    this.hasComplexEdit = complex && delta.length > 0;
    this.syncPendingState(path);
  }
  async syncPendingFromVault(path) {
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
  syncPendingState(path) {
    var _a;
    const session = this.sessions.get(path);
    this.activeNotePath = path;
    this.pendingText = (_a = session == null ? void 0 : session.pendingText) != null ? _a : "";
    this.pendingWords = countChars(this.pendingText);
    this.plugin.refreshSidebar();
  }
  async commitPending(path) {
    const current = await this.readNoteContent(path);
    this.sessions.set(path, {
      filePath: path,
      baseline: current,
      pendingText: ""
    });
    this.syncPendingState(path);
  }
  clearPending() {
    if (!this.activeNotePath) return;
    void this.initSessionFromVault(this.activeNotePath);
  }
  getSelectionText() {
    var _a;
    if (!this.plugin.settings.useSelection) return "";
    if (this.cachedSelection && this.cachedSelectionPath === this.activeNotePath) {
      return this.cachedSelection;
    }
    const view = this.plugin.getAnyMarkdownView();
    if (((_a = view == null ? void 0 : view.file) == null ? void 0 : _a.path) === this.activeNotePath) {
      const live = view.editor.getSelection().trim();
      if (live) return live;
    }
    return this.cachedSelection;
  }
  async buildPayload(app, userPrompt, intent) {
    var _a;
    const filePath = this.activeNotePath;
    if (!filePath) return null;
    const prompt = userPrompt.trim();
    const useSelection = this.plugin.settings.useSelection;
    const selection = useSelection && this.cachedSelectionPath === filePath ? this.cachedSelection.trim() : "";
    await this.syncPendingFromVault(filePath);
    const pending = this.pendingText.trim();
    const fileContent = await this.readNoteContent(filePath);
    let context = this.truncateContext(fileContent);
    const otherContexts = [];
    for (const p of this.boundNotePaths) {
      if (p === filePath) continue;
      const content = await this.readNoteContent(p);
      if (content.trim()) {
        const name = p.split("/").pop() || p;
        otherContexts.push(`\u3010${name}\u3011
${this.truncateContext(content)}`);
      }
    }
    if (otherContexts.length > 0) {
      context = `${context}

---
### \u5176\u4ED6\u5DF2\u7ED1\u5B9A\u7B14\u8BB0

${otherContexts.join("\n\n---\n\n")}`;
    }
    if (selection) {
      return {
        filePath,
        primary: selection,
        context,
        prompt,
        source: "selection"
      };
    }
    if (prompt) {
      return {
        filePath,
        primary: prompt,
        context,
        prompt: "",
        source: "prompt"
      };
    }
    if (pending) {
      const session = this.sessions.get(filePath);
      const base = (_a = session == null ? void 0 : session.baseline.trim()) != null ? _a : "";
      const ctx = this.truncateContext(base);
      return {
        filePath,
        primary: pending,
        context: ctx,
        prompt: "",
        source: "delta"
      };
    }
    if (intent === "check" || intent === "discuss") {
      return {
        filePath,
        primary: context,
        context: "",
        prompt: "",
        source: "note"
      };
    }
    return null;
  }
  async readVaultFile(path) {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian2.TFile)) return "";
    return this.plugin.app.vault.read(file);
  }
  clearAllSessions() {
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
};
function countChars(text) {
  return text.replace(/\s+/g, "").length;
}
function extractDelta(baseline, current) {
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
  while (suffixLen < minLen - prefixLen && baseline[baseline.length - 1 - suffixLen] === current[current.length - 1 - suffixLen]) {
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

// src/intent-modal.ts
var import_obsidian3 = require("obsidian");
var IntentModal = class extends import_obsidian3.Modal {
  constructor(app, initialState) {
    super(app);
    this.initialState = initialState;
    this.chosen = null;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("topic-collab-intent-modal");
    contentEl.createEl("h2", { text: "\u8BFE\u9898\u534F\u4F5C" });
    const hasSel = this.initialState.selection.length > 0;
    const hasPrompt = this.initialState.prompt.length > 0;
    if (hasSel || hasPrompt) {
      const prev = contentEl.createDiv({ cls: "topic-collab-modal-buffer" });
      if (hasSel) {
        const row = prev.createDiv({ cls: "topic-collab-modal-buffer-row" });
        row.createSpan({ cls: "topic-collab-modal-buffer-tag", text: "\u9009\u533A" });
        const sel = this.initialState.selection;
        const preview = sel.length > 60 ? sel.slice(0, 57) + "\u2026" : sel;
        row.createSpan({ cls: "topic-collab-modal-buffer-text", text: preview });
      }
      if (hasPrompt) {
        const row = prev.createDiv({ cls: "topic-collab-modal-buffer-row" });
        row.createSpan({ cls: "topic-collab-modal-buffer-tag", text: "\u8F93\u5165" });
        row.createSpan({ cls: "topic-collab-modal-buffer-text", text: this.initialState.prompt });
      }
    }
    this.textarea = contentEl.createEl("textarea", {
      cls: "topic-collab-modal-textarea",
      attr: { placeholder: "\u5728\u8FD9\u91CC\u8F93\u5165\u2026\uFF08\u53EF\u9009\uFF0C\u5DF2\u6709\u5185\u5BB9\u4F1A\u9884\u586B\uFF09", rows: "4" }
    });
    if (this.initialState.prompt) {
      this.textarea.value = this.initialState.prompt;
    }
    this.textarea.focus();
    const list = contentEl.createDiv({ cls: "topic-collab-intent-list" });
    ALL_INTENTS.forEach((intent) => {
      const btn = list.createEl("button", {
        cls: "mod-cta topic-collab-intent-btn",
        text: INTENT_LABELS[intent]
      });
      btn.addEventListener("click", () => {
        this.chosen = intent;
        this.close();
      });
    });
    contentEl.createEl("p", {
      cls: "topic-collab-intent-hint",
      text: "\u8F93\u5165\u540E\u70B9\u6309\u94AE\u9009\u62E9\u8F93\u51FA\u65B9\u5F0F \xB7 Esc \u53D6\u6D88"
    });
  }
  getText() {
    var _a, _b;
    return (_b = (_a = this.textarea) == null ? void 0 : _a.value) != null ? _b : "";
  }
  async waitForChoice() {
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
};

// src/memory-store.ts
var import_obsidian4 = require("obsidian");
var MEMORY_DIR = "collab-memory";
var MemoryStore = class {
  constructor(vault) {
    this.vault = vault;
  }
  sanitize(notePath) {
    return notePath.replace(/[/\\:?*"<>|]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  sessionFilePath(notePath, startedAt) {
    const stamp = startedAt.slice(0, 16).replace("T", "-").replace(/:/g, "");
    return `${MEMORY_DIR}/${this.sanitize(notePath)}__${stamp}.md`;
  }
  async ensureDir() {
    if (!await this.vault.adapter.exists(MEMORY_DIR)) {
      await this.vault.createFolder(MEMORY_DIR);
    }
  }
  /** 连续模式结束时：整段对话写入一个 md */
  async writeSession(notePath, startedAt, rounds) {
    if (rounds.length === 0) return "";
    await this.ensureDir();
    const path = this.sessionFilePath(notePath, startedAt);
    const ended = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
    const header = [
      `> \u534F\u4F5C\u8BB0\u5FC6 \xB7 \u4F1A\u8BDD\u7ED3\u675F\u4E8E ${ended}`,
      `> \u5171 ${rounds.length} \u8F6E\u5BF9\u8BDD`,
      `> \u7B14\u8BB0\uFF1A${notePath}`
    ].join("\n");
    const body = rounds.map((r) => this.formatRound(r)).join("\n---\n\n");
    const content = header + "\n\n---\n\n" + body;
    const existing = this.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian4.TFile) {
      await this.vault.modify(existing, content);
    } else {
      await this.vault.create(path, content);
    }
    return path;
  }
  /** 删除某笔记相关的全部记忆 md */
  async removeNoteSessions(notePath) {
    const dir = this.vault.getAbstractFileByPath(MEMORY_DIR);
    if (!(dir instanceof import_obsidian4.TFolder)) return;
    const prefix = this.sanitize(notePath) + "__";
    for (const ch of dir.children) {
      if (ch instanceof import_obsidian4.TFile && ch.basename.startsWith(prefix)) {
        await this.vault.delete(ch);
      }
    }
  }
  /** 清空 collab-memory 目录 */
  async clearAll() {
    const dir = this.vault.getAbstractFileByPath(MEMORY_DIR);
    if (!(dir instanceof import_obsidian4.TFolder)) return;
    for (const ch of dir.children) {
      if (ch instanceof import_obsidian4.TFile && ch.extension === "md") {
        await this.vault.delete(ch);
      }
    }
  }
  formatRound(r) {
    const ts = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
    return [
      `**\u6211** \xB7 ${ts}`,
      "",
      r.userContent,
      "",
      `**AI** \xB7 ${ts}`,
      "",
      r.assistantContent
    ].join("\n");
  }
};

// src/memory-session.ts
var MemorySessionManager = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  getSession(notePath) {
    return this.sessions.get(notePath);
  }
  isActive(notePath) {
    var _a, _b;
    return (_b = (_a = this.sessions.get(notePath)) == null ? void 0 : _a.active) != null ? _b : false;
  }
  getRounds(notePath) {
    var _a, _b;
    return (_b = (_a = this.sessions.get(notePath)) == null ? void 0 : _a.rounds) != null ? _b : [];
  }
  /** 连续模式：开始一段新记忆（清空当前轮次） */
  start(notePath) {
    this.sessions.set(notePath, {
      active: true,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      rounds: []
    });
  }
  /** 连续模式：结束记忆，返回会话供落盘 */
  end(notePath) {
    const session = this.sessions.get(notePath);
    if (!(session == null ? void 0 : session.active)) return null;
    session.active = false;
    return session;
  }
  addRound(notePath, userDisplay, userApi, assistant) {
    let session = this.sessions.get(notePath);
    if (!session) {
      session = {
        active: false,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        rounds: []
      };
      this.sessions.set(notePath, session);
    }
    session.rounds.push({ userDisplay, userApi, assistant });
  }
  /** 单次模式：只保留最近一轮用于展示 */
  setSingleRound(notePath, userDisplay, userApi, assistant) {
    this.sessions.set(notePath, {
      active: false,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      rounds: [{ userDisplay, userApi, assistant }]
    });
  }
  getApiHistory(notePath, maxTurns) {
    var _a, _b;
    const rounds = (_b = (_a = this.sessions.get(notePath)) == null ? void 0 : _a.rounds) != null ? _b : [];
    const slice = maxTurns > 0 ? rounds.slice(-maxTurns) : maxTurns === 0 ? [] : rounds;
    const msgs = [];
    for (const r of slice) {
      msgs.push({ role: "user", content: r.userApi });
      msgs.push({ role: "assistant", content: r.assistant });
    }
    return msgs;
  }
  clear(notePath) {
    this.sessions.delete(notePath);
  }
  clearAll() {
    this.sessions.clear();
  }
  serialize() {
    const out = {};
    for (const [path, session] of this.sessions) {
      if (session.active || session.rounds.length > 0) {
        out[path] = session;
      }
    }
    return out;
  }
  loadFrom(data) {
    this.sessions.clear();
    if (!data) return;
    for (const [path, session] of Object.entries(data)) {
      if (!session || typeof session !== "object") continue;
      this.sessions.set(path, {
        active: !!session.active,
        startedAt: session.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
        rounds: Array.isArray(session.rounds) ? session.rounds : []
      });
    }
  }
};

// src/edit-suggest.ts
function parseEditSuggestions(response) {
  const edits = [];
  if (!response.includes("\u3010\u7F16\u8F91\u5F00\u59CB\u3011")) {
    console.log("[topic-collab] no edit markers in response");
    return edits;
  }
  const blockRe = /【编辑开始】([\s\S]*?)【编辑结束】/g;
  let match;
  while ((match = blockRe.exec(response)) !== null) {
    const block = match[1].trim();
    console.log("[topic-collab] edit block raw:", block.slice(0, 200));
    const fileMatch = block.match(/文件[：:]\s*(.+?)(?:\n|$)/);
    if (!fileMatch) {
      console.log("[topic-collab] edit block missing file line");
      continue;
    }
    const filePath = fileMatch[1].trim();
    const rest = block.slice(fileMatch[0].length).trim();
    const sepRe = /\n-{3,}\n?/;
    const sepIdx = rest.search(sepRe);
    if (sepIdx === -1) {
      console.log("[topic-collab] edit block missing --- separator");
      continue;
    }
    const sepMatch = rest.slice(sepIdx).match(sepRe);
    const sepLen = sepMatch ? sepMatch[0].length : 5;
    let original = rest.slice(0, sepIdx);
    original = original.replace(/^原文[：:]\s*\n?/, "").trim();
    let replacement = rest.slice(sepIdx + sepLen);
    replacement = replacement.replace(/^改为[：:]\s*\n?/, "").trim();
    if (!replacement) {
      console.log("[topic-collab] edit block empty replacement");
      continue;
    }
    edits.push({ filePath, original, replacement });
    console.log(`[topic-collab] parsed edit: ${filePath} (${original.slice(0, 30)}\u2026)`);
  }
  return edits;
}
function stripEditBlocks(response) {
  return response.replace(/【编辑开始】[\s\S]*?【编辑结束】/g, "").trim();
}

// src/edit-modal.ts
var import_obsidian5 = require("obsidian");
var EditConfirmModal = class extends import_obsidian5.Modal {
  constructor(app, edits, onConfirm) {
    super(app);
    this.edits = edits;
    this.onConfirm = onConfirm;
    this.confirmed = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("topic-collab-edit-modal");
    contentEl.createEl("h2", { text: "\u786E\u8BA4\u4FEE\u6539\u7B14\u8BB0" });
    for (let i = 0; i < this.edits.length; i++) {
      const edit = this.edits[i];
      const section = contentEl.createDiv({
        cls: "topic-collab-edit-section"
      });
      const header = section.createDiv({ cls: "topic-collab-edit-header" });
      header.createSpan({
        cls: "topic-collab-edit-num",
        text: `#${i + 1}`
      });
      header.createSpan({
        cls: "topic-collab-edit-file",
        text: edit.filePath.split("/").pop() || edit.filePath
      });
      const origBox = section.createDiv({
        cls: "topic-collab-edit-box is-original"
      });
      origBox.createEl("div", { cls: "topic-collab-edit-box-label", text: "\u539F\u6587" });
      origBox.createEl("pre", { text: edit.original });
      const arrow = section.createDiv({ cls: "topic-collab-edit-arrow" });
      arrow.setText("\u2193");
      const newBox = section.createDiv({ cls: "topic-collab-edit-box is-new" });
      newBox.createEl("div", { cls: "topic-collab-edit-box-label", text: "\u6539\u4E3A" });
      newBox.createEl("pre", { text: edit.replacement });
    }
    const btnRow = contentEl.createDiv({ cls: "topic-collab-edit-buttons" });
    btnRow.createEl("button", {
      cls: "mod-cta",
      text: `\u5E94\u7528 (${this.edits.length} \u5904)`
    }).addEventListener("click", () => {
      this.confirmed = true;
      this.close();
    });
    btnRow.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => {
      this.close();
    });
  }
  onClose() {
    this.onConfirm(this.confirmed ? this.edits : []);
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/sidebar-view.ts
var import_obsidian6 = require("obsidian");
var TopicCollabSidebarView = class extends import_obsidian6.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.lastResponse = "";
  }
  getViewType() {
    return VIEW_TYPE_TOPIC_COLLAB;
  }
  getDisplayText() {
    return "\u8BFE\u9898\u534F\u4F5C";
  }
  getIcon() {
    return "bot";
  }
  async onOpen() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("topic-collab-sidebar");
    const controls = containerEl.createDiv({ cls: "topic-collab-controls" });
    const toolbar = controls.createDiv({ cls: "topic-collab-toolbar" });
    toolbar.createSpan({ cls: "topic-collab-at", text: "@" });
    this.boundNoteEl = toolbar.createDiv({ cls: "topic-collab-bound-path" });
    this.stopBtn = toolbar.createEl("button", {
      cls: "topic-collab-stop-btn",
      text: "\u505C\u6B62"
    });
    this.stopBtn.addEventListener("click", () => {
      this.plugin.cancelStream();
    });
    this.memoryBarEl = controls.createDiv({ cls: "topic-collab-memory-bar" });
    this.memoryBarEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
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
      cls: "topic-collab-buffer is-empty"
    });
    const promptRow = controls.createDiv({ cls: "topic-collab-prompt-row" });
    this.promptArea = promptRow.createEl("textarea", {
      cls: "topic-collab-prompt",
      attr: {
        placeholder: "\u53EF\u9009\uFF1A\u5199\u5177\u4F53\u95EE\u9898\u2026",
        rows: "2"
      }
    });
    this.clearBtn = promptRow.createEl("button", {
      cls: "topic-collab-clear-btn",
      text: "\u6E05"
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
        cls: "topic-collab-action-btn"
      });
      btn.addEventListener("click", () => {
        void this.plugin.runIntent(intent);
      });
    });
    const responseWrap = containerEl.createDiv({
      cls: "topic-collab-response-wrap"
    });
    this.actionBarEl = responseWrap.createDiv({
      cls: "topic-collab-response-actions is-hidden"
    });
    this.actionBarEl.createEl("button", { text: "\u63D2\u5165\u5149\u6807" }).addEventListener("click", () => void this.plugin.insertResponse(false));
    this.actionBarEl.createEl("button", { text: "\u8FFD\u52A0\u6587\u672B" }).addEventListener("click", () => void this.plugin.insertResponse(true));
    this.responseEl = responseWrap.createDiv({ cls: "topic-collab-response" });
    await this.renderConversation();
    this.render();
  }
  render() {
    var _a, _b;
    if (!this.boundNoteEl) return;
    const c = this.plugin.collab;
    this.boundNoteEl.empty();
    if (c.boundNotePaths.length === 0) {
      this.boundNoteEl.createSpan({
        cls: "topic-collab-bound-placeholder",
        text: "\uFF08\u65E0\u7ED1\u5B9A\u7B14\u8BB0\uFF0C\u6253\u5F00\u7B14\u8BB0\u81EA\u52A8 @\uFF09"
      });
    } else {
      for (const path of c.boundNotePaths) {
        const row = this.boundNoteEl.createDiv({
          cls: "topic-collab-bound-row"
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
        const rmBtn = row.createEl("span", { text: " \xD7" });
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
        row.createSpan({ cls: "topic-collab-buffer-icon", text: "\u25B8" });
        const preview = selection.length > 34 ? selection.slice(0, 31) + "\u2026" : selection;
        row.createSpan({
          cls: "topic-collab-buffer-text",
          text: `"${preview}"`
        });
        row.createSpan({
          cls: "topic-collab-buffer-count",
          text: `${selection.length} \u5B57`
        });
        row.createSpan({ cls: "topic-collab-buffer-tag", text: "\u9009\u533A" });
      }
      if (hasPrompt) {
        const row = this.bufferEl.createDiv({ cls: "topic-collab-buffer-row" });
        row.createSpan({ cls: "topic-collab-buffer-icon", text: "\u270E" });
        const preview = c.userPrompt.length > 34 ? c.userPrompt.slice(0, 31) + "\u2026" : c.userPrompt;
        row.createSpan({
          cls: "topic-collab-buffer-text",
          text: `"${preview}"`
        });
        row.createSpan({
          cls: "topic-collab-buffer-count",
          text: `${c.userPrompt.length} \u5B57`
        });
        row.createSpan({ cls: "topic-collab-buffer-tag", text: "\u8F93\u5165" });
      }
    }
    const useSelection = this.plugin.settings.useSelection;
    const hasBound = c.boundNotePaths.length > 0;
    const hasRequest = hasPrompt || useSelection && selection.length > 0 || c.pendingText.trim().length > 0 || hasBound;
    const continuous = this.plugin.settings.memoryMode === "continuous";
    const recording = this.plugin.isMemoryRecording();
    const needStart = continuous && !recording;
    const canSubmit = c.collabActive && hasBound && hasRequest && !this.plugin.isStreaming && !needStart;
    (_a = this.actionsEl) == null ? void 0 : _a.toggleClass("is-muted", !canSubmit);
    (_b = this.actionBarEl) == null ? void 0 : _b.toggleClass(
      "is-hidden",
      !this.lastResponse.trim() || this.plugin.isStreaming
    );
  }
  renderMemoryBar() {
    if (!this.memoryBarEl) return;
    this.memoryBarEl.empty();
    const mode = this.plugin.settings.memoryMode;
    const recording = this.plugin.isMemoryRecording();
    const rounds = this.plugin.getConversationRounds().length;
    const modeRow = this.memoryBarEl.createDiv({
      cls: "topic-collab-memory-mode"
    });
    const toggleBtn = modeRow.createEl("button", {
      cls: "topic-collab-mode-btn",
      attr: { "data-action": "mode-toggle" }
    });
    toggleBtn.setText(mode === "continuous" ? "\u8FDE\u7EED" : "\u5355\u6B21");
    toggleBtn.toggleClass("is-continuous", mode === "continuous");
    if (mode === "continuous") {
      const ctrl = this.memoryBarEl.createDiv({
        cls: "topic-collab-memory-ctrl"
      });
      if (recording) {
        ctrl.createSpan({
          cls: "topic-collab-recording-dot",
          text: "\u25CF"
        });
        ctrl.createSpan({
          cls: "topic-collab-recording-label",
          text: `\u8BB0\u5F55\u4E2D \xB7 ${rounds} \u8F6E`
        });
        ctrl.createEl("button", {
          text: "\u7ED3\u675F\u8BB0\u5FC6",
          attr: { "data-action": "memory-end" }
        });
      } else {
        ctrl.createEl("button", {
          text: "\u5F00\u59CB\u8BB0\u5FC6",
          attr: { "data-action": "memory-start" }
        });
      }
    }
  }
  async renderConversation(streamingText) {
    if (!this.responseEl) return;
    const rounds = this.plugin.getConversationRounds();
    this.responseEl.empty();
    if (rounds.length === 0 && !streamingText) {
      this.responseEl.createDiv({
        cls: "topic-collab-response-placeholder",
        text: this.plugin.settings.memoryMode === "continuous" ? "\u8FDE\u7EED\u6A21\u5F0F\uFF1A\u70B9\u300C\u5F00\u59CB\u8BB0\u5FC6\u300D\u540E\u5BF9\u8BDD\u4F1A\u7D2F\u79EF\u663E\u793A" : "\u56DE\u590D\u5C06\u663E\u793A\u5728\u8FD9\u91CC"
      });
      return;
    }
    const thread = this.responseEl.createDiv({ cls: "topic-collab-thread" });
    for (const round of rounds) {
      await this.appendRound(thread, round);
    }
    if (streamingText !== void 0) {
      const pending = thread.createDiv({
        cls: "topic-collab-turn topic-collab-turn-ai is-pending"
      });
      pending.setText(streamingText);
    }
    this.responseEl.scrollTop = this.responseEl.scrollHeight;
  }
  async appendRound(container, round) {
    const userEl = container.createDiv({
      cls: "topic-collab-turn topic-collab-turn-user"
    });
    userEl.createDiv({ cls: "topic-collab-turn-label", text: "\u6211" });
    const userBody = userEl.createDiv({ cls: "topic-collab-turn-body" });
    userBody.setText(round.userDisplay);
    const aiEl = container.createDiv({
      cls: "topic-collab-turn topic-collab-turn-ai"
    });
    aiEl.createDiv({ cls: "topic-collab-turn-label", text: "AI" });
    const aiBody = aiEl.createDiv({ cls: "topic-collab-turn-body" });
    await import_obsidian6.MarkdownRenderer.render(
      this.plugin.app,
      round.assistant,
      aiBody,
      this.plugin.collab.activeNotePath || this.plugin.collab.boundNotePaths[0] || "",
      this
    );
  }
  beginStreaming() {
    var _a;
    void this.renderConversation("\u7B49\u5F85\u56DE\u590D\u2026\uFF08Thinking \u6A21\u5F0F\u53EF\u80FD 30\u201390 \u79D2\uFF09");
    (_a = this.containerEl) == null ? void 0 : _a.toggleClass("is-streaming", true);
    this.render();
  }
  endStreaming() {
    void this.renderConversation();
  }
  async showError(msg) {
    this.lastResponse = "";
    this.responseEl.empty();
    this.responseEl.createDiv({
      cls: "topic-collab-turn topic-collab-turn-ai is-error",
      text: `\u8BF7\u6C42\u5931\u8D25\uFF1A${msg}`
    });
    this.render();
  }
  setStreaming(active) {
    var _a;
    (_a = this.containerEl) == null ? void 0 : _a.toggleClass("is-streaming", active);
  }
  getPrompt() {
    var _a, _b;
    return (_b = (_a = this.promptArea) == null ? void 0 : _a.value) != null ? _b : "";
  }
  clearPrompt() {
    if (this.promptArea) {
      this.promptArea.value = "";
    }
    this.plugin.collab.userPrompt = "";
    this.render();
  }
  clearBuffer() {
    this.plugin.collab.userPrompt = "";
    this.plugin.collab.cachedSelection = "";
    if (this.promptArea) {
      this.promptArea.value = "";
    }
    this.render();
  }
};
function createRibbonIcon(el) {
  (0, import_obsidian6.setIcon)(el, "bot");
}

// src/version.ts
var PLUGIN_VERSION = "0.6.0";

// src/main.ts
var TopicCollabPlugin = class extends import_obsidian7.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.collab = new CollabController(this);
    this.memory = new MemoryStore(this.app.vault);
    this.memorySessions = new MemorySessionManager();
    this.isStreaming = false;
    /** 侧边栏顶部状态行 */
    this.statusText = `v${PLUGIN_VERSION} \xB7 \u5C31\u7EEA`;
    this.ribbonEl = null;
    this.activeRequestId = 0;
    this.cancelRequested = false;
    /** 最近一次激活的 Markdown 笔记路径（点侧边栏后 active 会丢） */
    this.lastMarkdownPath = "";
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE_TOPIC_COLLAB,
      (leaf) => new TopicCollabSidebarView(leaf, this)
    );
    this.collab = new CollabController(this);
    this.ribbonEl = this.addRibbonIcon("bot", "\u8BFE\u9898\u534F\u4F5C\u6A21\u5F0F", () => {
      this.toggleCollabMode();
    });
    createRibbonIcon(this.ribbonEl);
    this.updateRibbonState();
    this.addCommand({
      id: "toggle-collab-mode",
      name: "\u5207\u6362\u8BFE\u9898\u534F\u4F5C\u6A21\u5F0F",
      callback: () => this.toggleCollabMode()
    });
    this.addCommand({
      id: "pick-intent",
      name: "\u8BFE\u9898\u534F\u4F5C\uFF1A\u9009\u62E9 AI \u610F\u56FE",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "a" }],
      callback: () => void this.pickIntent()
    });
    ALL_INTENTS.forEach((intent) => {
      this.addCommand({
        id: `run-${intent}`,
        name: `\u8BFE\u9898\u534F\u4F5C\uFF1A${INTENT_LABELS[intent]}`,
        callback: () => void this.runIntent(intent)
      });
    });
    this.registerDomEvent(document, "mouseup", (evt) => {
      if (!this.collab.collabActive) return;
      const t = evt.target;
      if (t.closest(".topic-collab-sidebar")) return;
      const view = this.getAnyMarkdownView();
      if (view) {
        this.collab.cacheSelection(view);
        if (this.settings.useSelection) this.refreshSidebar();
      }
    });
    this.registerDomEvent(document, "keyup", (evt) => {
      if (!this.collab.collabActive) return;
      const t = evt.target;
      if (t.closest(".topic-collab-sidebar")) return;
      const view = this.getAnyMarkdownView();
      if (view) {
        this.collab.cacheSelection(view);
        if (this.settings.useSelection) this.refreshSidebar();
      }
    });
    this.addCommand({
      id: "toggle-use-selection",
      name: "\u8BFE\u9898\u534F\u4F5C\uFF1A\u5207\u6362\u9009\u533A\u4F18\u5148",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "s" }],
      callback: () => this.toggleUseSelection()
    });
    this.addCommand({
      id: "open-sidebar",
      name: "\u6253\u5F00\u8BFE\u9898\u534F\u4F5C\u4FA7\u8FB9\u680F",
      callback: () => void this.ensureSidebar()
    });
    this.isStreaming = false;
    console.log(`[topic-collab] loaded v${PLUGIN_VERSION}`);
    this.addSettingTab(new TopicCollabSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, view) => {
        if (view instanceof import_obsidian7.MarkdownView) {
          this.collab.onEditorChange(view);
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const md = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
        if (md == null ? void 0 : md.file) {
          this.lastMarkdownPath = md.file.path;
          this.collab.cacheSelection(md);
        }
        this.collab.onActiveLeafChange();
        void this.maybeAutoEnableFromFrontmatter();
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof import_obsidian7.TFile) {
          this.collab.onFileOpen(file);
        }
        void this.maybeAutoEnableFromFrontmatter();
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.removeClosedFilesFromCollab();
      })
    );
    this.app.workspace.onLayoutReady(() => {
      void this.maybeAutoEnableFromFrontmatter();
    });
  }
  onunload() {
    this.cancelStream();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TOPIC_COLLAB);
  }
  /** 检测关闭的标签页，自动从 @ 列表移除 */
  removeClosedFilesFromCollab() {
    const openPaths = new Set(
      this.app.workspace.getLeavesOfType("markdown").map((leaf) => {
        var _a, _b;
        return (_b = (_a = leaf.view) == null ? void 0 : _a.file) == null ? void 0 : _b.path;
      }).filter(Boolean)
    );
    for (const path of [...this.collab.boundNotePaths]) {
      if (!openPaths.has(path)) {
        this.collab.removeBoundNote(path);
      }
    }
  }
  cancelStream() {
    this.cancelRequested = true;
    this.isStreaming = false;
    for (const leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    )) {
      const view = leaf.view;
      view.setStreaming(false);
      view.endStreaming();
    }
  }
  async loadSettings() {
    var _a;
    const data = (_a = await this.loadData()) != null ? _a : {};
    if (data.defaultIntent !== void 0) {
      data.defaultIntent = migrateIntent(data.defaultIntent);
    }
    if (data.memorySessions) {
      this.memorySessions.loadFrom(data.memorySessions);
    }
    const { memorySessions: _ms, ...settingsData } = data;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, settingsData);
  }
  async saveSettings() {
    await this.persist();
  }
  async persist() {
    await this.saveData({
      ...this.settings,
      memorySessions: this.memorySessions.serialize()
    });
  }
  setMemoryMode(mode) {
    this.settings.memoryMode = mode;
    void this.persist();
    this.refreshSidebar();
  }
  /** 侧边栏「单次/连续」切换 */
  toggleMemoryMode() {
    this.setMemoryMode(
      this.settings.memoryMode === "continuous" ? "single" : "continuous"
    );
  }
  /** 解析当前 @ 笔记（侧边栏获焦时 activeNotePath 可能为空） */
  resolveNotePath() {
    const c = this.collab;
    if (c.activeNotePath) return c.activeNotePath;
    if (c.boundNotePaths.length > 0) {
      c.activeNotePath = c.boundNotePaths[0];
      return c.activeNotePath;
    }
    c.tryBindFromWorkspace();
    return c.activeNotePath;
  }
  async startMemorySession() {
    if (!this.collab.collabActive) {
      new import_obsidian7.Notice("\u8BF7\u5148\u5F00\u542F\u8BFE\u9898\u534F\u4F5C\u6A21\u5F0F\uFF08ribbon \u673A\u5668\u4EBA\u56FE\u6807\uFF09");
      return;
    }
    const path = this.resolveNotePath();
    if (!path) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0");
      return;
    }
    if (this.settings.memoryMode !== "continuous") {
      new import_obsidian7.Notice("\u8BF7\u5207\u6362\u5230\u8FDE\u7EED\u6A21\u5F0F");
      return;
    }
    this.memorySessions.start(path);
    await this.persist();
    this.setStatus("\u8BB0\u5FC6\u8BB0\u5F55\u4E2D");
    new import_obsidian7.Notice("\u5DF2\u5F00\u59CB\u8BB0\u5FC6");
    await this.refreshConversationUI();
  }
  async endMemorySession() {
    const path = this.resolveNotePath();
    if (!path) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0");
      return;
    }
    const session = this.memorySessions.end(path);
    if (!session) {
      new import_obsidian7.Notice("\u5F53\u524D\u672A\u5728\u8BB0\u5F55\u8BB0\u5FC6");
      return;
    }
    if (session.rounds.length === 0) {
      await this.persist();
      this.setStatus("\u5C31\u7EEA");
      new import_obsidian7.Notice("\u672C\u6B21\u8BB0\u5FC6\u4E3A\u7A7A\uFF0C\u672A\u751F\u6210 md");
      await this.refreshConversationUI();
      return;
    }
    const savedPath = await this.memory.writeSession(
      path,
      session.startedAt,
      session.rounds.map((r) => ({
        userContent: r.userDisplay,
        assistantContent: r.assistant
      }))
    );
    await this.persist();
    this.setStatus("\u5C31\u7EEA");
    new import_obsidian7.Notice(`\u8BB0\u5FC6\u5DF2\u4FDD\u5B58\uFF1A${savedPath}\uFF08${session.rounds.length} \u8F6E\uFF09`);
    await this.refreshConversationUI();
  }
  clearSessionHistory(path) {
    if (path) {
      this.memorySessions.clear(path);
      void this.memory.removeNoteSessions(path);
    } else {
      this.memorySessions.clearAll();
      void this.memory.clearAll();
    }
    void this.persist();
    void this.refreshConversationUI();
  }
  getConversationRounds() {
    const path = this.resolveNotePath();
    if (!path) return [];
    return this.memorySessions.getRounds(path);
  }
  isMemoryRecording() {
    const path = this.collab.activeNotePath || this.collab.boundNotePaths[0];
    return path ? this.memorySessions.isActive(path) : false;
  }
  async refreshConversationUI() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TOPIC_COLLAB);
    for (const leaf of leaves) {
      await leaf.view.renderConversation();
    }
    this.refreshSidebar();
  }
  toggleCollabMode() {
    const turningOff = this.collab.collabActive;
    this.collab.toggle();
    if (turningOff) {
      this.cancelStream();
    }
    this.updateRibbonState();
    new import_obsidian7.Notice(
      this.collab.collabActive ? "\u8BFE\u9898\u534F\u4F5C\uFF1A\u5DF2\u5F00\u542F" : "\u8BFE\u9898\u534F\u4F5C\uFF1A\u5DF2\u5173\u95ED"
    );
  }
  toggleUseSelection() {
    this.settings.useSelection = !this.settings.useSelection;
    void this.saveSettings();
    this.refreshSidebar();
    new import_obsidian7.Notice(
      this.settings.useSelection ? "\u9009\u533A\u4F18\u5148\uFF1A\u5DF2\u5F00\u542F\uFF08\u6709\u9009\u4E2D\u65F6\u63D0\u4EA4\u9009\u533A\uFF09" : "\u9009\u533A\u4F18\u5148\uFF1A\u5DF2\u5173\u95ED\uFF08\u63D0\u4EA4\u534F\u4F5C\u589E\u91CF\uFF09"
    );
  }
  updateRibbonState() {
    if (!this.ribbonEl) return;
    this.ribbonEl.toggleClass("topic-collab-ribbon-active", this.collab.collabActive);
  }
  getAnyMarkdownView() {
    var _a;
    const active = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    if (active == null ? void 0 : active.file) return active;
    const paths = this.collab.boundNotePaths.length > 0 ? this.collab.boundNotePaths : this.lastMarkdownPath ? [this.lastMarkdownPath] : [];
    for (const path of paths) {
      if (!path) continue;
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        const view = leaf.view;
        if (((_a = view.file) == null ? void 0 : _a.path) === path) return view;
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view.file) return view;
    }
    return null;
  }
  /** @deprecated 使用 getAnyMarkdownView */
  getTargetMarkdownView() {
    return this.getAnyMarkdownView();
  }
  getActiveMarkdownView() {
    var _a;
    return (_a = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView)) != null ? _a : null;
  }
  async ensureSidebar() {
    const existing = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    );
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return existing[0].view;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return null;
    await leaf.setViewState({
      type: VIEW_TYPE_TOPIC_COLLAB,
      active: true
    });
    this.app.workspace.revealLeaf(leaf);
    return leaf.view;
  }
  setStatus(text) {
    this.statusText = `v${PLUGIN_VERSION} \xB7 ${text}`;
    this.refreshSidebar();
    console.log("[topic-collab]", text);
  }
  refreshSidebar() {
    const leaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    );
    for (const leaf of leaves) {
      leaf.view.render();
    }
  }
  async maybeAutoEnableFromFrontmatter() {
    var _a;
    const view = this.getActiveMarkdownView();
    const file = view == null ? void 0 : view.file;
    if (!file) return;
    const cache = this.app.metadataCache.getFileCache(file);
    const collabFlag = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.collab;
    if (collabFlag === true || collabFlag === "true") {
      this.collab.setActive(true);
      this.updateRibbonState();
    }
  }
  async pickIntent() {
    if (!this.collab.collabActive) {
      new import_obsidian7.Notice("\u8BF7\u5148\u5F00\u542F\u8BFE\u9898\u534F\u4F5C\u6A21\u5F0F");
      return;
    }
    const selection = this.collab.getSelectionText();
    const modal = new IntentModal(this.app, {
      selection,
      prompt: this.collab.userPrompt
    });
    const result = await modal.waitForChoice();
    if (result) {
      this.collab.userPrompt = modal.getText();
      this.refreshSidebar();
      await this.runIntent(result.intent);
    }
  }
  /** 构建存到记忆文件的用户侧内容（不含 API 内部 context） */
  buildMemoryContent(payload) {
    const { source, primary, prompt } = payload;
    if (source === "selection") {
      return prompt ? `[\u9009\u533A]
${primary}
[\u8F93\u5165]
${prompt}` : `[\u9009\u533A]
${primary}`;
    }
    if (source === "prompt") {
      return prompt || primary;
    }
    if (source === "delta") {
      return prompt ? `[\u65B0\u589E]
${primary}
[\u8F93\u5165]
${prompt}` : `[\u65B0\u589E]
${primary}`;
    }
    return prompt || "(\u5168\u6587)";
  }
  async runIntent(intent) {
    console.log("[topic-collab] runIntent", intent);
    if (!this.collab.collabActive) {
      new import_obsidian7.Notice("\u8BF7\u5148\u5F00\u542F\u8BFE\u9898\u534F\u4F5C\u6A21\u5F0F");
      this.setStatus("\u672A\u5F00\u542F\u534F\u4F5C");
      return;
    }
    if (!this.settings.apiKey.trim()) {
      new import_obsidian7.Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E \u2192 \u8BFE\u9898\u534F\u4F5C \u4E2D\u586B\u5199 API Key");
      this.setStatus("\u7F3A\u5C11 API Key");
      return;
    }
    if (this.isStreaming) {
      new import_obsidian7.Notice("AI \u6B63\u5728\u56DE\u590D\uFF0C\u8BF7\u7A0D\u5019");
      return;
    }
    const sidebar = await this.ensureSidebar();
    if (!sidebar) {
      new import_obsidian7.Notice("\u65E0\u6CD5\u6253\u5F00\u4FA7\u8FB9\u680F");
      this.setStatus("\u4FA7\u8FB9\u680F\u6253\u5F00\u5931\u8D25");
      return;
    }
    if (!this.collab.activeNotePath) {
      this.collab.tryBindFromWorkspace();
    }
    if (!this.collab.activeNotePath) {
      new import_obsidian7.Notice("\u8BF7\u5148\u5728 Obsidian \u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0\uFF08\u8DEF\u5F84\u4F1A\u81EA\u52A8 @ \u7ED1\u5B9A\uFF09");
      this.setStatus("\u672A\u7ED1\u5B9A\u7B14\u8BB0");
      return;
    }
    this.collab.userPrompt = sidebar.getPrompt();
    const payload = await this.collab.buildPayload(
      this.app,
      this.collab.userPrompt,
      intent
    );
    if (!payload) {
      new import_obsidian7.Notice("\u8BF7\u5199\u8BF7\u6C42\u3001\u9009\u4E2D\u6587\u5B57\uFF0C\u6216\u5F00\u542F\u534F\u4F5C\u540E\u5199\u65B0\u5185\u5BB9");
      this.setStatus("\u65E0\u63D0\u4EA4\u5185\u5BB9");
      return;
    }
    const userMessage = buildUserMessage(
      intent,
      payload.filePath,
      payload.primary,
      payload.context,
      payload.prompt,
      payload.source
    );
    const notePath = payload.filePath;
    const mode = this.settings.memoryMode;
    const recording = this.memorySessions.isActive(notePath);
    if (mode === "continuous" && !recording) {
      new import_obsidian7.Notice("\u8FDE\u7EED\u6A21\u5F0F\u8BF7\u5148\u70B9\u300C\u5F00\u59CB\u8BB0\u5FC6\u300D");
      this.setStatus("\u672A\u5F00\u59CB\u8BB0\u5FC6");
      return;
    }
    const history = mode === "continuous" && recording ? this.memorySessions.getApiHistory(
      notePath,
      this.settings.historyTurns
    ) : [];
    const requestId = ++this.activeRequestId;
    this.cancelRequested = false;
    this.isStreaming = true;
    this.setStatus(`\u6B63\u5728\u8BF7\u6C42 API\uFF08${INTENT_LABELS[intent]}\uFF09\u2026`);
    sidebar.beginStreaming();
    try {
      const client = new AiClient(this.settings);
      const fullResponse = await client.complete(
        intent,
        userMessage,
        history
      );
      if (this.cancelRequested || requestId !== this.activeRequestId) {
        this.setStatus(recording ? "\u8BB0\u5FC6\u8BB0\u5F55\u4E2D" : "\u5C31\u7EEA");
        sidebar.endStreaming();
        return;
      }
      const edits = parseEditSuggestions(fullResponse);
      const validEdits = edits.filter(
        (e) => this.collab.boundNotePaths.includes(e.filePath)
      );
      if (edits.length > 0 && validEdits.length === 0) {
        new import_obsidian7.Notice("\u4FEE\u6539\u5EFA\u8BAE\u6D89\u53CA\u975E @ \u6587\u4EF6\uFF0C\u5DF2\u5FFD\u7565");
      }
      console.log("[topic-collab] edits parsed:", edits.length, "valid:", validEdits.length);
      if (validEdits.length > 0) {
        await new Promise((resolve) => {
          const modal = new EditConfirmModal(
            this.app,
            validEdits,
            async (approved) => {
              let ok = 0;
              for (const edit of approved) {
                try {
                  await this.applySingleEdit(edit);
                  await this.collab.commitPending(edit.filePath);
                  ok++;
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  new import_obsidian7.Notice(`\u4FEE\u6539\u5931\u8D25\uFF1A${edit.filePath} \u2014 ${msg.slice(0, 100)}`);
                }
              }
              if (ok > 0) new import_obsidian7.Notice(`\u5DF2\u5E94\u7528 ${ok}/${approved.length} \u5904\u4FEE\u6539`);
              resolve();
            }
          );
          modal.open();
        });
      }
      const displayResponse = stripEditBlocks(fullResponse);
      const userDisplay = this.buildMemoryContent(payload);
      if (mode === "continuous" && recording) {
        this.memorySessions.addRound(
          notePath,
          userDisplay,
          userMessage,
          displayResponse
        );
      } else {
        this.memorySessions.setSingleRound(
          notePath,
          userDisplay,
          userMessage,
          displayResponse
        );
      }
      await this.persist();
      if (payload.source === "delta") {
        await this.collab.commitPending(notePath);
      }
      sidebar.clearPrompt();
      sidebar.lastResponse = displayResponse;
      await sidebar.renderConversation();
      this.setStatus(recording ? "\u8BB0\u5FC6\u8BB0\u5F55\u4E2D" : "\u56DE\u590D\u5B8C\u6210");
      new import_obsidian7.Notice("\u8BFE\u9898\u534F\u4F5C\uFF1A\u5DF2\u6536\u5230\u56DE\u590D");
    } catch (err) {
      if (this.cancelRequested || requestId !== this.activeRequestId) {
        this.setStatus(recording ? "\u8BB0\u5FC6\u8BB0\u5F55\u4E2D" : "\u5C31\u7EEA");
        sidebar.endStreaming();
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus("\u8BF7\u6C42\u5931\u8D25");
      new import_obsidian7.Notice(`AI \u8BF7\u6C42\u5931\u8D25\uFF1A${msg.slice(0, 120)}`);
      await sidebar.showError(msg);
    } finally {
      this.isStreaming = false;
      sidebar.setStreaming(false);
      this.refreshSidebar();
    }
  }
  /** 读取笔记内容（优先编辑器缓冲，含未保存改动） */
  async readNoteContentForEdit(path) {
    var _a;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (((_a = view.file) == null ? void 0 : _a.path) === path) {
        return view.editor.getValue();
      }
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian7.TFile) {
      return this.app.vault.read(file);
    }
    return "";
  }
  /** 在 @ 笔记中找到原文并替换（仅允许 boundNotePaths 内的文件） */
  async applySingleEdit(edit) {
    var _a;
    if (!this.collab.boundNotePaths.includes(edit.filePath)) {
      new import_obsidian7.Notice(`\u8DF3\u8FC7\u975E @ \u6587\u4EF6\uFF1A${edit.filePath}`);
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(edit.filePath);
    if (!file) {
      new import_obsidian7.Notice(`\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${edit.filePath}`);
      return;
    }
    const content = await this.readNoteContentForEdit(edit.filePath);
    let newContent;
    if (!edit.original) {
      newContent = content ? content + "\n\n" + edit.replacement : edit.replacement;
    } else {
      const idx = content.indexOf(edit.original);
      if (idx === -1) {
        new import_obsidian7.Notice(`\u5728 ${edit.filePath} \u4E2D\u672A\u627E\u5230\u539F\u6587\uFF0C\u4FEE\u6539\u5DF2\u8DF3\u8FC7`);
        return;
      }
      newContent = content.slice(0, idx) + edit.replacement + content.slice(idx + edit.original.length);
    }
    let written = false;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (((_a = view.file) == null ? void 0 : _a.path) === edit.filePath) {
        view.editor.setValue(newContent);
        written = true;
        break;
      }
    }
    if (!written && file instanceof import_obsidian7.TFile) {
      await this.app.vault.modify(file, newContent);
    }
  }
  async insertResponse(append) {
    var _a, _b;
    const sidebar = (_a = this.app.workspace.getLeavesOfType(VIEW_TYPE_TOPIC_COLLAB)[0]) == null ? void 0 : _a.view;
    const text = (_b = sidebar == null ? void 0 : sidebar.lastResponse) == null ? void 0 : _b.trim();
    if (!text) {
      new import_obsidian7.Notice("\u6CA1\u6709\u53EF\u63D2\u5165\u7684\u5185\u5BB9");
      return;
    }
    const view = this.getAnyMarkdownView();
    if (!view) {
      new import_obsidian7.Notice("\u8BF7\u6253\u5F00\u7ED1\u5B9A\u7684\u7B14\u8BB0\u4EE5\u63D2\u5165\u5185\u5BB9");
      return;
    }
    const editor = view.editor;
    const block = `

---
**AI \u5EFA\u8BAE**

${text}
`;
    if (append) {
      const end = editor.lastLine();
      const lastCh = editor.getLine(end).length;
      editor.replaceRange(block, { line: end, ch: lastCh });
    } else {
      editor.replaceSelection(text);
    }
    this.collab.tryBindFromWorkspace();
    new import_obsidian7.Notice(append ? "\u5DF2\u8FFD\u52A0\u5230\u6587\u672B" : "\u5DF2\u63D2\u5165\u5230\u5149\u6807");
  }
};
var TopicCollabSettingTab = class extends import_obsidian7.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: `\u8BFE\u9898\u534F\u4F5C v${PLUGIN_VERSION}` });
    new import_obsidian7.Setting(containerEl).setName("API Key").setDesc("DeepSeek: sk-... \u4EC5\u4FDD\u5B58\u5728\u672C\u5730 data.json\u3002").addText(
      (text) => text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim();
        await this.plugin.saveSettings();
      })
    ).addButton(
      (btn) => btn.setButtonText("\u6D4B\u8BD5\u8FDE\u63A5").onClick(async () => {
        if (!this.plugin.settings.apiKey.trim()) {
          new import_obsidian7.Notice("\u8BF7\u5148\u586B\u5199 API Key");
          return;
        }
        btn.setDisabled(true);
        btn.setButtonText("\u6D4B\u8BD5\u4E2D\u2026");
        try {
          const client = new AiClient(this.plugin.settings);
          const reply = await client.ping();
          new import_obsidian7.Notice(`\u8FDE\u63A5\u6210\u529F\uFF1A${reply.slice(0, 40)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          new import_obsidian7.Notice(`\u8FDE\u63A5\u5931\u8D25\uFF1A${msg.slice(0, 160)}`);
        } finally {
          btn.setDisabled(false);
          btn.setButtonText("\u6D4B\u8BD5\u8FDE\u63A5");
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("API \u63D0\u4F9B\u5546").addDropdown(
      (dropdown) => dropdown.addOption("deepseek", "DeepSeek\uFF08OpenAI \u517C\u5BB9\uFF09").addOption("anthropic", "Anthropic").setValue(this.plugin.settings.apiProvider).onChange(async (value) => {
        this.plugin.settings.apiProvider = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("API Base URL").setDesc("DeepSeek \u9ED8\u8BA4 https://api.deepseek.com").addText(
      (text) => text.setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
        this.plugin.settings.apiBaseUrl = value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u6A21\u578B").setDesc("DeepSeek: deepseek-v4-pro / deepseek-v4-flash").addText(
      (text) => text.setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value.trim() || DEFAULT_SETTINGS.model;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Thinking \u6A21\u5F0F").setDesc("DeepSeek: thinking.type=enabled\uFF1BAnthropic: adaptive thinking").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableThinking).onChange(async (value) => {
        this.plugin.settings.enableThinking = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Reasoning effort").setDesc("DeepSeek / Anthropic \u63A8\u7406\u5F3A\u5EA6\uFF1Ahigh \u6216 max").addDropdown(
      (dropdown) => dropdown.addOption("high", "high").addOption("max", "max").setValue(this.plugin.settings.reasoningEffort).onChange(async (value) => {
        this.plugin.settings.reasoningEffort = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u7B14\u8BB0\u4E0A\u4E0B\u6587\u957F\u5EA6").setDesc(
      "\u53D1\u7ED9 API \u7684\u7B14\u8BB0\u6700\u5927\u5B57\u7B26\u6570\u30020 = \u4E0D\u622A\u65AD\uFF08\u53D1\u5168\u6587\uFF0C\u53D7\u6A21\u578B\u4E0A\u4E0B\u6587\u9650\u5236\uFF09\u3002"
    ).addText(
      (text) => text.setValue(String(this.plugin.settings.contextMaxChars)).onChange(async (value) => {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 0) {
          this.plugin.settings.contextMaxChars = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u8BB0\u5FC6\u6A21\u5F0F").setDesc(
      "\u5355\u6B21\uFF1A\u6BCF\u95EE\u72EC\u7ACB\uFF0C\u4E0D\u5199 md\uFF0C\u4FA7\u8FB9\u680F\u53EA\u663E\u793A\u672C\u8F6E\u3002\u8FDE\u7EED\uFF1A\u624B\u52A8\u5F00\u59CB/\u7ED3\u675F\uFF0C\u5BF9\u8BDD\u7D2F\u79EF\u663E\u793A\u5E76\u5E26\u4E0A\u4E0B\u6587\uFF1B\u7ED3\u675F\u8BB0\u5FC6\u65F6\u6574\u6BB5\u5199\u5165 collab-memory/ \u4E00\u4E2A md\u3002"
    ).addDropdown(
      (dropdown) => dropdown.addOption("single", "\u5355\u6B21").addOption("continuous", "\u8FDE\u7EED").setValue(this.plugin.settings.memoryMode).onChange(async (value) => {
        this.plugin.settings.memoryMode = value;
        await this.plugin.saveSettings();
        this.plugin.refreshSidebar();
        void this.plugin.refreshConversationUI();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u8FDE\u7EED\u6A21\u5F0F\u5386\u53F2\u8F6E\u6570").setDesc("\u8FDE\u7EED\u8BB0\u5FC6\u8FDB\u884C\u4E2D\u65F6\uFF0C\u53D1\u7ED9 API \u7684\u6700\u8FD1 N \u8F6E\u95EE\u7B54\uFF080 = \u4E0D\u5E26\u5386\u53F2\uFF09\u3002").addText(
      (text) => text.setValue(String(this.plugin.settings.historyTurns)).onChange(async (value) => {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 0 && n <= 20) {
          this.plugin.settings.historyTurns = n;
          await this.plugin.saveSettings();
        }
      })
    ).addButton(
      (btn) => btn.setButtonText("\u6E05\u7A7A\u5BF9\u8BDD\u4E0E\u8BB0\u5FC6 md").onClick(() => {
        this.plugin.clearSessionHistory();
        new import_obsidian7.Notice("\u5DF2\u6E05\u7A7A\u5BF9\u8BDD\u7F13\u5B58\u4E0E collab-memory \u4E0B\u7684\u8BB0\u5FC6\u6587\u4EF6");
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u9009\u533A\u4F18\u5148").setDesc(
      "\u5F00\u542F\u540E\uFF1A\u7F16\u8F91\u5668\u6709\u9009\u4E2D\u6587\u5B57\u65F6\uFF0C\u63D0\u4EA4\u9009\u533A\u800C\u975E\u5F85\u63D0\u4EA4\u589E\u91CF\u3002\u5FEB\u6377\u952E Ctrl+Shift+S\u3002"
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useSelection).onChange(async (value) => {
        this.plugin.settings.useSelection = value;
        await this.plugin.saveSettings();
        this.plugin.refreshSidebar();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u8349\u7A3F debounce\uFF08\u6BEB\u79D2\uFF09").setDesc("\u7F16\u8F91\u5668\u505C\u7B14\u591A\u4E45\u540E\u66F4\u65B0\u4FA7\u8FB9\u680F\u5B57\u6570\u7EDF\u8BA1").addText(
      (text) => text.setValue(String(this.plugin.settings.debounceMs)).onChange(async (value) => {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 100) {
          this.plugin.settings.debounceMs = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u8BF4\u660E").setDesc(
      "\u4E94\u6A21\u5F0F\uFF1A\u68C0\u9519 / \u8BA8\u8BBA / \u7EED\u5199 / LaTeX / \u4FEE\u6539\u7B14\u8BB0\u3002\u8FDE\u7EED\u6A21\u5F0F\u9700\u5148\u300C\u5F00\u59CB\u8BB0\u5FC6\u300D\u3002\u8BB0\u5FC6 md \u4EC5\u5728\u300C\u7ED3\u675F\u8BB0\u5FC6\u300D\u65F6\u751F\u6210\u3002"
    );
  }
};

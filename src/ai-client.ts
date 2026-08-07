import { requestUrl } from "obsidian";
import type { ChatMessage, TopicCollabSettings } from "./settings";
import { SYSTEM_PROMPTS } from "./prompts";
import type { Intent } from "./settings";

export class AiClient {
  constructor(private settings: TopicCollabSettings) {}

  async complete(
    intent: Intent,
    userMessage: string,
    history: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    if (!this.settings.apiKey.trim()) {
      throw new Error("请先在设置中填写 API Key");
    }

    const system = systemPrompt ?? SYSTEM_PROMPTS[intent];
    let response: string;
    if (this.settings.apiProvider === "anthropic") {
      response = await this.completeAnthropic(intent, userMessage, history, system);
    } else {
      response = await this.completeDeepSeek(intent, userMessage, history, system);
    }
    return this.normalizeLatex(response);
  }

  /** 将 \(...\) / \[...\] 替换为 Obsidian 兼容的 $...$ / $$...$$ */
  private normalizeLatex(text: string): string {
    // 跳过代码块内的内容
    const parts: string[] = [];
    const codeBlockRe = /```[\s\S]*?```/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRe.exec(text)) !== null) {
      parts.push(text.slice(last, match.index));
      parts.push(match[0]);
      last = match.index + match[0].length;
    }
    parts.push(text.slice(last));

    for (let j = 0; j < parts.length; j++) {
      if (parts[j].startsWith("```")) continue; // 跳过代码块
      parts[j] = parts[j]
        .replace(/\\\[/g, "$$")
        .replace(/\\\]/g, "$$")
        .replace(/\\\(/g, "$")
        .replace(/\\\)/g, "$");
    }
    return parts.join("");
  }

  /** 设置页「测试连接」用 */
  async ping(): Promise<string> {
    return this.completeDeepSeek(
      "check",
      "回复 OK 两个字母即可",
      [],
      SYSTEM_PROMPTS.check
    );
  }

  private historyLimit(): number {
    const turns = Math.max(0, this.settings.historyTurns);
    return turns * 2;
  }

  private async completeDeepSeek(
    intent: Intent,
    userMessage: string,
    history: ChatMessage[],
    system: string
  ): Promise<string> {
    const base = this.settings.apiBaseUrl.replace(/\/$/, "");
    const urls = [
      `${base}/chat/completions`,
      `${base}/v1/chat/completions`,
    ];

    const messages = [
      { role: "system" as const, content: system },
      ...history.slice(-this.historyLimit()).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const body: Record<string, unknown> = {
      model: this.settings.model,
      messages,
      stream: false,
      max_tokens: 8192,
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
        const response = await requestUrl({
          url,
          method: "POST",
          contentType: "application/json",
          headers: {
            Authorization: `Bearer ${this.settings.apiKey}`,
          },
          body: payload,
          throw: false,
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
      `网络请求失败（Obsidian 无法连接 DeepSeek）。${lastError}\n` +
        `请确认：1) 系统/ Obsidian 代理已开  2) API Key 正确  3) Base URL 为 https://api.deepseek.com`
    );
  }

  private async completeAnthropic(
    intent: Intent,
    userMessage: string,
    history: ChatMessage[],
    system: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      ...history.slice(-this.historyLimit()),
      { role: "user", content: userMessage },
    ];

    const body: Record<string, unknown> = {
      model: this.settings.model,
      max_tokens: 8192,
      stream: false,
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (this.settings.enableThinking) {
      body.thinking = { type: "adaptive" };
      body.output_config = { effort: this.settings.reasoningEffort };
    }

    let response;
    try {
      response = await requestUrl({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        contentType: "application/json",
        headers: {
          "x-api-key": this.settings.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        throw: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Anthropic 网络错误: ${msg}`);
    }

    if (response.status !== 200) {
      throw new Error(
        `Anthropic API ${response.status}: ${response.text.slice(0, 400)}`
      );
    }

    const json = response.json as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\n")
      .trim();

    if (!text) {
      throw new Error(`Anthropic 返回无正文: ${response.text.slice(0, 300)}`);
    }
    return text;
  }

  private parseChatResponse(
    status: number,
    rawText: string,
    json: unknown
  ): string {
    if (status !== 200) {
      throw new Error(`API ${status}: ${rawText.slice(0, 400)}`);
    }

    const data = json as {
      choices?: Array<{
        message?: { content?: string; reasoning_content?: string };
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    const message = data.choices?.[0]?.message;
    const content = message?.content?.trim() ?? "";

    if (content) {
      return content;
    }

    throw new Error(
      `API 200 但无正文。原始响应: ${rawText.slice(0, 350)}`
    );
  }

  /**
   * Raw system+user completion for ghost FIM (no intent prompts, short max_tokens).
   * DeepSeek OpenAI-compatible only for speed; Anthropic falls back to same chat shape via messages.
   */
  async completeRaw(
    system: string,
    user: string,
    opts?: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<string> {
    if (!this.settings.apiKey.trim()) {
      throw new Error("请先在设置中填写 API Key");
    }
    const maxTokens = opts?.maxTokens ?? 120;
    const temperature = opts?.temperature ?? 0.2;
    // 幽灵/别名冷路径可指定自己的模型（如 dsv4f），不动聊天模块 model
    const model = opts?.model ?? this.settings.model;

    if (this.settings.apiProvider === "anthropic") {
      const response = await requestUrl({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        contentType: "application/json",
        headers: {
          "x-api-key": this.settings.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
          stream: false,
        }),
        throw: false,
      });
      const text = this.completeAnthropicParse(response.status, response.text, response.json);
      return this.normalizeLatex(text);
    }

    const base = this.settings.apiBaseUrl.replace(/\/$/, "");
    const url = `${base}/chat/completions`;
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
      max_tokens: maxTokens,
      temperature,
      thinking: { type: "disabled" },
    };
    const response = await requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${this.settings.apiKey}` },
      body: JSON.stringify(body),
      throw: false,
    });
    const text = this.parseChatResponse(response.status, response.text, response.json);
    return this.normalizeLatex(text);
  }

  private completeAnthropicParse(
    status: number,
    rawText: string,
    json: unknown
  ): string {
    if (status !== 200) {
      throw new Error(`Anthropic API ${status}: ${rawText.slice(0, 400)}`);
    }
    const data = json as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\n")
      .trim();
    if (!text) {
      throw new Error(`Anthropic 返回无正文: ${rawText.slice(0, 300)}`);
    }
    return text;
  }
}

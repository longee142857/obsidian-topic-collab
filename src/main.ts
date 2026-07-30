import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { AiClient } from "./ai-client";
import { CollabController, SubmitPayload } from "./collab-mode";
import { IntentModal } from "./intent-modal";
import { MemoryStore } from "./memory-store";
import { MemorySessionManager } from "./memory-session";
import { buildUserMessage } from "./prompts";
import { parseEditSuggestions, stripEditBlocks } from "./edit-suggest";
import { EditConfirmModal } from "./edit-modal";
import {
  TopicCollabSidebarView,
  createRibbonIcon,
} from "./sidebar-view";
import type { ChatMessage, Intent, TopicCollabSettings } from "./settings";
import {
  ALL_INTENTS,
  DEFAULT_SETTINGS,
  INTENT_LABELS,
  migrateIntent,
  VIEW_TYPE_TOPIC_COLLAB,
} from "./settings";
import { PLUGIN_VERSION } from "./version";

export default class TopicCollabPlugin extends Plugin {
  settings: TopicCollabSettings = { ...DEFAULT_SETTINGS };
  collab = new CollabController(this);
  memory = new MemoryStore(this.app.vault);
  memorySessions = new MemorySessionManager();
  isStreaming = false;
  /** 侧边栏顶部状态行 */
  statusText = `v${PLUGIN_VERSION} · 就绪`;

  private ribbonEl: HTMLElement | null = null;
  private activeRequestId = 0;
  cancelRequested = false;
  /** 最近一次激活的 Markdown 笔记路径（点侧边栏后 active 会丢） */
  private lastMarkdownPath = "";

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_TOPIC_COLLAB,
      (leaf) => new TopicCollabSidebarView(leaf, this)
    );

    this.collab = new CollabController(this);

    this.ribbonEl = this.addRibbonIcon("bot", "课题协作模式", () => {
      this.toggleCollabMode();
    });
    createRibbonIcon(this.ribbonEl);
    this.updateRibbonState();

    this.addCommand({
      id: "toggle-collab-mode",
      name: "切换课题协作模式",
      callback: () => this.toggleCollabMode(),
    });

    this.addCommand({
      id: "pick-intent",
      name: "课题协作：选择 AI 意图",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "a" }],
      callback: () => void this.pickIntent(),
    });

    (ALL_INTENTS as Intent[]).forEach((intent) => {
      this.addCommand({
        id: `run-${intent}`,
        name: `课题协作：${INTENT_LABELS[intent]}`,
        callback: () => void this.runIntent(intent),
      });
    });

    this.registerDomEvent(document, "mouseup", (evt) => {
      if (!this.collab.collabActive) return;
      const t = evt.target as HTMLElement;
      if (t.closest(".topic-collab-sidebar")) return;
      const view = this.getAnyMarkdownView();
      if (view) {
        this.collab.cacheSelection(view);
        if (this.settings.useSelection) this.refreshSidebar();
      }
    });

    this.registerDomEvent(document, "keyup", (evt) => {
      if (!this.collab.collabActive) return;
      const t = evt.target as HTMLElement;
      if (t.closest(".topic-collab-sidebar")) return;
      const view = this.getAnyMarkdownView();
      if (view) {
        this.collab.cacheSelection(view);
        if (this.settings.useSelection) this.refreshSidebar();
      }
    });

    this.addCommand({
      id: "toggle-use-selection",
      name: "课题协作：切换选区优先",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "s" }],
      callback: () => this.toggleUseSelection(),
    });

    this.addCommand({
      id: "open-sidebar",
      name: "打开课题协作侧边栏",
      callback: () => void this.ensureSidebar(),
    });

    this.isStreaming = false;
    console.log(`[topic-collab] loaded v${PLUGIN_VERSION}`);

    this.addSettingTab(new TopicCollabSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, view) => {
        if (view instanceof MarkdownView) {
          this.collab.onEditorChange(view);
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const md = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (md?.file) {
          this.lastMarkdownPath = md.file.path;
          this.collab.cacheSelection(md);
        }
        this.collab.onActiveLeafChange();
        void this.maybeAutoEnableFromFrontmatter();
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof TFile) {
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

  onunload(): void {
    this.cancelStream();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TOPIC_COLLAB);
  }

  /** 检测关闭的标签页，自动从 @ 列表移除 */
  private removeClosedFilesFromCollab(): void {
    const openPaths = new Set(
      this.app.workspace
        .getLeavesOfType("markdown")
        .map((leaf) => (leaf.view as MarkdownView)?.file?.path)
        .filter(Boolean)
    );
    for (const path of [...this.collab.boundNotePaths]) {
      if (!openPaths.has(path)) {
        this.collab.removeBoundNote(path);
      }
    }
  }

  cancelStream(): void {
    this.cancelRequested = true;
    this.isStreaming = false;
    for (const leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    )) {
      const view = leaf.view as TopicCollabSidebarView;
      view.setStreaming(false);
      view.endStreaming();
    }
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) ?? {};
    if (data.defaultIntent !== undefined) {
      data.defaultIntent = migrateIntent(data.defaultIntent);
    }
    if (data.memorySessions) {
      this.memorySessions.loadFrom(data.memorySessions);
    }
    const { memorySessions: _ms, ...settingsData } = data;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, settingsData);
  }

  async saveSettings(): Promise<void> {
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.saveData({
      ...this.settings,
      memorySessions: this.memorySessions.serialize(),
    });
  }

  setMemoryMode(mode: MemoryMode): void {
    this.settings.memoryMode = mode;
    void this.persist();
    this.refreshSidebar();
  }

  /** 侧边栏「单次/连续」切换 */
  toggleMemoryMode(): void {
    this.setMemoryMode(
      this.settings.memoryMode === "continuous" ? "single" : "continuous"
    );
  }

  /** 解析当前 @ 笔记（侧边栏获焦时 activeNotePath 可能为空） */
  resolveNotePath(): string {
    const c = this.collab;
    if (c.activeNotePath) return c.activeNotePath;
    if (c.boundNotePaths.length > 0) {
      c.activeNotePath = c.boundNotePaths[0];
      return c.activeNotePath;
    }
    c.tryBindFromWorkspace();
    return c.activeNotePath;
  }

  async startMemorySession(): Promise<void> {
    if (!this.collab.collabActive) {
      new Notice("请先开启课题协作模式（ribbon 机器人图标）");
      return;
    }
    const path = this.resolveNotePath();
    if (!path) {
      new Notice("请先打开一篇笔记");
      return;
    }
    if (this.settings.memoryMode !== "continuous") {
      new Notice("请切换到连续模式");
      return;
    }
    this.memorySessions.start(path);
    await this.persist();
    this.setStatus("记忆记录中");
    new Notice("已开始记忆");
    await this.refreshConversationUI();
  }

  async endMemorySession(): Promise<void> {
    const path = this.resolveNotePath();
    if (!path) {
      new Notice("请先打开一篇笔记");
      return;
    }
    const session = this.memorySessions.end(path);
    if (!session) {
      new Notice("当前未在记录记忆");
      return;
    }
    if (session.rounds.length === 0) {
      await this.persist();
      this.setStatus("就绪");
      new Notice("本次记忆为空，未生成 md");
      await this.refreshConversationUI();
      return;
    }
    const savedPath = await this.memory.writeSession(
      path,
      session.startedAt,
      session.rounds.map((r) => ({
        userContent: r.userDisplay,
        assistantContent: r.assistant,
      }))
    );
    await this.persist();
    this.setStatus("就绪");
    new Notice(`记忆已保存：${savedPath}（${session.rounds.length} 轮）`);
    await this.refreshConversationUI();
  }

  clearSessionHistory(path?: string): void {
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

  isMemoryRecording(): boolean {
    const path = this.collab.activeNotePath || this.collab.boundNotePaths[0];
    return path ? this.memorySessions.isActive(path) : false;
  }

  async refreshConversationUI(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TOPIC_COLLAB);
    for (const leaf of leaves) {
      await (leaf.view as TopicCollabSidebarView).renderConversation();
    }
    this.refreshSidebar();
  }

  toggleCollabMode(): void {
    const turningOff = this.collab.collabActive;
    this.collab.toggle();
    if (turningOff) {
      this.cancelStream();
    }
    this.updateRibbonState();
    new Notice(
      this.collab.collabActive ? "课题协作：已开启" : "课题协作：已关闭"
    );
  }

  toggleUseSelection(): void {
    this.settings.useSelection = !this.settings.useSelection;
    void this.saveSettings();
    this.refreshSidebar();
    new Notice(
      this.settings.useSelection
        ? "选区优先：已开启（有选中时提交选区）"
        : "选区优先：已关闭（提交协作增量）"
    );
  }

  private updateRibbonState(): void {
    if (!this.ribbonEl) return;
    this.ribbonEl.toggleClass("topic-collab-ribbon-active", this.collab.collabActive);
  }

  getAnyMarkdownView(): MarkdownView | null {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file) return active;

    const paths = this.collab.boundNotePaths.length > 0
      ? this.collab.boundNotePaths
      : (this.lastMarkdownPath ? [this.lastMarkdownPath] : []);

    for (const path of paths) {
      if (!path) continue;
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        const view = leaf.view as MarkdownView;
        if (view.file?.path === path) return view;
      }
    }

    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view.file) return view;
    }
    return null;
  }

  /** @deprecated 使用 getAnyMarkdownView */
  getTargetMarkdownView(): MarkdownView | null {
    return this.getAnyMarkdownView();
  }

  getActiveMarkdownView(): MarkdownView | null {
    return this.app.workspace.getActiveViewOfType(MarkdownView) ?? null;
  }

  async ensureSidebar(): Promise<TopicCollabSidebarView | null> {
    const existing = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    );
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return existing[0].view as TopicCollabSidebarView;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return null;
    await leaf.setViewState({
      type: VIEW_TYPE_TOPIC_COLLAB,
      active: true,
    });
    this.app.workspace.revealLeaf(leaf);
    return leaf.view as TopicCollabSidebarView;
  }

  setStatus(text: string): void {
    this.statusText = `v${PLUGIN_VERSION} · ${text}`;
    this.refreshSidebar();
    console.log("[topic-collab]", text);
  }

  refreshSidebar(): void {
    const leaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_TOPIC_COLLAB
    );
    for (const leaf of leaves) {
      (leaf.view as TopicCollabSidebarView).render();
    }
  }

  private async maybeAutoEnableFromFrontmatter(): Promise<void> {
    const view = this.getActiveMarkdownView();
    const file = view?.file;
    if (!file) return;

    const cache = this.app.metadataCache.getFileCache(file);
    const collabFlag = cache?.frontmatter?.collab;
    if (collabFlag === true || collabFlag === "true") {
      this.collab.setActive(true);
      this.updateRibbonState();
    }
  }

  async pickIntent(): Promise<void> {
    if (!this.collab.collabActive) {
      new Notice("请先开启课题协作模式");
      return;
    }
    const selection = this.collab.getSelectionText();
    const modal = new IntentModal(this.app, {
      selection,
      prompt: this.collab.userPrompt,
    });
    const result = await modal.waitForChoice();
    if (result) {
      this.collab.userPrompt = modal.getText();
      this.refreshSidebar();
      await this.runIntent(result.intent);
    }
  }

  /** 构建存到记忆文件的用户侧内容（不含 API 内部 context） */
  private buildMemoryContent(payload: SubmitPayload): string {
    const { source, primary, prompt } = payload;
    if (source === "selection") {
      return prompt
        ? `[选区]\n${primary}\n[输入]\n${prompt}`
        : `[选区]\n${primary}`;
    }
    if (source === "prompt") {
      return prompt || primary;
    }
    if (source === "delta") {
      return prompt
        ? `[新增]\n${primary}\n[输入]\n${prompt}`
        : `[新增]\n${primary}`;
    }
    // source === "note"（全文检错/讨论）
    return prompt || "(全文)";
  }

  async runIntent(intent: Intent): Promise<void> {
    console.log("[topic-collab] runIntent", intent);

    if (!this.collab.collabActive) {
      new Notice("请先开启课题协作模式");
      this.setStatus("未开启协作");
      return;
    }

    if (!this.settings.apiKey.trim()) {
      new Notice("请先在设置 → 课题协作 中填写 API Key");
      this.setStatus("缺少 API Key");
      return;
    }

    if (this.isStreaming) {
      new Notice("AI 正在回复，请稍候");
      return;
    }

    const sidebar = await this.ensureSidebar();
    if (!sidebar) {
      new Notice("无法打开侧边栏");
      this.setStatus("侧边栏打开失败");
      return;
    }

    if (!this.collab.activeNotePath) {
      this.collab.tryBindFromWorkspace();
    }

    if (!this.collab.activeNotePath) {
      new Notice("请先在 Obsidian 打开一篇笔记（路径会自动 @ 绑定）");
      this.setStatus("未绑定笔记");
      return;
    }

    this.collab.userPrompt = sidebar.getPrompt();
    const payload = await this.collab.buildPayload(
      this.app,
      this.collab.userPrompt,
      intent
    );

    if (!payload) {
      new Notice("请写请求、选中文字，或开启协作后写新内容");
      this.setStatus("无提交内容");
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
      new Notice("连续模式请先点「开始记忆」");
      this.setStatus("未开始记忆");
      return;
    }

    const history =
      mode === "continuous" && recording
        ? this.memorySessions.getApiHistory(
            notePath,
            this.settings.historyTurns
          )
        : [];

    const requestId = ++this.activeRequestId;
    this.cancelRequested = false;
    this.isStreaming = true;

    this.setStatus(`正在请求 API（${INTENT_LABELS[intent]}）…`);
    sidebar.beginStreaming();

    try {
      const client = new AiClient(this.settings);
      const fullResponse = await client.complete(
        intent,
        userMessage,
        history
      );

      if (this.cancelRequested || requestId !== this.activeRequestId) {
        this.setStatus(recording ? "记忆记录中" : "就绪");
        sidebar.endStreaming();
        return;
      }

      // 解析编辑建议并处理
      const edits = parseEditSuggestions(fullResponse);
      const validEdits = edits.filter((e) =>
        this.collab.boundNotePaths.includes(e.filePath)
      );
      if (edits.length > 0 && validEdits.length === 0) {
        new Notice("修改建议涉及非 @ 文件，已忽略");
      }
      console.log("[topic-collab] edits parsed:", edits.length, "valid:", validEdits.length);
      if (validEdits.length > 0) {
        await new Promise<void>((resolve) => {
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
                  new Notice(`修改失败：${edit.filePath} — ${msg.slice(0, 100)}`);
                }
              }
              if (ok > 0) new Notice(`已应用 ${ok}/${approved.length} 处修改`);
              resolve();
            }
          );
          modal.open();
        });
      }

      // 编辑块不存入记忆与对话显示
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
      this.setStatus(recording ? "记忆记录中" : "回复完成");
      new Notice("课题协作：已收到回复");
    } catch (err) {
      if (this.cancelRequested || requestId !== this.activeRequestId) {
        this.setStatus(recording ? "记忆记录中" : "就绪");
        sidebar.endStreaming();
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus("请求失败");
      new Notice(`AI 请求失败：${msg.slice(0, 120)}`);
      await sidebar.showError(msg);
    } finally {
      this.isStreaming = false;
      sidebar.setStreaming(false);
      this.refreshSidebar();
    }
  }

  /** 读取笔记内容（优先编辑器缓冲，含未保存改动） */
  private async readNoteContentForEdit(path: string): Promise<string> {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view.file?.path === path) {
        return view.editor.getValue();
      }
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return this.app.vault.read(file);
    }
    return "";
  }

  /** 在 @ 笔记中找到原文并替换（仅允许 boundNotePaths 内的文件） */
  async applySingleEdit(edit: import("./edit-suggest").EditSuggestion): Promise<void> {
    if (!this.collab.boundNotePaths.includes(edit.filePath)) {
      new Notice(`跳过非 @ 文件：${edit.filePath}`);
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(edit.filePath);
    if (!file) {
      new Notice(`文件不存在：${edit.filePath}`);
      return;
    }

    // 优先用编辑器内容（含未保存改动），否则 fallback 到 vault
    const content = await this.readNoteContentForEdit(edit.filePath);

    let newContent: string;
    if (!edit.original) {
      // 原文为空 → 追加到文末
      newContent = content ? content + "\n\n" + edit.replacement : edit.replacement;
    } else {
      // 原文非空 → 找到并替换
      const idx = content.indexOf(edit.original);
      if (idx === -1) {
        new Notice(`在 ${edit.filePath} 中未找到原文，修改已跳过`);
        return;
      }
      newContent =
        content.slice(0, idx) + edit.replacement + content.slice(idx + edit.original.length);
    }

    // 编辑器打开时写编辑器（保留未保存改动），否则写 vault
    let written = false;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view as MarkdownView;
      if (view.file?.path === edit.filePath) {
        view.editor.setValue(newContent);
        written = true;
        break;
      }
    }
    if (!written && file instanceof TFile) {
      await this.app.vault.modify(file, newContent);
    }
  }

  async insertResponse(append: boolean): Promise<void> {
    const sidebar = this.app.workspace
      .getLeavesOfType(VIEW_TYPE_TOPIC_COLLAB)[0]
      ?.view as TopicCollabSidebarView | undefined;

    const text = sidebar?.lastResponse?.trim();
    if (!text) {
      new Notice("没有可插入的内容");
      return;
    }

    const view = this.getAnyMarkdownView();
    if (!view) {
      new Notice("请打开绑定的笔记以插入内容");
      return;
    }

    const editor = view.editor;
    const block = `\n\n---\n**AI 建议**\n\n${text}\n`;

    if (append) {
      const end = editor.lastLine();
      const lastCh = editor.getLine(end).length;
      editor.replaceRange(block, { line: end, ch: lastCh });
    } else {
      editor.replaceSelection(text);
    }

    this.collab.tryBindFromWorkspace();
    new Notice(append ? "已追加到文末" : "已插入到光标");
  }
}

class TopicCollabSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TopicCollabPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: `课题协作 v${PLUGIN_VERSION}` });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("DeepSeek: sk-... 仅保存在本地 data.json。")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) =>
        btn.setButtonText("测试连接").onClick(async () => {
          if (!this.plugin.settings.apiKey.trim()) {
            new Notice("请先填写 API Key");
            return;
          }
          btn.setDisabled(true);
          btn.setButtonText("测试中…");
          try {
            const client = new AiClient(this.plugin.settings);
            const reply = await client.ping();
            new Notice(`连接成功：${reply.slice(0, 40)}`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            new Notice(`连接失败：${msg.slice(0, 160)}`);
          } finally {
            btn.setDisabled(false);
            btn.setButtonText("测试连接");
          }
        })
      );

    new Setting(containerEl)
      .setName("API 提供商")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("deepseek", "DeepSeek（OpenAI 兼容）")
          .addOption("anthropic", "Anthropic")
          .setValue(this.plugin.settings.apiProvider)
          .onChange(async (value) => {
            this.plugin.settings.apiProvider = value as "deepseek" | "anthropic";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("DeepSeek 默认 https://api.deepseek.com")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.apiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiBaseUrl =
              value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("模型")
      .setDesc("DeepSeek: deepseek-v4-pro / deepseek-v4-flash")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim() || DEFAULT_SETTINGS.model;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Thinking 模式")
      .setDesc("DeepSeek: thinking.type=enabled；Anthropic: adaptive thinking")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableThinking)
          .onChange(async (value) => {
            this.plugin.settings.enableThinking = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reasoning effort")
      .setDesc("DeepSeek / Anthropic 推理强度：high 或 max")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("high", "high")
          .addOption("max", "max")
          .setValue(this.plugin.settings.reasoningEffort)
          .onChange(async (value) => {
            this.plugin.settings.reasoningEffort = value as "high" | "max";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("笔记上下文长度")
      .setDesc(
        "发给 API 的笔记最大字符数。0 = 不截断（发全文，受模型上下文限制）。"
      )
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.contextMaxChars))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 0) {
              this.plugin.settings.contextMaxChars = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("记忆模式")
      .setDesc(
        "单次：每问独立，不写 md，侧边栏只显示本轮。连续：手动开始/结束，对话累积显示并带上下文；结束记忆时整段写入 collab-memory/ 一个 md。"
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("single", "单次")
          .addOption("continuous", "连续")
          .setValue(this.plugin.settings.memoryMode)
          .onChange(async (value) => {
            this.plugin.settings.memoryMode = value as "single" | "continuous";
            await this.plugin.saveSettings();
            this.plugin.refreshSidebar();
            void this.plugin.refreshConversationUI();
          })
      );

    new Setting(containerEl)
      .setName("连续模式历史轮数")
      .setDesc("连续记忆进行中时，发给 API 的最近 N 轮问答（0 = 不带历史）。")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.historyTurns))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 0 && n <= 20) {
              this.plugin.settings.historyTurns = n;
              await this.plugin.saveSettings();
            }
          })
      )
      .addButton((btn) =>
        btn.setButtonText("清空对话与记忆 md").onClick(() => {
          this.plugin.clearSessionHistory();
          new Notice("已清空对话缓存与 collab-memory 下的记忆文件");
        })
      );

    new Setting(containerEl)
      .setName("选区优先")
      .setDesc(
        "开启后：编辑器有选中文字时，提交选区而非待提交增量。快捷键 Ctrl+Shift+S。"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useSelection)
          .onChange(async (value) => {
            this.plugin.settings.useSelection = value;
            await this.plugin.saveSettings();
            this.plugin.refreshSidebar();
          })
      );

    new Setting(containerEl)
      .setName("草稿 debounce（毫秒）")
      .setDesc("编辑器停笔多久后更新侧边栏字数统计")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.debounceMs))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 100) {
              this.plugin.settings.debounceMs = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("说明")
      .setDesc(
        "五模式：检错 / 讨论 / 续写 / LaTeX / 修改笔记。连续模式需先「开始记忆」。记忆 md 仅在「结束记忆」时生成。"
      );
  }
}

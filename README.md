# 课题协作 (Topic Collab)

> **AI-powered Obsidian plugin** for collaborative topic writing — error checking, discussion, continuation, LaTeX, note editing. Works with **DeepSeek** and **Anthropic** APIs.
>
> **AI 驱动的 Obsidian 写作助手**：检错、讨论、续写、LaTeX、修改笔记。支持 DeepSeek 与 Anthropic API。

---

## Features / 功能

| 模式 | Intent | 说明 |
|------|--------|------|
| 检错 | `check` | 检查数学表述、符号、逻辑、论证错误；指出不严谨之处 |
| 讨论 | `discuss` | 单问题苏格拉底追问；不代写理解正文 |
| 提纲 | `continue` | 给出 2-3 条可继续方向（仅标题级，不写正文） |
| LaTeX | `latex` | 将数学表述转为 LaTeX，或检查已有公式语法 |
| 修改笔记 | `edit` | AI 生成修改建议 → 用户预览确认 → 写入笔记（仅限 @ 文件） |

### 本地补全 + Ghost（v0.8）

- **热路径（默认开）**：数学区内灰字补全 — LaTeX 命令字典 / 本页符号 / 笔记词库；纯本地、零 LLM
- **冷路径（默认关）**：`ghostMode=manual|idle` 时可选 FIM；中文别名生成走独立命令
- **Tab** 接受，**Esc** 取消；与侧栏讨论分离，不写 `collab-memory`

### Key Features / 核心能力

- **Sidebar chat** — AI conversation panel in the right sidebar
- **Note binding** (`@`) — pin notes to session context; edit scope restricted to bound notes
- **Full-note context** — AI sees the full note for accurate analysis (not shown in chat UI)
- **Selection-aware** — submit selected text or newly written delta
- **Single / Continuous memory mode** — one-shot Q&A or persistent threaded sessions
- **Memory persistence** — continuous sessions auto-saved as markdown files in `collab-memory/`
- **Edit with consent** — AI suggests edits, user previews and confirms before writing
- **Thinking support** — DeepSeek thinking / Anthropic extended thinking modes

---

## Installation / 安装

### Method 1: BRAT (Recommended for auto-update / 推荐，支持自动更新)

1. Install [BRAT](https://obsidian.md/plugins?search=brat) from Community Plugins
2. Open command palette → `BRAT: Add a beta plugin`
3. Enter: `https://github.com/longee142857/obsidian-topic-collab`
4. The plugin will auto-update when new releases are published

### Method 2: Manual / 手动安装

1. Go to the [Releases page](https://github.com/longee142857/obsidian-topic-collab/releases)
2. Download the latest release zip
3. Extract to `{your-vault}/.obsidian/plugins/topic-collab/`
4. Enable the plugin in Obsidian Settings → Community Plugins

### Method 3: Build from source / 从源码构建

```bash
git clone https://github.com/longee142857/obsidian-topic-collab.git
cd obsidian-topic-collab
npm ci
npm run build
cp main.js manifest.json styles.css {your-vault}/.obsidian/plugins/topic-collab/
```

---

## Configuration / 配置

| Setting | Description |
|---------|-------------|
| API Key | DeepSeek or Anthropic API key (stored locally in `data.json`) |
| API Provider | `deepseek` or `anthropic` |
| API Base URL | Custom endpoint (default: `https://api.deepseek.com`) |
| Model | Model ID (e.g., `deepseek-v4-pro`, `claude-sonnet-5`) |
| Thinking | Enable thinking/reasoning modes |
| Context Max Chars | Truncate note content sent to API (0 = full note) |
| Memory Mode | Single (per-question) or Continuous (threaded session) |
| History Turns | Past N Q&A rounds included in API context |
| Debounce | Editor idle delay before updating pending status |
| Selection Priority | When enabled, submit selection instead of delta |

### Hotkeys / 快捷键

| Command | Default Key |
|---------|-------------|
| Toggle collab mode | *(assign in Settings → Hotkeys)* |
| Select AI intent | `Ctrl+Shift+A` |
| Toggle selection priority | `Ctrl+Shift+S` |
| Open sidebar | *(assign in Settings → Hotkeys)* |

---

## Auto-update / 自动更新

The plugin auto-updates via BRAT when a new GitHub release is tagged.  
Each release includes pre-built `main.js`, `manifest.json`, `styles.css`, and `versions.json`.

To create a new release:

```bash
# Update version in manifest.json and src/version.ts
# Then tag and push:
git tag v0.6.0
git push origin v0.6.0
```

The GitHub Actions workflow will build and publish the release automatically.

---

## Development / 开发

```bash
npm ci                  # Install dependencies
npm run dev             # Watch mode (auto-build on changes)
npm run build           # Production build
```

The plugin is built with [esbuild](https://esbuild.github.io/). Source in `src/`.

### Project Structure / 项目结构

```
src/
├── main.ts           # Plugin entry, commands, settings tab
├── collab-mode.ts    # Collab controller, note binding, delta tracking
├── ai-client.ts      # DeepSeek / Anthropic API client
├── sidebar-view.ts   # Sidebar conversation UI
├── intent-modal.ts   # Intent picker modal
├── edit-suggest.ts   # Edit block parser
├── edit-modal.ts     # Edit confirmation modal
├── memory-session.ts # Session/round management
├── memory-store.ts   # Memory markdown persistence
├── prompts.ts        # System prompts, message builder
├── settings.ts       # Types, constants, defaults
└── version.ts        # Version string
```

---

## Security / 安全

- **API keys** are stored in Obsidian's local `data.json` (not in the vault markdown)
- **Edit scope** is restricted to `@`-bound notes — AI cannot modify unbound files
- **Edit requires consent** — all changes are previewed and must be confirmed before writing
- No telemetry, no external connections except the configured API endpoint

---

## License / 许可证

MIT

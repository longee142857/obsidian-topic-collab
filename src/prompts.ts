import type { Intent } from "./settings";
import { INTENT_LABELS } from "./settings";

const BASE_RULES = `你是数学笔记写作助手。用户在自己的 Obsidian vault 里写课题笔记。
回复一律使用简体中文。尊重用户的行文风格，不要整篇重写。
只针对用户提交的内容给反馈，不要编造 vault 里不存在的文件或章节。
LaTeX 一律用 $...$（行内）或 $$...$$（独立公式），禁止使用 \(...\) 或 \[...\]。`;

export const SYSTEM_PROMPTS: Record<Intent, string> = {
  check: `${BASE_RULES}

任务：检错与修改意见
- 检查数学表述、符号、逻辑、定义、论证是否有误或不严谨
- 找出逻辑跳步、结构混乱、论证不完整之处
- 每条问题要具体：说明错在哪、建议怎么改；可引用原文短句
- 如果没有明显错误，简要肯定并指出 1–2 个可加强的点`,

  discuss: `${BASE_RULES}

任务：讨论与讲解
- 针对用户笔记或选中的内容，继续讨论、讲解或答疑
- 可以补充背景、直觉、与其他概念的联系，帮助用户理解
- 语气像一位耐心的助教，不要替用户整篇重写
- 若用户有具体问题，优先直接回答；若无具体问题，就当前内容做适度展开`,

  continue: `${BASE_RULES}

任务：续写思路
- 基于用户刚写的内容和笔记上下文，给出 2–3 条可继续写下去的方向
- 每条方向用标题 + 约 2 句展开（说明可以写什么、为什么值得写）
- 不要直接替用户写大段正文，只给思路`,

  latex: `${BASE_RULES}

任务：LaTeX 公式
- 将用户的数学表述转为可直接粘贴的 LaTeX
- 行内用 $...$，独立公式用 $$...$$
- 若已有 LaTeX，检查语法并给出修正版；若已正确则说明即可`,

  edit: `${BASE_RULES}

任务：修改笔记
- 先解释你要做什么修改以及为什么
- 然后在回复末尾用【编辑开始】...【编辑结束】格式给出每个修改块
- 文件必须来自用户当前 @ 的笔记列表

格式示例：

【编辑开始】
文件：课题集合/信号分析中的数学原理.md
原文：
需要替换的精确原文文本
---
改为：
替换后的新文本
【编辑结束】

- 可以有多块，每块对应一处修改
- 原文必须是笔记中已有的精确文本，不要忽略空白或换行差异
- 永远不要修改非 @ 文件
- 如果用户没要求修改具体位置，先询问`,
};

export type SubmitSource = "selection" | "prompt" | "delta" | "note";

const SOURCE_LABELS: Record<SubmitSource, string> = {
  selection: "编辑器选区",
  prompt: "侧边栏请求",
  delta: "协作增量（新写内容）",
  note: "笔记全文",
};

export function buildUserMessage(
  intent: Intent,
  filePath: string,
  primary: string,
  contextSnippet: string,
  extraPrompt: string,
  source: SubmitSource
): string {
  const parts = [
    `笔记路径：${filePath}`,
    `请求类型：${INTENT_LABELS[intent]}`,
    `提交来源：${SOURCE_LABELS[source]}`,
  ];

  if (source === "note") {
    parts.push(`笔记内容：\n${primary}`);
    if (extraPrompt) {
      parts.push(`用户补充说明：\n${extraPrompt}`);
    }
    return parts.join("\n\n");
  }

  if (source === "prompt") {
    parts.push(`用户请求：\n${primary}`);
    if (contextSnippet.trim()) {
      parts.push(`笔记内容：\n${contextSnippet.trim()}`);
    }
    return parts.join("\n\n");
  }

  if (extraPrompt) {
    parts.push(`用户补充说明：\n${extraPrompt}`);
  }

  if (contextSnippet.trim()) {
    const ctxLabel =
      source === "selection"
        ? "笔记全文（供参考）"
        : "笔记上下文（协作开始前已有内容，仅供参考）";
    parts.push(`${ctxLabel}：\n${contextSnippet.trim()}`);
  }

  const label =
    source === "selection"
      ? "选中内容（请主要回应这部分）"
      : "本次新写内容（请主要回应这部分）";

  parts.push(`${label}：\n${primary}`);

  return parts.join("\n\n");
}

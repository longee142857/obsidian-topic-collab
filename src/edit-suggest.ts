export interface EditSuggestion {
  filePath: string;
  original: string;
  replacement: string;
}

/**
 * 从 AI 回复中解析所有 【编辑开始】...【编辑结束】 块。
 * 兼容格式变体：中文/英文冒号、可选的换行位置。
 */
export function parseEditSuggestions(response: string): EditSuggestion[] {
  const edits: EditSuggestion[] = [];

  // 先检查是否有标记
  if (!response.includes("【编辑开始】")) {
    console.log("[topic-collab] no edit markers in response");
    return edits;
  }

  const blockRe = /【编辑开始】([\s\S]*?)【编辑结束】/g;
  let match: RegExpExecArray | null;

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

    // 原文和改后的分隔线：兼容 --- 或 \n---\n
    const sepRe = /\n-{3,}\n?/;
    const sepIdx = rest.search(sepRe);
    if (sepIdx === -1) {
      console.log("[topic-collab] edit block missing --- separator");
      continue;
    }
    const sepMatch = rest.slice(sepIdx).match(sepRe);
    const sepLen = sepMatch ? sepMatch[0].length : 5;

    // 原文行：去掉开头的"原文："标记
    let original = rest.slice(0, sepIdx);
    original = original.replace(/^原文[：:]\s*\n?/, "").trim();

    // 改为行：取分隔符后面，去掉"改为："标记
    let replacement = rest.slice(sepIdx + sepLen);
    replacement = replacement.replace(/^改为[：:]\s*\n?/, "").trim();

    if (!replacement) {
      console.log("[topic-collab] edit block empty replacement");
      continue;
    }

    edits.push({ filePath, original, replacement });
    console.log(`[topic-collab] parsed edit: ${filePath} (${original.slice(0, 30)}…)`);
  }

  return edits;
}

/** 从回复中移除编辑块，保留纯对话文本 */
export function stripEditBlocks(response: string): string {
  return response.replace(/【编辑开始】[\s\S]*?【编辑结束】/g, "").trim();
}

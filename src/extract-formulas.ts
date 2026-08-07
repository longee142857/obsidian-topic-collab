/** 确定性抽取数学环境内容：热路径层 3 的冷数据源，纯本地，零 LLM。 */
import { mathZones } from "./page-tokens";

function normalizeFormula(f: string): string {
  return f.replace(/\s+/g, " ").trim();
}

function isFormula(f: string): boolean {
  if (!f) return false;
  if (/^[0-9.,\s]+$/.test(f)) return false;
  // 至少含一个公式结构字符，避免把纯中文/标点当公式
  return /[\\{}^=_a-zA-Z0-9]/.test(f);
}

/** 从文档抽出去重后的数学片段（行内 $ 与块 $$）。 */
export function extractFormulas(doc: string): string[] {
  const out = new Set<string>();
  for (const [start, end] of mathZones(doc)) {
    const f = normalizeFormula(doc.slice(start, end));
    if (isFormula(f)) out.add(f);
  }
  return [...out];
}

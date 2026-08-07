/** 本地补全器：命令字典 ∪ 本页 token ∪ 每笔记词库 ∪ 别名。热路径，纯本地。 */
import { findLatexCompletion } from "./latex-dict";
import { PageTokenIndex } from "./page-tokens";
import type { Lexicon } from "./lexicon";

export interface GhostCandidate {
  /** 插入到光标的文本 */
  text: string;
  /** 插入位置（光标处） */
  pos: number;
  /** 插入后光标相对偏移，缺省 = text 末尾 */
  cursorOffset?: number;
}

export interface LocalCompleterHost {
  /** 从内存缓存取某笔记词库（可为 null） */
  getLexicon: (path: string) => Lexicon | null;
}

const MAX_LEXICON_INSERT = 40;

/** 数学环境判断：行内 $ 或块 $$ 或 \begin{} 内。 */
export function inMathZone(doc: string, pos: number): boolean {
  const before = doc.slice(0, pos);
  const dollars = (before.match(/\$/g) || []).length;
  if (dollars % 2 === 1) return true;
  const lastOpen = before.lastIndexOf("$$");
  const lastClose = before.lastIndexOf("$$\n");
  if (
    lastOpen >= 0 &&
    (lastClose < lastOpen || !before.slice(lastOpen + 2).includes("$$"))
  ) {
    return true;
  }
  if (/\\begin\{[A-Za-z]*\}/.test(before.slice(-60))) return true;
  return false;
}

/** 当前数学区从开头到光标的文本。 */
function currentMathPrefix(doc: string, pos: number): string {
  const before = doc.slice(0, pos);
  const lastDollar = before.lastIndexOf("$");
  if (lastDollar >= 0) return doc.slice(lastDollar + 1, pos);
  return "";
}

/** 光标前文本的后缀是否命中某别名 trigger。 */
function matchAlias(before: string, lex: Lexicon | null): string | null {
  if (!lex?.aliases?.length) return null;
  for (const a of lex.aliases) {
    const t = a.trigger?.trim();
    if (!t || t.length < 2 || !a.latex) continue;
    if (before.slice(-t.length) === t) return a.latex;
  }
  return null;
}

export class LocalCompleter {
  private tokens = new PageTokenIndex();

  constructor(private host: LocalCompleterHost) {}

  /** 编辑变化时刷新本页 token 索引。 */
  updateDocument(doc: string): void {
    this.tokens.rebuild(doc);
  }

  complete(doc: string, pos: number, path: string): GhostCandidate | null {
    const before = doc.slice(0, pos);
    const lex = this.host.getLexicon(path);

    if (!inMathZone(doc, pos)) {
      // 散文环境：中文别名 → $...$（别名存在即触发，无需额外开关）
      const latex = matchAlias(before, lex);
      if (latex) return { text: `$${latex}$`, pos };
      return null;
    }

    // 层 1：LaTeX 命令（\alpha、\frac{}、\int_{}^{} 等）
    if (/\\[A-Za-z]*$/.test(before)) {
      const c = findLatexCompletion(before);
      if (c) return { text: c.insert, pos, cursorOffset: c.cursorOffset };
      return null;
    }

    // 层 2：本页已写标识符（含下标，如 R_{eq}）
    const id = before.match(/[A-Za-z][A-Za-z0-9_{}]*$/);
    if (id && id[0].length >= 2) {
      const key = this.tokens.query(id[0]);
      if (key) {
        const rest = key.slice(id[0].length);
        if (rest) return { text: rest, pos };
      }
    }

    // 层 3：本页词库公式前缀匹配
    if (lex && lex.formulas.length > 0) {
      const math = currentMathPrefix(doc, pos);
      if (math && math.length >= 2) {
        let best = "";
        for (const f of lex.formulas) {
          if (f.startsWith(math) && f.length > math.length) {
            const rest = f.slice(math.length);
            if (!best || rest.length < best.length) best = rest;
          }
        }
        if (best) {
          return { text: best.slice(0, MAX_LEXICON_INSERT), pos };
        }
      }
    }

    // 层 4：词库别名（数学环境内直接命中）
    const latex = matchAlias(before, lex);
    if (latex) return { text: latex, pos };

    return null;
  }
}

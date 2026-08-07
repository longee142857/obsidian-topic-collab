/** 全局 LaTeX 命令字典：命令 → 补全模板。热路径层 1，纯本地，零 LLM。 */

export interface LatexCandidate {
  /** 光标前已敲的 `\token`（不含反斜杠） */
  token: string;
  /** 需要插入的剩余文本（不含已敲部分） */
  insert: string;
  /** 插入后光标相对位置（基于 insert 长度的偏移），缺省 = insert 末尾 */
  cursorOffset?: number;
}

/** 普通命令：补全到命令名本身 */
const PLAIN = new Set<string>([
  // 希腊字母（小写）
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho",
  "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
  // 希腊大写（LaTeX 提供的）
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
  "Upsilon", "Phi", "Psi", "Omega",
  // 函数
  "sin", "cos", "tan", "cot", "sec", "csc",
  "sinh", "cosh", "tanh", "coth",
  "arcsin", "arccos", "arctan",
  "log", "ln", "exp", "max", "min", "arg", "dim", "deg", "det", "gcd", "ker", "pr",
  // 关系 / 符号
  "in", "notin", "subset", "supset", "subseteq", "supseteq",
  "cup", "cap", "emptyset", "varnothing", "infty",
  "partial", "nabla", "perp", "parallel",
  "sim", "simeq", "approx", "cong", "neq", "ne", "leq", "ge", "ll", "gg",
  "equiv", "propto",
  // 箭头
  "to", "rightarrow", "leftarrow", "leftrightarrow",
  "Rightarrow", "Leftarrow", "Leftrightarrow",
  "uparrow", "downarrow", "mapsto", "hookrightarrow",
  // 点
  "cdots", "ldots", "vdots", "ddots",
  // 其它符号
  "cdot", "times", "div", "pm", "mp", "ast", "star", "circ", "bullet",
  "oplus", "otimes", "ominus", "odot",
  "quad", "qquad",
  "left", "right",
]);

/** 模板命令：补全到带 {} 结构，光标落入第一对花括号内 */
const TEMPLATE = new Map<string, string>([
  ["frac", "\\frac{}{}"],
  ["cfrac", "\\cfrac{}{}"],
  ["sqrt", "\\sqrt{}"],
  ["int", "\\int_{}^{}"],
  ["iint", "\\iint_{}^{}"],
  ["iiint", "\\iiint_{}^{}"],
  ["oint", "\\oint_{}^{}"],
  ["sum", "\\sum_{}^{}"],
  ["prod", "\\prod_{}^{}"],
  ["coprod", "\\coprod_{}^{}"],
  ["lim", "\\lim_{}"],
  ["limsup", "\\limsup_{}"],
  ["liminf", "\\liminf_{}"],
  ["hat", "\\hat{}"],
  ["bar", "\\bar{}"],
  ["vec", "\\vec{}"],
  ["tilde", "\\tilde{}"],
  ["dot", "\\dot{}"],
  ["ddot", "\\ddot{}"],
  ["overline", "\\overline{}"],
  ["underline", "\\underline{}"],
  ["overrightarrow", "\\overrightarrow{}"],
  ["overleftarrow", "\\overleftarrow{}"],
  ["text", "\\text{}"],
  ["mathbb", "\\mathbb{}"],
  ["mathcal", "\\mathcal{}"],
  ["mathrm", "\\mathrm{}"],
  ["mathbf", "\\mathbf{}"],
  ["operatorname", "\\operatorname{}"],
  ["begin", "\\begin{}"],
  ["underset", "\\underset{}{}"],
  ["overset", "\\overset{}{}"],
  ["stackrel", "\\stackrel{}{}"],
]);

function insertFor(token: string, tpl: string): { insert: string; cursorOffset: number } {
  // 模板以 `\` + 命令名开头；token 不含反斜杠，故跳 token.length + 1 位
  const insert = tpl.slice(token.length + 1);
  const braceIdx = tpl.indexOf("{");
  // 光标落入第一个参数槽：`\frac{` 相对已敲 `\fra` 前进 braceIdx - token.length 位
  const cursorOffset = braceIdx >= 0 ? braceIdx - token.length : insert.length;
  return { insert, cursorOffset };
}

/**
 * 给定数学环境内光标前的文本，找一条最佳命令补全。
 * 优先级：模板且命令名敲完 → 模板前缀匹配（名字最短）→ 普通命令前缀匹配（名字最短）。
 */
export function findLatexCompletion(before: string): LatexCandidate | null {
  const m = before.match(/\\[A-Za-z]*$/);
  if (!m) return null;
  const token = m[0].slice(1);
  if (!token) return null;

  if (TEMPLATE.has(token)) {
    const { insert, cursorOffset } = insertFor(token, TEMPLATE.get(token)!);
    if (!insert) return null;
    return { token, insert, cursorOffset };
  }

  let best: { name: string; tpl: string } | null = null;
  for (const [name, tpl] of TEMPLATE) {
    if (name.startsWith(token) && name.length > token.length) {
      if (!best || name.length < best.name.length) best = { name, tpl };
    }
  }
  if (best) {
    const { insert, cursorOffset } = insertFor(token, best.tpl);
    if (insert) return { token, insert, cursorOffset };
  }

  let plainBest = "";
  for (const name of PLAIN) {
    if (name.startsWith(token) && name.length > token.length) {
      if (!plainBest || name.length < plainBest.length) plainBest = name;
    }
  }
  if (plainBest) {
    return { token, insert: plainBest.slice(token.length) };
  }

  return null;
}

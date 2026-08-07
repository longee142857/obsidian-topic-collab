/** 本页已写标识符索引：热路径层 2，纯本地。扫描数学环境内的变量/命令。 */

export interface TokenStat {
  count: number;
  lastPos: number;
}

/** 数学环境内的标识符：`R`、`x_i`、`R_{eq}`（排除 `\命令` 本体） */
const IDENT_RE = /(?<!\\)[A-Za-z][A-Za-z0-9]*(?:_\{[^}]*\}|_[A-Za-z0-9]+)?/g;
/** 数学环境内的命令：`\alpha`、`\E`（用户自定义宏也收录） */
const CMD_RE = /\\([A-Za-z]+)/g;

/** 返回文档中所有数学区间的 [start, end)（行内 $...$ 与块 $$...$$）。 */
export function mathZones(doc: string): Array<[number, number]> {
  const zones: Array<[number, number]> = [];
  let i = 0;
  const n = doc.length;
  while (i < n) {
    const d = doc.indexOf("$$", i);
    const s = doc.indexOf("$", i);
    if (d === -1 && s === -1) break;
    if (s !== -1 && (d === -1 || s < d)) {
      const close = doc.indexOf("$", s + 1);
      if (close === -1) break;
      zones.push([s + 1, close]);
      i = close + 1;
    } else {
      const close = doc.indexOf("$$", d + 2);
      if (close === -1) break;
      zones.push([d + 2, close]);
      i = close + 2;
    }
  }
  return zones;
}

export class PageTokenIndex {
  private stats = new Map<string, TokenStat>();

  /** 重建索引（每页小，全量重扫；由调用方按需触发）。 */
  rebuild(doc: string): void {
    const next = new Map<string, TokenStat>();
    const bump = (key: string, pos: number) => {
      const s = next.get(key);
      if (s) {
        s.count++;
        if (pos > s.lastPos) s.lastPos = pos;
      } else {
        next.set(key, { count: 1, lastPos: pos });
      }
    };
    for (const [start, end] of mathZones(doc)) {
      const seg = doc.slice(start, end);
      for (const m of seg.matchAll(IDENT_RE)) {
        bump(m[0], start + (m.index ?? 0));
      }
      for (const m of seg.matchAll(CMD_RE)) {
        bump("\\" + m[1], start + (m.index ?? 0));
      }
    }
    this.stats = next;
  }

  /** 取最近/最高频、且以 prefix 开头的标识符（不含完全相等者）。 */
  query(prefix: string): string | null {
    if (!prefix) return null;
    let best = "";
    let bestScore = -1;
    for (const [key, s] of this.stats) {
      if (key === prefix || !key.startsWith(prefix)) continue;
      const score = s.lastPos * 1000 + s.count;
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    }
    return best || null;
  }
}

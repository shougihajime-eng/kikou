// 将棋の表記（日本将棋連盟準拠）。盤上の駒文字・指し手の整形。
// 必須要件: と/杏/圭/全/龍/馬 を正しく描き分ける。▲先手 △後手、筋=算用数字、段=漢数字。

import type { Color, Role } from "./sfen";

// 通常の駒（未成）
const BASE_KANJI: Record<Role, string> = {
  P: "歩",
  L: "香",
  N: "桂",
  S: "銀",
  G: "金",
  B: "角",
  R: "飛",
  K: "玉",
};

// 成駒の1文字表記（盤面のマス用）。成香=杏 成桂=圭 成銀=全。
const PROMOTED_KANJI_SHORT: Partial<Record<Role, string>> = {
  P: "と",
  L: "杏",
  N: "圭",
  S: "全",
  B: "馬",
  R: "龍",
};

// 成駒の正式表記（読み上げ・解説用）。
const PROMOTED_KANJI_FULL: Partial<Record<Role, string>> = {
  P: "と",
  L: "成香",
  N: "成桂",
  S: "成銀",
  B: "馬",
  R: "龍",
};

export interface KanjiOptions {
  /** 後手の玉を「王」と描き分ける（既定: true）。先手は「玉」。 */
  distinguishKing?: boolean;
  /** 成駒を正式表記（成香など）にする。既定 false=1文字（杏など）。 */
  fullPromoted?: boolean;
}

/** 1枚の駒を漢字1（〜2）文字に。盤面マス・駒台で使う。 */
export function pieceKanji(
  role: Role,
  promoted: boolean,
  color: Color,
  opts: KanjiOptions = {}
): string {
  const { distinguishKing = true, fullPromoted = false } = opts;
  if (promoted) {
    const table = fullPromoted ? PROMOTED_KANJI_FULL : PROMOTED_KANJI_SHORT;
    return table[role] ?? BASE_KANJI[role];
  }
  if (role === "K") {
    // 先手=玉 / 後手=王（描き分け）。distinguishKing=false なら両方 玉。
    return distinguishKing && color === "w" ? "王" : "玉";
  }
  return BASE_KANJI[role];
}

const FULLWIDTH_DIGITS = ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"];
const KANJI_NUM = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 筋（1..9）→ 算用数字（全角）。例: 7 → ７ */
export function fileKanji(file: number): string {
  return FULLWIDTH_DIGITS[file] ?? String(file);
}

/** 段（1..9）→ 漢数字。例: 6 → 六 */
export function rankKanji(rank: number): string {
  return KANJI_NUM[rank] ?? String(rank);
}

/** 手番記号。先手 ▲ / 後手 △ */
export function turnMark(color: Color): string {
  return color === "b" ? "▲" : "△";
}

// ---- 指し手の整形（json-kifu-format の Move 互換オブジェクトから） ----
// JKF の Move は { color, from?, to?, piece, promote?, same?, relative?, capture? }
// relative: 'L'|'C'|'R'(左中右) '+'|'='|'-'... を含む将棋連盟準拠の相対表記。

export interface JkfMove {
  color?: number; // 0=先手, 1=後手
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  piece?: string; // "FU","KY","KE","GI","KI","KA","HI","OU","TO","NY","NK","NG","UM","RY"
  promote?: boolean;
  same?: boolean;
  relative?: string;
}

// JKF の駒コード → 表示漢字
const JKF_PIECE_KANJI: Record<string, string> = {
  FU: "歩",
  KY: "香",
  KE: "桂",
  GI: "銀",
  KI: "金",
  KA: "角",
  HI: "飛",
  OU: "玉",
  TO: "と",
  NY: "成香",
  NK: "成桂",
  NG: "成銀",
  UM: "馬",
  RY: "龍",
};

// JKF relative の各記号 → 表記
const RELATIVE_KANJI: Record<string, string> = {
  L: "左",
  C: "直",
  R: "右",
  U: "上",
  M: "寄",
  D: "引",
  H: "打",
};

/**
 * JKF Move 1手を「▲７六歩」形式へ。
 * 直前の着手先 prevTo を渡すと「同」表記に対応。
 */
export function formatMove(move: JkfMove): string {
  const color: Color = move.color === 1 ? "w" : "b";
  const mark = turnMark(color);

  if (!move.to) return mark + "投了";

  const dest = move.same
    ? "同　"
    : fileKanji(move.to.x) + rankKanji(move.to.y);

  const piece = move.piece ? JKF_PIECE_KANJI[move.piece] ?? move.piece : "";

  let relative = "";
  if (move.relative) {
    for (const ch of move.relative) {
      relative += RELATIVE_KANJI[ch] ?? "";
    }
  }

  // 打: from が無く relative に H が含まれる、または駒を打つ手
  const drop = !move.from ? "打" : "";

  const promote = move.promote === true ? "成" : "";
  // promote が明示的に false（成れるのに不成）の時のみ「不成」
  const fusenari = move.promote === false ? "不成" : "";

  return `${mark}${dest}${piece}${relative}${drop}${promote}${fusenari}`;
}

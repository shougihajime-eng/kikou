// SFEN（将棋の局面を1行で表す標準形式）の読み書きと、盤面モデル。
// 例: lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1
//
// 盤の持ち方: board[rank][col]
//   rank 0..8 = SFEN の上から下（段 一..九）
//   col  0..8 = SFEN の左から右（筋 ９..１）
//   よって 筋 = 9 - col, 段 = rank + 1
//   大文字=先手(b), 小文字=後手(w), '+' は成り。

export type Color = "b" | "w";
export type Role = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";

export interface Piece {
  role: Role;
  promoted: boolean;
  color: Color;
}

export type Hands = Record<Color, Partial<Record<Role, number>>>;

export interface BoardState {
  board: (Piece | null)[][]; // [rank 0..8][col 0..8]
  hands: Hands;
  turn: Color;
  moveNumber: number;
}

export const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

export const EMPTY_SFEN = "9/9/9/9/9/9/9/9/9 b - 1";

const PROMOTABLE: Record<Role, boolean> = {
  P: true,
  L: true,
  N: true,
  S: true,
  B: true,
  R: true,
  G: false,
  K: false,
};

function letterToRole(letter: string): Role {
  return letter.toUpperCase() as Role;
}

function emptyBoard(): (Piece | null)[][] {
  return Array.from({ length: 9 }, () => Array<Piece | null>(9).fill(null));
}

export function emptyHands(): Hands {
  return { b: {}, w: {} };
}

/** SFEN 文字列を盤面モデルへ。壊れた SFEN は例外を投げる。 */
export function parseSfen(sfen: string): BoardState {
  const parts = sfen.trim().split(/\s+/);
  if (parts.length < 1) throw new Error("空の SFEN です");
  const [boardPart, turnPart = "b", handsPart = "-", movePart = "1"] = parts;

  const board = emptyBoard();
  const ranks = boardPart.split("/");
  if (ranks.length !== 9)
    throw new Error(`SFEN の段数が不正です（${ranks.length}段）`);

  ranks.forEach((rankStr, rank) => {
    let col = 0;
    let promoted = false;
    for (const ch of rankStr) {
      if (ch === "+") {
        promoted = true;
        continue;
      }
      if (/\d/.test(ch)) {
        col += parseInt(ch, 10);
        promoted = false;
        continue;
      }
      if (col > 8) throw new Error(`SFEN の${rank + 1}段目が長すぎます`);
      const role = letterToRole(ch);
      const color: Color = ch === ch.toUpperCase() ? "b" : "w";
      board[rank][col] = { role, promoted: promoted && PROMOTABLE[role], color };
      promoted = false;
      col += 1;
    }
    if (col !== 9)
      throw new Error(`SFEN の${rank + 1}段目が9マスになっていません`);
  });

  const hands = emptyHands();
  if (handsPart !== "-") {
    let count = 0;
    for (const ch of handsPart) {
      if (/\d/.test(ch)) {
        count = count * 10 + parseInt(ch, 10);
        continue;
      }
      const role = letterToRole(ch);
      const color: Color = ch === ch.toUpperCase() ? "b" : "w";
      hands[color][role] = (hands[color][role] ?? 0) + (count || 1);
      count = 0;
    }
  }

  const turn: Color = turnPart === "w" ? "w" : "b";
  const moveNumber = parseInt(movePart, 10) || 1;
  return { board, hands, turn, moveNumber };
}

/** 盤面モデルを SFEN 文字列へ。 */
export function toSfen(state: BoardState): string {
  const rankStrs = state.board.map((row) => {
    let out = "";
    let empty = 0;
    for (const cell of row) {
      if (!cell) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        out += empty;
        empty = 0;
      }
      const letter =
        cell.color === "b" ? cell.role : cell.role.toLowerCase();
      out += (cell.promoted ? "+" : "") + letter;
    }
    if (empty > 0) out += empty;
    return out || "9";
  });

  // 持ち駒は将棋の標準順（飛角金銀桂香歩）で先手→後手
  const handOrder: Role[] = ["R", "B", "G", "S", "N", "L", "P"];
  let handStr = "";
  for (const color of ["b", "w"] as Color[]) {
    for (const role of handOrder) {
      const n = state.hands[color][role] ?? 0;
      if (n <= 0) continue;
      const letter = color === "b" ? role : role.toLowerCase();
      handStr += (n > 1 ? String(n) : "") + letter;
    }
  }
  if (handStr === "") handStr = "-";

  return `${rankStrs.join("/")} ${state.turn} ${handStr} ${state.moveNumber}`;
}

/** col(0..8) → 筋(1..9) */
export const colToFile = (col: number) => 9 - col;
/** 筋(1..9) → col(0..8) */
export const fileToCol = (file: number) => 9 - file;
/** rank(0..8) → 段(1..9) */
export const rankToRank = (rank: number) => rank + 1;

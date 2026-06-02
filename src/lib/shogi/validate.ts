// 盤面バリデーション。エディタ上で不正な配置を弾く／警告する。
// 二歩・同じ升に2枚（モデル上起きない）・駒の枚数オーバーなどを検査。

import type { BoardState, Role, Color } from "./sfen";
import { colToFile } from "./sfen";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

// 各駒種の総数（盤＋持ち駒、先後合計）の上限
const PIECE_TOTALS: Record<Role, number> = {
  P: 18,
  L: 4,
  N: 4,
  S: 4,
  G: 4,
  B: 2,
  R: 2,
  K: 2,
};

const ROLE_NAME: Record<Role, string> = {
  P: "歩",
  L: "香",
  N: "桂",
  S: "銀",
  G: "金",
  B: "角",
  R: "飛",
  K: "玉",
};

/** 二歩（同じ筋に成っていない歩が2枚以上、同じ手番）を検出。 */
export function findNifu(state: BoardState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const color of ["b", "w"] as Color[]) {
    const fileCounts: Record<number, number> = {};
    for (let rank = 0; rank < 9; rank++) {
      for (let col = 0; col < 9; col++) {
        const cell = state.board[rank][col];
        if (cell && cell.color === color && cell.role === "P" && !cell.promoted) {
          const file = colToFile(col);
          fileCounts[file] = (fileCounts[file] ?? 0) + 1;
        }
      }
    }
    for (const [file, n] of Object.entries(fileCounts)) {
      if (n >= 2) {
        issues.push({
          level: "error",
          message: `二歩です（${color === "b" ? "先手" : "後手"}・${file}筋に歩が${n}枚）`,
        });
      }
    }
  }
  return issues;
}

/** 駒の枚数オーバーを検出（盤＋両者の持ち駒の合計）。 */
export function findOverCount(state: BoardState): ValidationIssue[] {
  const totals: Partial<Record<Role, number>> = {};
  for (let rank = 0; rank < 9; rank++) {
    for (let col = 0; col < 9; col++) {
      const cell = state.board[rank][col];
      if (cell) totals[cell.role] = (totals[cell.role] ?? 0) + 1;
    }
  }
  for (const color of ["b", "w"] as Color[]) {
    for (const [role, n] of Object.entries(state.hands[color])) {
      totals[role as Role] = (totals[role as Role] ?? 0) + (n ?? 0);
    }
  }
  const issues: ValidationIssue[] = [];
  for (const [role, total] of Object.entries(totals)) {
    const max = PIECE_TOTALS[role as Role];
    if (total > max) {
      issues.push({
        level: "error",
        message: `${ROLE_NAME[role as Role]}が多すぎます（${total}枚／上限${max}枚）`,
      });
    }
  }
  return issues;
}

/** 段の制約: 1段目の歩・香、1〜2段目の桂は動けない（行き所のない駒）。先後で反転。 */
export function findDeadPieces(state: BoardState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (let rank = 0; rank < 9; rank++) {
    for (let col = 0; col < 9; col++) {
      const cell = state.board[rank][col];
      if (!cell || cell.promoted) continue;
      // 先手は上(rank小)へ進む。先手にとって最上段は rank 0。
      const lastRank = cell.color === "b" ? 0 : 8;
      const last2 = cell.color === "b" ? 1 : 7;
      if ((cell.role === "P" || cell.role === "L") && rank === lastRank) {
        issues.push({
          level: "warning",
          message: `${cell.color === "b" ? "先手" : "後手"}の${ROLE_NAME[cell.role]}が行き所のない位置にいます`,
        });
      }
      if (cell.role === "N" && (rank === lastRank || rank === last2)) {
        issues.push({
          level: "warning",
          message: `${cell.color === "b" ? "先手" : "後手"}の桂が行き所のない位置にいます`,
        });
      }
    }
  }
  return issues;
}

/** 玉が各陣営ちょうど1枚かを確認（0枚や2枚は警告）。 */
export function findKingIssues(state: BoardState): ValidationIssue[] {
  const counts: Record<Color, number> = { b: 0, w: 0 };
  for (let rank = 0; rank < 9; rank++) {
    for (let col = 0; col < 9; col++) {
      const cell = state.board[rank][col];
      if (cell && cell.role === "K") counts[cell.color]++;
    }
  }
  const issues: ValidationIssue[] = [];
  for (const color of ["b", "w"] as Color[]) {
    if (counts[color] > 1) {
      issues.push({
        level: "error",
        message: `${color === "b" ? "先手" : "後手"}の玉が2枚以上あります`,
      });
    }
  }
  return issues;
}

/** 盤面全体を検査して問題の一覧を返す。空配列なら問題なし。 */
export function validateBoard(state: BoardState): ValidationIssue[] {
  return [
    ...findNifu(state),
    ...findOverCount(state),
    ...findKingIssues(state),
    ...findDeadPieces(state),
  ];
}

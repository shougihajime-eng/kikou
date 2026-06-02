// 棋譜（KIF / KI2 / CSA / JKF）の取り込みと、各手の盤面(SFEN)・読みやすい指し手への変換。
// json-kifu-format に解析を任せ、盤面表示は自前の SFEN/Board に橋渡しする。

import { JKFPlayer } from "json-kifu-format";
import {
  toSfen,
  emptyHands,
  type BoardState,
  type Color,
  type Role,
  type Piece,
} from "./sfen";

// JKF の駒コード → 自前の Role + 成りフラグ
const KIND_MAP: Record<string, { role: Role; promoted: boolean }> = {
  FU: { role: "P", promoted: false },
  KY: { role: "L", promoted: false },
  KE: { role: "N", promoted: false },
  GI: { role: "S", promoted: false },
  KI: { role: "G", promoted: false },
  KA: { role: "B", promoted: false },
  HI: { role: "R", promoted: false },
  OU: { role: "K", promoted: false },
  TO: { role: "P", promoted: true },
  NY: { role: "L", promoted: true },
  NK: { role: "N", promoted: true },
  NG: { role: "S", promoted: true },
  UM: { role: "B", promoted: true },
  RY: { role: "R", promoted: true },
};

interface JkfState {
  board: { color?: number; kind?: string }[][];
  hands: Record<string, number>[];
  color: number;
}

/** json-kifu-format の状態 → 自前 BoardState */
function convertState(state: JkfState): BoardState {
  const board: (Piece | null)[][] = Array.from({ length: 9 }, () =>
    Array<Piece | null>(9).fill(null)
  );
  // JKF: board[x-1][y-1], x=筋(1..9), y=段(1..9)
  for (let x = 1; x <= 9; x++) {
    for (let y = 1; y <= 9; y++) {
      const cell = state.board[x - 1][y - 1];
      if (!cell || !cell.kind) continue;
      const m = KIND_MAP[cell.kind];
      if (!m) continue;
      const color: Color = cell.color === 1 ? "w" : "b";
      // 自前: board[rank][col], rank=y-1, col=9-file → 8-(x-1)
      board[y - 1][9 - x] = { role: m.role, promoted: m.promoted, color };
    }
  }

  const hands = emptyHands();
  const colors: Color[] = ["b", "w"];
  state.hands.forEach((h, idx) => {
    const color = colors[idx];
    for (const [kind, n] of Object.entries(h)) {
      const m = KIND_MAP[kind];
      if (!m || !n) continue;
      hands[color][m.role] = (hands[color][m.role] ?? 0) + n;
    }
  });

  return {
    board,
    hands,
    turn: state.color === 1 ? "w" : "b",
    moveNumber: 1,
  };
}

export interface KifuFrame {
  tesuu: number; // 0=開始局面
  label: string; // 「▲７六歩」など
  sfen: string;
}

export interface KifuParseResult {
  ok: boolean;
  error?: string;
  frames?: KifuFrame[];
  jkf?: unknown; // 保存用（positions.kifu_jkf）
}

/** 棋譜テキスト（自動判別）を解析してフレーム列に。 */
export function parseKifu(text: string): KifuParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "棋譜が空です。" };
  try {
    const player = JKFPlayer.parse(trimmed);
    return framesFromPlayer(player);
  } catch (e) {
    return {
      ok: false,
      error:
        "棋譜を読み取れませんでした。KIF / KI2 / CSA の形式かご確認ください。",
    };
  }
}

/** 保存済み JKF からフレーム列を復元（再生用）。 */
export function framesFromJkf(jkf: unknown): KifuParseResult {
  try {
    const player = new JKFPlayer(jkf as never);
    return framesFromPlayer(player);
  } catch {
    return { ok: false, error: "保存された棋譜を復元できませんでした。" };
  }
}

function framesFromPlayer(player: InstanceType<typeof JKFPlayer>): KifuParseResult {
  const max = player.getMaxTesuu();
  const readable = player.getReadableKifuState();
  const frames: KifuFrame[] = [];
  for (let i = 0; i <= max; i++) {
    player.goto(i);
    const state = player.getState() as unknown as JkfState;
    const board = convertState(state);
    board.moveNumber = i + 1;
    frames.push({
      tesuu: i,
      label: i === 0 ? "開始局面" : readable[i]?.kifu ?? `${i}手目`,
      sfen: toSfen(board),
    });
  }
  return { ok: true, frames, jkf: player.kifu };
}

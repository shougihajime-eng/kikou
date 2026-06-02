"use client";

import { useEffect, useMemo, useState } from "react";
import { Board } from "./Board";
import { Koma } from "./Koma";
import { clsx } from "@/lib/clsx";
import {
  parseSfen,
  toSfen,
  INITIAL_SFEN,
  EMPTY_SFEN,
  type BoardState,
  type Color,
  type Role,
} from "@/lib/shogi/sfen";
import { validateBoard, type ValidationIssue } from "@/lib/shogi/validate";

const PALETTE: Role[] = ["K", "R", "B", "G", "S", "N", "L", "P"];
const HAND_ROLES: Role[] = ["R", "B", "G", "S", "N", "L", "P"];
const PROMOTABLE: Role[] = ["R", "B", "S", "N", "L", "P"];

type Brush =
  | { kind: "piece"; color: Color; role: Role; promoted: boolean }
  | { kind: "erase" }
  | null;

function clone(state: BoardState): BoardState {
  return {
    board: state.board.map((row) => row.map((c) => (c ? { ...c } : null))),
    hands: { b: { ...state.hands.b }, w: { ...state.hands.w } },
    turn: state.turn,
    moveNumber: state.moveNumber,
  };
}

export function BoardEditor({
  sfen,
  onChange,
}: {
  sfen: string;
  onChange: (sfen: string) => void;
}) {
  const [state, setState] = useState<BoardState>(() => safeParse(sfen));
  const [brush, setBrush] = useState<Brush>({
    kind: "piece",
    color: "b",
    role: "P",
    promoted: false,
  });
  const [orientation, setOrientation] = useState<Color>("b");

  // 別の局面に切り替わったら読み直す
  useEffect(() => {
    setState(safeParse(sfen));
  }, [sfen]);

  const issues = useMemo<ValidationIssue[]>(() => validateBoard(state), [state]);

  function apply(next: BoardState) {
    setState(next);
    onChange(toSfen(next));
  }

  function handleSquare(rank: number, col: number) {
    const next = clone(state);
    if (!brush || brush.kind === "erase") {
      next.board[rank][col] = null;
    } else {
      const promoted = brush.promoted && PROMOTABLE.includes(brush.role);
      next.board[rank][col] = {
        role: brush.role,
        promoted,
        color: brush.color,
      };
    }
    apply(next);
  }

  function bumpHand(color: Color, role: Role, delta: number) {
    const next = clone(state);
    const cur = next.hands[color][role] ?? 0;
    const val = Math.max(0, cur + delta);
    if (val === 0) delete next.hands[color][role];
    else next.hands[color][role] = val;
    apply(next);
  }

  function setTurn(turn: Color) {
    apply({ ...clone(state), turn });
  }

  function reset(toInitial: boolean) {
    apply(safeParse(toInitial ? INITIAL_SFEN : EMPTY_SFEN));
  }

  return (
    <div className="space-y-3">
      {/* 上段コントロール */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="inline-flex overflow-hidden rounded border border-line">
          <button
            type="button"
            onClick={() => setTurn("b")}
            className={clsx(
              "px-2.5 py-1 text-xs",
              state.turn === "b" ? "bg-ai text-washi" : "text-sumi-soft"
            )}
          >
            ☗先手番
          </button>
          <button
            type="button"
            onClick={() => setTurn("w")}
            className={clsx(
              "px-2.5 py-1 text-xs",
              state.turn === "w" ? "bg-ai text-washi" : "text-sumi-soft"
            )}
          >
            ☖後手番
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOrientation((o) => (o === "b" ? "w" : "b"))}
          className="rounded border border-line px-2.5 py-1 text-xs text-sumi-soft hover:bg-washi-2"
        >
          ⇅ 盤を反転
        </button>
        <button
          type="button"
          onClick={() => reset(true)}
          className="rounded border border-line px-2.5 py-1 text-xs text-sumi-soft hover:bg-washi-2"
        >
          初期配置
        </button>
        <button
          type="button"
          onClick={() => reset(false)}
          className="rounded border border-line px-2.5 py-1 text-xs text-sumi-soft hover:bg-washi-2"
        >
          全消去
        </button>
      </div>

      <Board
        state={state}
        orientation={orientation}
        onSquareClick={handleSquare}
      />

      {/* バリデーション */}
      {issues.length > 0 && (
        <ul className="space-y-1">
          {issues.map((it, i) => (
            <li
              key={i}
              className={clsx(
                "rounded px-2.5 py-1 text-xs",
                it.level === "error"
                  ? "bg-danger/10 text-danger"
                  : "bg-amber-100/60 text-amber-800"
              )}
            >
              {it.level === "error" ? "⚠ " : "・"}
              {it.message}
            </li>
          ))}
        </ul>
      )}

      {/* 駒を選ぶ（ブラシ） */}
      <div className="rounded-lg border border-line bg-washi-2/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-sumi-soft">駒を選んでマスを押す</span>
          <label className="flex items-center gap-1.5 text-xs text-sumi-soft">
            <input
              type="checkbox"
              checked={brush?.kind === "piece" ? brush.promoted : false}
              onChange={(e) =>
                setBrush((b) =>
                  b?.kind === "piece" ? { ...b, promoted: e.target.checked } : b
                )
              }
            />
            成り駒で置く
          </label>
        </div>

        {(["b", "w"] as Color[]).map((color) => (
          <div key={color} className="mb-1.5 flex flex-wrap items-center gap-1">
            <span className="w-10 text-[10px] text-sumi-soft">
              {color === "b" ? "☗先手" : "☖後手"}
            </span>
            {PALETTE.map((role) => {
              const active =
                brush?.kind === "piece" &&
                brush.color === color &&
                brush.role === role;
              const promoted =
                brush?.kind === "piece" && brush.promoted && PROMOTABLE.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() =>
                    setBrush({
                      kind: "piece",
                      color,
                      role,
                      promoted: brush?.kind === "piece" ? brush.promoted : false,
                    })
                  }
                  className={clsx(
                    "flex h-9 w-8 items-center justify-center rounded border p-0.5 text-lg transition-colors",
                    active
                      ? "border-ai bg-ai/10 ring-1 ring-ai/30"
                      : "border-line bg-washi hover:bg-washi-2"
                  )}
                >
                  <Koma role={role} promoted={!!promoted} color={color} flip={color === "w"} />
                </button>
              );
            })}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setBrush({ kind: "erase" })}
          className={clsx(
            "mt-1 rounded border px-3 py-1 text-xs",
            brush?.kind === "erase"
              ? "border-danger bg-danger/10 text-danger"
              : "border-line text-sumi-soft hover:bg-washi-2"
          )}
        >
          消しゴム（押したマスの駒を取る）
        </button>
      </div>

      {/* 持ち駒の増減 */}
      <div className="rounded-lg border border-line bg-washi-2/40 p-3">
        <span className="mb-2 block text-xs font-medium text-sumi-soft">
          持ち駒（駒台）
        </span>
        {(["b", "w"] as Color[]).map((color) => (
          <div key={color} className="mb-2 flex flex-wrap items-center gap-2">
            <span className="w-10 text-[10px] text-sumi-soft">
              {color === "b" ? "☗先手" : "☖後手"}
            </span>
            {HAND_ROLES.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded border border-line bg-washi px-1.5 py-0.5"
              >
                <span className="flex h-6 w-5 items-center justify-center text-base">
                  <Koma role={role} promoted={false} color={color} />
                </span>
                <button
                  type="button"
                  onClick={() => bumpHand(color, role, -1)}
                  className="px-1 text-xs text-sumi-soft hover:text-danger"
                >
                  −
                </button>
                <span className="w-3 text-center text-xs tabular-nums">
                  {state.hands[color][role] ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => bumpHand(color, role, 1)}
                  className="px-1 text-xs text-sumi-soft hover:text-ai"
                >
                  ＋
                </button>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function safeParse(sfen: string): BoardState {
  try {
    return parseSfen(sfen);
  } catch {
    return parseSfen(INITIAL_SFEN);
  }
}

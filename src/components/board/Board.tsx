"use client";

import { clsx } from "@/lib/clsx";
import {
  type BoardState,
  type Color,
  type Role,
  colToFile,
  rankToRank,
} from "@/lib/shogi/sfen";
import { Koma } from "./Koma";

const HAND_ORDER: Role[] = ["R", "B", "G", "S", "N", "L", "P"];

export interface BoardProps {
  state: BoardState;
  /** 盤の向き。b=先手視点（既定）, w=後手視点。 */
  orientation?: Color;
  onSquareClick?: (rank: number, col: number) => void;
  onHandClick?: (color: Color, role: Role) => void;
  highlight?: Set<string>;
  className?: string;
}

export function Board({
  state,
  orientation = "b",
  onSquareClick,
  onHandClick,
  highlight,
  className,
}: BoardProps) {
  const rows = [...Array(9).keys()];
  const cols = [...Array(9).keys()];
  const orderRows = orientation === "b" ? rows : [...rows].reverse();
  const orderCols = orientation === "b" ? cols : [...cols].reverse();
  const interactive = !!onSquareClick;

  const topColor: Color = orientation === "b" ? "w" : "b";
  const bottomColor: Color = orientation === "b" ? "b" : "w";

  return (
    <div className={clsx("mx-auto w-full max-w-[400px]", className)}>
      <HandStand
        color={topColor}
        hands={state.hands[topColor]}
        onHandClick={onHandClick}
        align="end"
      />

      <div className="my-2 flex items-stretch gap-1">
        <div className="flex-1">
          {/* 筋（算用数字・上） */}
          <div className="mb-1 grid grid-cols-9 px-px text-center text-[10px] tracking-wide text-sumi-faint">
            {orderCols.map((c) => (
              <span key={c}>{colToFile(c)}</span>
            ))}
          </div>

          <div className="ban-frame p-[3px]">
            <div className="ban-grid relative grid grid-cols-9 overflow-hidden text-[min(8.2vw,30px)]">
              {orderRows.map((r) =>
                orderCols.map((c) => {
                  const cell = state.board[r][c];
                  const key = `${r},${c}`;
                  const hl = highlight?.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSquareClick?.(r, c)}
                      className={clsx(
                        "ban-cell relative flex aspect-square items-center justify-center p-[6%] transition-colors",
                        interactive && "cursor-pointer hover:bg-white/25",
                        hl && "bg-ai/15"
                      )}
                    >
                      {cell && (
                        <Koma
                          role={cell.role}
                          promoted={cell.promoted}
                          color={cell.color}
                          flip={cell.color !== orientation}
                        />
                      )}
                    </button>
                  );
                })
              )}
              {/* 星 */}
              {[33.333, 66.667].flatMap((top) =>
                [33.333, 66.667].map((left) => (
                  <span
                    key={`${top}-${left}`}
                    className="ban-star"
                    style={{ top: `${top}%`, left: `${left}%` }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 段（漢数字・右） */}
        <div className="flex flex-col pt-[18px] text-[10px] text-sumi-faint">
          <div className="grid flex-1" style={{ gridTemplateRows: "repeat(9, 1fr)" }}>
            {orderRows.map((r) => (
              <span key={r} className="flex items-center justify-center">
                {rankToRank(r)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <HandStand
        color={bottomColor}
        hands={state.hands[bottomColor]}
        onHandClick={onHandClick}
        align="start"
      />
    </div>
  );
}

function HandStand({
  color,
  hands,
  onHandClick,
  align,
}: {
  color: Color;
  hands: Partial<Record<Role, number>>;
  onHandClick?: (color: Color, role: Role) => void;
  align: "start" | "end";
}) {
  const items = HAND_ORDER.filter((role) => (hands[role] ?? 0) > 0);
  const label = color === "b" ? "☗ 先手" : "☖ 後手";
  return (
    <div
      className={clsx(
        "flex min-h-9 items-center gap-1.5 rounded-md border border-line-soft bg-washi-2/60 px-2.5 py-1.5",
        align === "end" && "flex-row-reverse"
      )}
    >
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-sumi-soft">
        {label}
      </span>
      <div
        className={clsx(
          "flex flex-1 flex-wrap items-center gap-1 text-[min(5vw,19px)]",
          align === "end" && "justify-end"
        )}
      >
        {items.length === 0 && (
          <span className="text-[11px] text-sumi-faint/70">なし</span>
        )}
        {items.map((role) => (
          <button
            key={role}
            type="button"
            disabled={!onHandClick}
            onClick={() => onHandClick?.(color, role)}
            className={clsx(
              "relative flex h-[1.45em] w-[1.3em] items-center justify-center",
              onHandClick && "cursor-pointer hover:opacity-80"
            )}
          >
            <Koma role={role} promoted={false} color={color} flip={color === "w"} />
            {(hands[role] ?? 0) > 1 && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-sumi px-1 text-[9px] font-medium leading-tight text-washi">
                {hands[role]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

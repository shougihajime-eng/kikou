"use client";

import { clsx } from "@/lib/clsx";
import {
  type BoardState,
  type Color,
  type Role,
  colToFile,
  rankToRank,
} from "@/lib/shogi/sfen";
import { pieceKanji } from "@/lib/shogi/notation";

const HAND_ORDER: Role[] = ["R", "B", "G", "S", "N", "L", "P"];

export interface BoardProps {
  state: BoardState;
  /** 盤の向き。b=先手視点（既定）, w=後手視点。 */
  orientation?: Color;
  /** マスをクリックしたとき（編集モード）。rank/col は配列インデックス。 */
  onSquareClick?: (rank: number, col: number) => void;
  /** 駒台の駒をクリック（編集モード）。 */
  onHandClick?: (color: Color, role: Role) => void;
  /** 強調表示するマス（配列インデックス "r,c"）。 */
  highlight?: Set<string>;
  className?: string;
}

function Koma({
  role,
  promoted,
  color,
  orientation,
}: {
  role: Role;
  promoted: boolean;
  color: Color;
  orientation: Color;
}) {
  // 自分から見て相手の駒は上下逆さに描く（将棋盤の慣習）。
  const flipped = color !== orientation;
  const isFull = promoted; // 成駒は2文字になり得るので少し小さく
  return (
    <span
      className={clsx(
        "koma select-none leading-none text-sumi",
        flipped && "rotate-180",
        isFull ? "text-[62%]" : "text-[80%]"
      )}
    >
      {pieceKanji(role, promoted, color)}
    </span>
  );
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

  // 駒台: 先手視点なら 後手台=上 / 先手台=下
  const topColor: Color = orientation === "b" ? "w" : "b";
  const bottomColor: Color = orientation === "b" ? "b" : "w";

  return (
    <div className={clsx("mx-auto w-full max-w-[420px]", className)}>
      <HandRow
        color={topColor}
        hands={state.hands[topColor]}
        onHandClick={onHandClick}
        flip
      />

      <div className="my-1.5 flex">
        {/* 盤本体 */}
        <div className="grid flex-1 grid-cols-9 overflow-hidden rounded-[3px] border-2 border-kaya-line bg-kaya">
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
                    "relative flex aspect-square items-center justify-center border-[0.5px] border-kaya-line/60 text-[min(7vw,26px)]",
                    interactive && "cursor-pointer hover:bg-amber-200/40",
                    hl && "bg-ai/15"
                  )}
                >
                  {cell && (
                    <Koma
                      role={cell.role}
                      promoted={cell.promoted}
                      color={cell.color}
                      orientation={orientation}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 段の表示（漢数字） */}
        <div className="ml-0.5 flex flex-col justify-around text-[10px] text-sumi-soft">
          {orderRows.map((r) => (
            <span key={r} className="text-center">
              {rankToRank(r)}
            </span>
          ))}
        </div>
      </div>

      {/* 筋の表示（算用数字） */}
      <div className="mb-1.5 grid grid-cols-9 pr-3 text-center text-[10px] text-sumi-soft">
        {orderCols.map((c) => (
          <span key={c}>{colToFile(c)}</span>
        ))}
      </div>

      <HandRow
        color={bottomColor}
        hands={state.hands[bottomColor]}
        onHandClick={onHandClick}
      />
    </div>
  );
}

function HandRow({
  color,
  hands,
  onHandClick,
  flip,
}: {
  color: Color;
  hands: Partial<Record<Role, number>>;
  onHandClick?: (color: Color, role: Role) => void;
  flip?: boolean;
}) {
  const items = HAND_ORDER.filter((role) => (hands[role] ?? 0) > 0);
  const label = color === "b" ? "☗先手" : "☖後手";
  return (
    <div
      className={clsx(
        "flex min-h-7 flex-wrap items-center gap-1 rounded bg-washi-2/70 px-2 py-1 text-sm",
        flip && "flex-row-reverse"
      )}
    >
      <span className="text-[10px] text-sumi-soft">{label}</span>
      {items.length === 0 && (
        <span className="text-[10px] text-sumi-soft/50">なし</span>
      )}
      {items.map((role) => (
        <button
          key={role}
          type="button"
          disabled={!onHandClick}
          onClick={() => onHandClick?.(color, role)}
          className={clsx(
            "koma flex items-center text-sumi",
            onHandClick && "cursor-pointer hover:text-ai"
          )}
        >
          {pieceKanji(role, false, color)}
          {(hands[role] ?? 0) > 1 && (
            <span className="ml-0.5 text-[10px]">{hands[role]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

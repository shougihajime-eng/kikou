"use client";

import { clsx } from "@/lib/clsx";
import { pieceKanji, type KanjiOptions } from "@/lib/shogi/notation";
import type { Color, Role } from "@/lib/shogi/sfen";

/**
 * 将棋の駒（五角形・黄楊木地・成駒は朱）。
 * 文字サイズは親要素の font-size を継承する（盤のマスで調整）。
 */
export function Koma({
  role,
  promoted,
  color,
  flip,
  options,
  className,
}: {
  role: Role;
  promoted: boolean;
  color: Color;
  /** 相手の駒として上下逆さに描く。 */
  flip?: boolean;
  options?: KanjiOptions;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "koma-wrap grid h-full w-full place-items-center",
        flip && "koma-flip",
        className
      )}
    >
      <span className="koma-piece">
        <span className={clsx("koma-glyph koma", promoted && "promoted")}>
          {pieceKanji(role, promoted, color, options)}
        </span>
      </span>
    </span>
  );
}

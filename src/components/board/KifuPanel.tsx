"use client";

import { useEffect, useMemo, useState } from "react";
import { Board } from "./Board";
import { clsx } from "@/lib/clsx";
import { parseSfen, INITIAL_SFEN } from "@/lib/shogi/sfen";
import {
  parseKifu,
  framesFromJkf,
  type KifuFrame,
} from "@/lib/shogi/kifu";

export function KifuPanel({
  initialJkf,
  onApply,
  onSaveJkf,
}: {
  initialJkf: unknown | null;
  /** 表示中の局面を「図」として保存する。 */
  onApply: (sfen: string) => void;
  /** 取り込んだ棋譜を保存する（再開時の再生用）。 */
  onSaveJkf: (jkf: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [frames, setFrames] = useState<KifuFrame[] | null>(null);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  // 保存済み棋譜があれば復元
  useEffect(() => {
    if (initialJkf) {
      const r = framesFromJkf(initialJkf);
      if (r.ok && r.frames) {
        setFrames(r.frames);
        setIndex(0);
        setOpen(true);
      }
    }
  }, [initialJkf]);

  function doImport() {
    const r = parseKifu(text);
    if (!r.ok || !r.frames) {
      setError(r.error ?? "取り込みに失敗しました。");
      return;
    }
    setError(null);
    setFrames(r.frames);
    setIndex(0);
    onSaveJkf(r.jkf);
  }

  const current = frames?.[index];
  const max = frames ? frames.length - 1 : 0;
  const state = useMemo(() => {
    try {
      return parseSfen(current?.sfen ?? INITIAL_SFEN);
    } catch {
      return parseSfen(INITIAL_SFEN);
    }
  }, [current?.sfen]);

  return (
    <section className="rounded-lg border border-line bg-washi-2/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-sumi-soft"
      >
        <span>棋譜から取り込む・再生する</span>
        <span className="text-xs">{open ? "▲ とじる" : "▼ ひらく"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-3">
          {/* 取り込み欄 */}
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="KIF / KI2 / CSA の棋譜をここに貼り付けて「取り込む」を押してください。"
              className="w-full resize-y rounded p-2 text-xs leading-5"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <button
                onClick={doImport}
                className="rounded bg-ai px-3 py-1.5 text-xs text-washi hover:bg-ai-soft"
              >
                取り込む
              </button>
              {error && <span className="text-xs text-danger">{error}</span>}
            </div>
          </div>

          {/* 再生 */}
          {frames && current && (
            <div className="space-y-2">
              <Board state={state} />

              <div className="text-center text-sm">
                <span className="text-sumi-soft">
                  {index} / {max} 手目
                </span>
                <span className="ml-2 font-medium text-sumi">{current.label}</span>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <NavBtn label="|◀" onClick={() => setIndex(0)} disabled={index === 0} />
                <NavBtn
                  label="◀"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                />
                <input
                  type="range"
                  min={0}
                  max={max}
                  value={index}
                  onChange={(e) => setIndex(Number(e.target.value))}
                  className="mx-1 flex-1"
                />
                <NavBtn
                  label="▶"
                  onClick={() => setIndex((i) => Math.min(max, i + 1))}
                  disabled={index === max}
                />
                <NavBtn label="▶|" onClick={() => setIndex(max)} disabled={index === max} />
              </div>

              {/* 指し手一覧 */}
              <div className="max-h-32 overflow-y-auto rounded border border-line bg-washi/60 p-1 text-xs">
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                  {frames.map((f) => (
                    <button
                      key={f.tesuu}
                      onClick={() => setIndex(f.tesuu)}
                      className={clsx(
                        "truncate rounded px-1 py-0.5 text-left",
                        f.tesuu === index
                          ? "bg-ai/10 text-ai"
                          : "text-sumi-soft hover:bg-washi-2"
                      )}
                    >
                      {f.tesuu === 0 ? "開始" : `${f.tesuu}. ${f.label}`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  onApply(current.sfen);
                  setApplied(true);
                  setTimeout(() => setApplied(false), 1800);
                }}
                className="w-full rounded border border-ai bg-ai/5 px-3 py-2 text-sm text-ai hover:bg-ai/10"
              >
                {applied ? "✓ この局面を図にしました" : "▼ 表示中の局面を「図」にする"}
              </button>
              <p className="text-center text-[11px] text-sumi-soft/70">
                押すと、上の盤がこの局面に置きかわって保存されます。
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NavBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-line px-2 py-1 text-xs text-sumi-soft hover:bg-washi-2 disabled:opacity-30"
    >
      {label}
    </button>
  );
}

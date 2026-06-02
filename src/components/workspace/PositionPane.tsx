"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db-client";
import { Board } from "@/components/board/Board";
import { BoardEditor } from "@/components/board/BoardEditor";
import { KifuPanel } from "@/components/board/KifuPanel";
import { Attachments } from "./Attachments";
import { parseSfen, INITIAL_SFEN } from "@/lib/shogi/sfen";
import { renderLite } from "@/lib/render-lite";
import type { Position } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

export function PositionPane({
  position,
  isAuthor,
  onPatch,
  onRenameTitle,
}: {
  position: Position;
  isAuthor: boolean;
  onPatch: (id: string, patch: Partial<Position>) => void;
  onRenameTitle: (id: string, title: string) => void;
}) {
  const [description, setDescription] = useState(position.description);
  const [save, setSave] = useState<SaveState>("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = db();

  // 解説の自動保存（debounce 800ms）
  function scheduleDescriptionSave(value: string) {
    setDescription(value);
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await supabase
        .from("positions")
        .update({ description: value })
        .eq("id", position.id);
      onPatch(position.id, { description: value });
      setSave("saved");
      setTimeout(() => setSave("idle"), 1500);
    }, 800);
  }

  // 盤の保存（SFEN 変更ごと・debounce 600ms）
  const boardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleBoardSave(sfen: string) {
    const side = sfen.split(" ")[1] ?? "b";
    if (boardTimer.current) clearTimeout(boardTimer.current);
    setSave("saving");
    boardTimer.current = setTimeout(async () => {
      await supabase
        .from("positions")
        .update({ sfen, side_to_move: side })
        .eq("id", position.id);
      onPatch(position.id, { sfen, side_to_move: side });
      setSave("saved");
      setTimeout(() => setSave("idle"), 1500);
    }, 600);
  }

  // 取り込んだ棋譜（JKF）を保存（再開時の再生用）
  async function saveKifuJkf(jkf: unknown) {
    await supabase
      .from("positions")
      .update({ kifu_jkf: jkf })
      .eq("id", position.id);
    onPatch(position.id, { kifu_jkf: jkf });
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (boardTimer.current) clearTimeout(boardTimer.current);
    };
  }, []);

  const safeState = (() => {
    try {
      return parseSfen(position.sfen);
    } catch {
      return parseSfen(INITIAL_SFEN);
    }
  })();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* 図のタイトル */}
      <div className="flex items-center justify-between gap-2">
        {editingTitle && isAuthor ? (
          <input
            autoFocus
            defaultValue={position.title}
            onBlur={(e) => {
              onRenameTitle(position.id, e.target.value.trim() || position.title);
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="flex-1 rounded px-2 py-1 font-mincho text-lg"
          />
        ) : (
          <h2
            onDoubleClick={() => isAuthor && setEditingTitle(true)}
            className="font-mincho text-lg text-sumi"
            title={isAuthor ? "ダブルクリックで名前を変更" : undefined}
          >
            {position.title}
          </h2>
        )}
        <span className="shrink-0 text-xs text-sumi-soft">
          {save === "saving" && "保存中…"}
          {save === "saved" && "✓ 保存しました"}
        </span>
      </div>

      {/* 盤 */}
      {isAuthor ? (
        <>
          <BoardEditor sfen={position.sfen} onChange={scheduleBoardSave} />
          <KifuPanel
            initialJkf={position.kifu_jkf}
            onApply={scheduleBoardSave}
            onSaveJkf={saveKifuJkf}
          />
        </>
      ) : (
        <Board state={safeState} />
      )}

      {/* 解説 */}
      <section>
        <h3 className="mb-1.5 text-xs font-medium text-sumi-soft">解説</h3>
        {isAuthor ? (
          <textarea
            value={description}
            onChange={(e) => scheduleDescriptionSave(e.target.value)}
            rows={8}
            placeholder="この局面の解説を書きます。▲７六歩 のような指し手もそのまま書けます。&#10;# 見出し  **太字**  - 箇条書き が使えます。"
            className="w-full resize-y rounded p-3 text-sm leading-7"
          />
        ) : description.trim() ? (
          <div
            className="prose-kikou text-sm leading-7 text-sumi"
            dangerouslySetInnerHTML={{ __html: renderLite(description) }}
          />
        ) : (
          <p className="text-sm text-sumi-soft/60">（解説はまだありません）</p>
        )}
      </section>

      <Attachments positionId={position.id} canEdit={isAuthor} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db-client";
import { clsx } from "@/lib/clsx";
import { signOut } from "@/app/auth-actions";
import type { Chapter, Position, Project, Role } from "@/lib/types";
import { ChapterTree } from "./ChapterTree";
import { PositionPane } from "./PositionPane";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { InviteButton } from "@/components/invite-button";

export function Workspace({
  project,
  role,
  userId,
  myName,
  initialChapters,
  initialPositions,
  nameById,
  roleById,
}: {
  project: Project;
  role: Role;
  userId: string;
  myName: string;
  initialChapters: Chapter[];
  initialPositions: Position[];
  nameById: Record<string, string>;
  roleById: Record<string, Role>;
}) {
  const isAuthor = role === "author";
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPositions[0]?.id ?? null
  );
  const [mobileTab, setMobileTab] = useState<"board" | "comments">("board");
  const [treeOpen, setTreeOpen] = useState(false);

  const selected = useMemo(
    () => positions.find((p) => p.id === selectedId) ?? null,
    [positions, selectedId]
  );

  const supabase = db();

  // ---- 章の操作（著者のみ） ----
  async function addChapter() {
    const sort = chapters.length;
    const { data } = await supabase
      .from("chapters")
      .insert({ project_id: project.id, title: `第${sort + 1}章`, sort_order: sort })
      .select()
      .single();
    if (data) setChapters((cs) => [...cs, data as Chapter]);
  }

  async function renameChapter(id: string, title: string) {
    setChapters((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
    await supabase.from("chapters").update({ title }).eq("id", id);
  }

  async function deleteChapter(id: string) {
    setChapters((cs) => cs.filter((c) => c.id !== id));
    setPositions((ps) => ps.filter((p) => p.chapter_id !== id));
    await supabase.from("chapters").delete().eq("id", id);
  }

  async function reorderChapters(ordered: Chapter[]) {
    setChapters(ordered);
    await Promise.all(
      ordered.map((c, i) =>
        supabase.from("chapters").update({ sort_order: i }).eq("id", c.id)
      )
    );
  }

  // ---- 局面の操作（著者のみ） ----
  async function addPosition(chapterId: string) {
    const siblings = positions.filter((p) => p.chapter_id === chapterId);
    const sort = siblings.length;
    const { data } = await supabase
      .from("positions")
      .insert({
        chapter_id: chapterId,
        title: `図${sort + 1}`,
        sort_order: sort,
      })
      .select()
      .single();
    if (data) {
      setPositions((ps) => [...ps, data as Position]);
      setSelectedId((data as Position).id);
    }
  }

  async function renamePosition(id: string, title: string) {
    setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, title } : p)));
    await supabase.from("positions").update({ title }).eq("id", id);
  }

  async function deletePosition(id: string) {
    setPositions((ps) => ps.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    await supabase.from("positions").delete().eq("id", id);
  }

  async function reorderPositions(chapterId: string, ordered: Position[]) {
    setPositions((ps) => {
      const others = ps.filter((p) => p.chapter_id !== chapterId);
      return [...others, ...ordered];
    });
    await Promise.all(
      ordered.map((p, i) =>
        supabase.from("positions").update({ sort_order: i }).eq("id", p.id)
      )
    );
  }

  // ローカル更新（盤・解説の保存はPositionPane内でdebounce）
  function patchPosition(id: string, patch: Partial<Position>) {
    setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const tree = (
    <ChapterTree
      isAuthor={isAuthor}
      chapters={chapters}
      positions={positions}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        setTreeOpen(false);
        setMobileTab("board");
      }}
      onAddChapter={addChapter}
      onRenameChapter={renameChapter}
      onDeleteChapter={deleteChapter}
      onReorderChapters={reorderChapters}
      onAddPosition={addPosition}
      onRenamePosition={renamePosition}
      onDeletePosition={deletePosition}
      onReorderPositions={reorderPositions}
    />
  );

  return (
    <div className="flex h-screen flex-col">
      {/* ヘッダ */}
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-washi/90 px-3 py-2 backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setTreeOpen((v) => !v)}
            className="rounded border border-line p-1.5 text-sumi-soft lg:hidden"
            aria-label="目次"
          >
            ☰
          </button>
          <Link href="/projects" className="font-mincho text-lg text-sumi shrink-0">
            棋稿
          </Link>
          <span className="text-line">/</span>
          <span className="truncate font-mincho text-base text-sumi">
            {project.title}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-xs text-sumi-soft sm:inline">
            {isAuthor ? "著者" : "編集者"}・{myName}
          </span>
          {isAuthor && <InviteButton projectId={project.id} />}
          <form action={signOut}>
            <button className="rounded border border-line px-2 py-1 text-xs text-sumi-soft hover:bg-washi-2">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 左：目次（PC常時／モバイルはドロワー） */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line bg-washi-2/30 lg:block">
          {tree}
        </aside>
        {treeOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setTreeOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-line bg-washi shadow-xl">
              {tree}
            </aside>
          </div>
        )}

        {/* 中央＋右 */}
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          {/* モバイルタブ */}
          <div className="flex shrink-0 border-b border-line lg:hidden">
            {(["board", "comments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMobileTab(t)}
                className={clsx(
                  "flex-1 py-2 text-sm",
                  mobileTab === t
                    ? "border-b-2 border-ai font-medium text-ai"
                    : "text-sumi-soft"
                )}
              >
                {t === "board" ? "盤・解説" : "コメント"}
              </button>
            ))}
          </div>

          {/* 中央：盤＋解説 */}
          <main
            className={clsx(
              "min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6",
              mobileTab !== "board" && "hidden lg:block"
            )}
          >
            {selected ? (
              <PositionPane
                key={selected.id}
                position={selected}
                isAuthor={isAuthor}
                onPatch={patchPosition}
                onRenameTitle={renamePosition}
              />
            ) : (
              <p className="mt-20 text-center text-sm text-sumi-soft">
                左の目次から局面を選んでください。
                {isAuthor && "（無ければ章や図を追加しましょう）"}
              </p>
            )}
          </main>

          {/* 右：コメント */}
          <section
            className={clsx(
              "flex min-h-0 w-full shrink-0 flex-col border-line lg:w-80 lg:border-l",
              mobileTab !== "comments" && "hidden lg:flex"
            )}
          >
            {selected ? (
              <CommentsPanel
                key={selected.id}
                positionId={selected.id}
                userId={userId}
                nameById={nameById}
                roleById={roleById}
                isAuthor={isAuthor}
              />
            ) : (
              <p className="p-6 text-center text-sm text-sumi-soft">
                局面を選ぶとコメントできます。
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "@/lib/clsx";
import type { Chapter, Position } from "@/lib/types";

interface Props {
  isAuthor: boolean;
  chapters: Chapter[];
  positions: Position[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChapter: () => void;
  onRenameChapter: (id: string, title: string) => void;
  onDeleteChapter: (id: string) => void;
  onReorderChapters: (ordered: Chapter[]) => void;
  onAddPosition: (chapterId: string) => void;
  onRenamePosition: (id: string, title: string) => void;
  onDeletePosition: (id: string) => void;
  onReorderPositions: (chapterId: string, ordered: Position[]) => void;
}

export function ChapterTree(props: Props) {
  const { chapters, positions, isAuthor } = props;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = String(active.id);
    const o = String(over.id);

    if (a.startsWith("chapter:") && o.startsWith("chapter:")) {
      const from = chapters.findIndex((c) => `chapter:${c.id}` === a);
      const to = chapters.findIndex((c) => `chapter:${c.id}` === o);
      if (from >= 0 && to >= 0)
        props.onReorderChapters(arrayMove(chapters, from, to));
      return;
    }

    if (a.startsWith("pos:") && o.startsWith("pos:")) {
      const aid = a.slice(4);
      const oid = o.slice(4);
      const pos = positions.find((p) => p.id === aid);
      if (!pos) return;
      const list = positions
        .filter((p) => p.chapter_id === pos.chapter_id)
        .sort((x, y) => x.sort_order - y.sort_order);
      const from = list.findIndex((p) => p.id === aid);
      const to = list.findIndex((p) => p.id === oid);
      if (from >= 0 && to >= 0)
        props.onReorderPositions(pos.chapter_id, arrayMove(list, from, to));
    }
  }

  return (
    <nav className="p-2 text-sm">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={chapters.map((c) => `chapter:${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {chapters.map((chapter) => (
            <ChapterNode key={chapter.id} chapter={chapter} {...props} />
          ))}
        </SortableContext>
      </DndContext>

      {isAuthor && (
        <button
          onClick={props.onAddChapter}
          className="mt-2 w-full rounded border border-dashed border-line px-2 py-1.5 text-xs text-sumi-soft hover:bg-washi-2"
        >
          ＋ 章を追加
        </button>
      )}
    </nav>
  );
}

function ChapterNode({
  chapter,
  positions,
  isAuthor,
  selectedId,
  onSelect,
  onRenameChapter,
  onDeleteChapter,
  onAddPosition,
  onRenamePosition,
  onDeletePosition,
}: Props & { chapter: Chapter }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `chapter:${chapter.id}`, disabled: !isAuthor });
  const [editing, setEditing] = useState(false);

  const list = positions
    .filter((p) => p.chapter_id === chapter.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("mb-1", isDragging && "opacity-50")}
    >
      <div className="group flex items-center gap-1 rounded px-1 py-1">
        {isAuthor && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-sumi-soft/40 hover:text-sumi-soft"
          >
            ⠿
          </span>
        )}
        {editing ? (
          <input
            autoFocus
            defaultValue={chapter.title}
            onBlur={(e) => {
              onRenameChapter(chapter.id, e.target.value.trim() || chapter.title);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="flex-1 rounded px-1 py-0.5 text-xs"
          />
        ) : (
          <span
            onDoubleClick={() => isAuthor && setEditing(true)}
            className="flex-1 truncate font-medium text-sumi"
          >
            {chapter.title}
          </span>
        )}
        {isAuthor && (
          <div className="hidden items-center gap-1 group-hover:flex">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-sumi-soft hover:text-ai"
              title="名前を変える"
            >
              ✎
            </button>
            <button
              onClick={() => {
                if (confirm(`「${chapter.title}」を削除しますか？（中の図も消えます）`))
                  onDeleteChapter(chapter.id);
              }}
              className="text-xs text-sumi-soft hover:text-danger"
              title="削除"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="ml-3 border-l border-line pl-2">
        <SortableContext
          items={list.map((p) => `pos:${p.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.map((p) => (
            <PositionNode
              key={p.id}
              position={p}
              isAuthor={isAuthor}
              selected={p.id === selectedId}
              onSelect={onSelect}
              onRename={onRenamePosition}
              onDelete={onDeletePosition}
            />
          ))}
        </SortableContext>
        {isAuthor && (
          <button
            onClick={() => onAddPosition(chapter.id)}
            className="mt-0.5 w-full rounded px-1.5 py-1 text-left text-xs text-sumi-soft hover:bg-washi-2"
          >
            ＋ 図を追加
          </button>
        )}
      </div>
    </div>
  );
}

function PositionNode({
  position,
  isAuthor,
  selected,
  onSelect,
  onRename,
  onDelete,
}: {
  position: Position;
  isAuthor: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `pos:${position.id}`, disabled: !isAuthor });
  const [editing, setEditing] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "group flex items-center gap-1 rounded px-1 py-0.5",
        isDragging && "opacity-50",
        selected && "bg-ai/10"
      )}
    >
      {isAuthor && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-sumi-soft/30 hover:text-sumi-soft"
        >
          ⠿
        </span>
      )}
      {editing ? (
        <input
          autoFocus
          defaultValue={position.title}
          onBlur={(e) => {
            onRename(position.id, e.target.value.trim() || position.title);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="flex-1 rounded px-1 py-0.5 text-xs"
        />
      ) : (
        <button
          onClick={() => onSelect(position.id)}
          onDoubleClick={() => isAuthor && setEditing(true)}
          className={clsx(
            "flex-1 truncate py-0.5 text-left text-xs",
            selected ? "text-ai" : "text-sumi-soft hover:text-sumi"
          )}
        >
          {position.title}
        </button>
      )}
      {isAuthor && (
        <button
          onClick={() => {
            if (confirm(`「${position.title}」を削除しますか？`))
              onDelete(position.id);
          }}
          className="hidden text-xs text-sumi-soft hover:text-danger group-hover:block"
          title="削除"
        >
          ×
        </button>
      )}
    </div>
  );
}

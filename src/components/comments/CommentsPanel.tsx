"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db-client";
import { clsx } from "@/lib/clsx";
import type { Comment, Role } from "@/lib/types";

export function CommentsPanel({
  positionId,
  userId,
  nameById,
  roleById,
  isAuthor,
}: {
  positionId: string;
  userId: string;
  nameById: Record<string, string>;
  roleById: Record<string, Role>;
  isAuthor: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const supabase = db();
  const listRef = useRef<HTMLDivElement>(null);

  // 初回ロード
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("position_id", positionId)
        .order("created_at", { ascending: true });
      if (active) setComments((data ?? []) as Comment[]);
    })();
    return () => {
      active = false;
    };
  }, [positionId, supabase]);

  // リアルタイム購読（スキーマ kikou を明示）
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${positionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "kikou",
          table: "comments",
          filter: `position_id=eq.${positionId}`,
        },
        (payload) => {
          setComments((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Comment;
              if (prev.some((c) => c.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Comment;
              return prev.map((c) => (c.id === row.id ? row : c));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as Comment;
              return prev.filter((c) => c.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [positionId, supabase]);

  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const byParent = new Map<string, Comment[]>();
    comments
      .filter((c) => c.parent_id)
      .forEach((c) => {
        const arr = byParent.get(c.parent_id!) ?? [];
        arr.push(c);
        byParent.set(c.parent_id!, arr);
      });
    return roots
      .filter((r) => !unresolvedOnly || !r.resolved)
      .map((r) => ({ root: r, replies: byParent.get(r.id) ?? [] }));
  }, [comments, unresolvedOnly]);

  async function post(parentId: string | null, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { data } = await supabase
      .from("comments")
      .insert({
        position_id: positionId,
        parent_id: parentId,
        author_id: userId,
        body: trimmed,
      })
      .select()
      .single();
    if (data) {
      setComments((prev) =>
        prev.some((c) => c.id === (data as Comment).id)
          ? prev
          : [...prev, data as Comment]
      );
    }
    if (!parentId) {
      setBody("");
      setTimeout(
        () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }),
        50
      );
    } else {
      setReplyTo(null);
    }
  }

  async function toggleResolved(c: Comment) {
    const next = !c.resolved;
    setComments((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, resolved: next } : x))
    );
    await supabase.from("comments").update({ resolved: next }).eq("id", c.id);
  }

  async function del(c: Comment) {
    if (!confirm("このコメントを削除しますか？")) return;
    setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    await supabase.from("comments").delete().eq("id", c.id);
  }

  const unresolvedCount = comments.filter(
    (c) => !c.parent_id && !c.resolved
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="text-sm font-medium text-sumi">
          コメント
          {unresolvedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-ai/10 px-1.5 py-0.5 text-xs text-ai">
              未解決 {unresolvedCount}
            </span>
          )}
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-sumi-soft">
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => setUnresolvedOnly(e.target.checked)}
          />
          未解決のみ
        </label>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {threads.length === 0 && (
          <p className="pt-6 text-center text-sm text-sumi-soft/60">
            {unresolvedOnly
              ? "未解決のコメントはありません。"
              : "まだコメントはありません。"}
          </p>
        )}
        {threads.map(({ root, replies }) => (
          <div
            key={root.id}
            className={clsx(
              "animate-fade-in rounded-lg border p-3",
              root.resolved
                ? "border-line bg-washi-2/30 opacity-70"
                : "border-line bg-washi-2/60"
            )}
          >
            <CommentBubble
              c={root}
              nameById={nameById}
              roleById={roleById}
              userId={userId}
              canResolve={isAuthor || root.author_id === userId}
              onToggleResolved={() => toggleResolved(root)}
              onDelete={() => del(root)}
            />

            {replies.map((r) => (
              <div key={r.id} className="mt-2 border-l-2 border-line pl-3">
                <CommentBubble
                  c={r}
                  nameById={nameById}
                  roleById={roleById}
                  userId={userId}
                  canResolve={false}
                  onDelete={() => del(r)}
                />
              </div>
            ))}

            {replyTo === root.id ? (
              <ReplyBox
                onCancel={() => setReplyTo(null)}
                onSend={(t) => post(root.id, t)}
              />
            ) : (
              <button
                onClick={() => setReplyTo(root.id)}
                className="mt-2 text-xs text-sumi-soft hover:text-ai"
              >
                返信する
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post(null, body);
          }}
          rows={2}
          placeholder="コメントを書く…（Ctrl+Enter で送信）"
          className="w-full resize-none rounded p-2 text-sm"
        />
        <div className="mt-1.5 flex justify-end">
          <button
            onClick={() => post(null, body)}
            disabled={!body.trim()}
            className="rounded bg-ai px-3 py-1.5 text-xs font-medium text-washi hover:bg-ai-soft disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentBubble({
  c,
  nameById,
  roleById,
  userId,
  canResolve,
  onToggleResolved,
  onDelete,
}: {
  c: Comment;
  nameById: Record<string, string>;
  roleById: Record<string, Role>;
  userId: string;
  canResolve: boolean;
  onToggleResolved?: () => void;
  onDelete?: () => void;
}) {
  const name = nameById[c.author_id] ?? "メンバー";
  const role = roleById[c.author_id];
  return (
    <div className="group">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-xs font-medium text-sumi">{name}</span>
        <span
          className={clsx(
            "rounded px-1 py-px text-[10px]",
            role === "author"
              ? "bg-ai/10 text-ai"
              : "bg-washi-2 text-sumi-soft"
          )}
        >
          {role === "author" ? "著者" : "編集者"}
        </span>
        <span className="text-[10px] text-sumi-soft/60">
          {formatTime(c.created_at)}
        </span>
        {c.resolved && (
          <span className="text-[10px] text-ok">✓ 解決済み</span>
        )}
        <span className="ml-auto flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onToggleResolved && canResolve && (
            <button
              onClick={onToggleResolved}
              className="text-[10px] text-sumi-soft hover:text-ok"
            >
              {c.resolved ? "戻す" : "解決"}
            </button>
          )}
          {onDelete && c.author_id === userId && (
            <button
              onClick={onDelete}
              className="text-[10px] text-sumi-soft hover:text-danger"
            >
              削除
            </button>
          )}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-sumi">{c.body}</p>
    </div>
  );
}

function ReplyBox({
  onSend,
  onCancel,
}: {
  onSend: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="返信…"
        className="w-full resize-none rounded p-2 text-sm"
      />
      <div className="mt-1 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-sumi-soft hover:text-sumi"
        >
          やめる
        </button>
        <button
          onClick={() => onSend(text)}
          disabled={!text.trim()}
          className="rounded bg-ai px-2.5 py-1 text-xs text-washi disabled:opacity-50"
        >
          返信
        </button>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db-client";
import type { Attachment } from "@/lib/types";

export function Attachments({
  positionId,
  canEdit,
}: {
  positionId: string;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = db();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("position_id", positionId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Attachment[];
    setItems(list);
    const entries = await Promise.all(
      list.map(async (a) => {
        const res = await fetch(
          `/api/attachments/url?path=${encodeURIComponent(a.storage_path)}`
        );
        const json = await res.json();
        return [a.id, json.url as string] as const;
      })
    );
    setUrls(Object.fromEntries(entries.filter(([, u]) => u)));
  }, [positionId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("positionId", positionId);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) load();
    else alert("画像のアップロードに失敗しました。");
  }

  async function remove(a: Attachment) {
    if (!confirm("この画像を削除しますか？")) return;
    await supabase.from("attachments").delete().eq("id", a.id);
    await fetch(
      `/api/attachments?path=${encodeURIComponent(a.storage_path)}`,
      { method: "DELETE" }
    );
    load();
  }

  if (items.length === 0 && !canEdit) return null;

  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium text-sumi-soft">添付画像</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <div key={a.id} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[a.id]}
              alt={a.caption || "添付"}
              className="h-24 w-24 rounded border border-line object-cover"
            />
            {canEdit && (
              <button
                onClick={() => remove(a)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white group-hover:flex"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-line text-xs text-sumi-soft hover:bg-washi-2 disabled:opacity-50"
          >
            {busy ? "送信中…" : "＋ 画像"}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </section>
  );
}

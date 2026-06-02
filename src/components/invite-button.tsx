"use client";

import { useState } from "react";
import { createInvite } from "@/app/invite-actions";

export function InviteButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const code = await createInvite(projectId);
      setLink(`${window.location.origin}/join?code=${code}`);
    } catch {
      setLink(null);
      alert("招待の作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          if (!link) generate();
        }}
        className="rounded border border-line px-2 py-1 text-xs text-sumi-soft hover:bg-washi-2"
      >
        ＋ 編集者を招待
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-line bg-washi p-5 shadow-xl">
            <h3 className="font-mincho text-lg text-sumi">編集者を招待する</h3>
            <p className="mt-1.5 text-sm text-sumi-soft">
              下のリンクを編集者さんに渡してください。リンクを開いて登録（またはログイン）すると、この本に参加できます。
            </p>

            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-sumi-soft">リンクを作成中…</p>
              ) : link ? (
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 rounded px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={copy}
                    className="shrink-0 rounded bg-ai px-3 py-1.5 text-xs text-washi hover:bg-ai-soft"
                  >
                    {copied ? "コピーしました" : "コピー"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={generate}
                  className="rounded border border-line px-3 py-1.5 text-sm"
                >
                  リンクを作る
                </button>
              )}
              <p className="mt-2 text-xs text-sumi-soft/70">
                このリンクは14日間ゆうこうです。
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded border border-line px-3 py-1.5 text-sm text-sumi-soft hover:bg-washi-2"
              >
                とじる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

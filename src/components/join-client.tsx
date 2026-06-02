"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/app/invite-actions";

export function JoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    setError(null);
    const res = await acceptInvite(code);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.projectId) {
      router.push(`/projects/${res.projectId}`);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-sumi-soft">
        この本に「編集者」として参加します。
      </p>
      <button
        onClick={join}
        disabled={loading}
        className="w-full rounded bg-ai px-4 py-2 text-sm text-washi hover:bg-ai-soft disabled:opacity-50"
      >
        {loading ? "参加しています…" : "参加する"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

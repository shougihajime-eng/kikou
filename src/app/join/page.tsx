import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JoinClient } from "@/components/join-client";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/join${code ? `?code=${code}` : ""}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="mb-8 block">
          <span className="font-mincho text-3xl tracking-wide text-sumi">棋稿</span>
        </Link>
        <div className="rounded-lg border border-line bg-washi-2/60 p-6 shadow-sm">
          <h1 className="font-mincho text-lg text-sumi">本への招待</h1>

          {!code ? (
            <p className="mt-3 text-sm text-danger">
              招待リンクが正しくありません。
            </p>
          ) : !user ? (
            <div className="mt-3 space-y-3 text-sm text-sumi-soft">
              <p>参加するには、まず登録（またはログイン）してください。</p>
              <div className="flex justify-center gap-2">
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="rounded bg-ai px-4 py-2 text-washi hover:bg-ai-soft"
                >
                  新規登録
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="rounded border border-line px-4 py-2 text-sumi hover:bg-washi-2"
                >
                  ログイン
                </Link>
              </div>
            </div>
          ) : (
            <JoinClient code={code} />
          )}
        </div>
      </div>
    </main>
  );
}

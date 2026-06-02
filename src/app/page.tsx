import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/projects");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-xs tracking-[0.3em] text-sumi-soft">KIKŌ</p>
      <h1 className="font-mincho text-5xl tracking-wide text-sumi sm:text-6xl">
        棋稿
      </h1>
      <p className="mt-6 max-w-md text-[15px] leading-7 text-sumi-soft">
        将棋の本をつくる、著者と編集者のための場所。
        <br />
        盤面・解説・やり取りが、いつも同じ局面にひもづく。
        <br />
        「どの図の話だっけ」を、なくす。
      </p>

      <div className="mt-10 flex gap-3">
        <LinkButton href="/signup">はじめる</LinkButton>
        <LinkButton href="/login" variant="ghost">
          ログイン
        </LinkButton>
      </div>

      <div className="mt-16 grid w-full max-w-lg gap-px overflow-hidden rounded-lg border border-line bg-line text-left sm:grid-cols-3">
        {[
          { t: "局面を組む", d: "駒を並べて、正しい棋譜の形で保存。" },
          { t: "解説を書く", d: "図ごとに解説。自動で保存される。" },
          { t: "その場で相談", d: "編集者のコメントがすぐ届く。" },
        ].map((f) => (
          <div key={f.t} className="bg-washi-2 p-5">
            <h2 className="text-sm font-medium text-sumi">{f.t}</h2>
            <p className="mt-1.5 text-xs leading-5 text-sumi-soft">{f.d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

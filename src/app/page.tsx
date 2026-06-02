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
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="animate-rise">
        <p className="mb-4 text-[11px] tracking-[0.5em] text-sumi-faint">
          K　I　K　Ō
        </p>
        <h1 className="relative inline-block font-mincho text-6xl leading-none text-sumi sm:text-7xl">
          棋稿
          <span className="absolute -right-5 -top-2 h-2.5 w-2.5 rounded-[2px] bg-shu/90 sm:-right-6" />
        </h1>
        <div className="mx-auto mt-7 h-px w-12 bg-line" />
        <p className="mx-auto mt-7 max-w-md text-[15px] leading-8 text-sumi-soft">
          将棋の本をつくる、著者と編集者のための場所。
          <br />
          盤面・解説・やり取りが、いつも同じ局面にひもづく。
          <br />
          「どの図の話だっけ」を、なくす。
        </p>
      </div>

      <div className="mt-10 flex gap-3">
        <LinkButton href="/signup">はじめる</LinkButton>
        <LinkButton href="/login" variant="ghost">
          ログイン
        </LinkButton>
      </div>

      <div className="mt-20 grid w-full max-w-lg gap-3 sm:grid-cols-3">
        {[
          { n: "一", t: "局面を組む", d: "駒を並べて、正しい棋譜の形で保存。" },
          { n: "二", t: "解説を書く", d: "図ごとに解説。自動で保存される。" },
          { n: "三", t: "その場で相談", d: "編集者のコメントがすぐ届く。" },
        ].map((f) => (
          <div
            key={f.t}
            className="rounded-lg border border-line-soft bg-washi-2/50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-sm"
          >
            <span className="font-mincho text-xs text-shu/80">{f.n}</span>
            <h2 className="mt-1 font-mincho text-[15px] text-sumi">{f.t}</h2>
            <p className="mt-1.5 text-xs leading-5 text-sumi-soft">{f.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-16 text-[11px] tracking-wide text-sumi-faint/70">
        将棋の表記は日本将棋連盟に準拠
      </p>
    </main>
  );
}

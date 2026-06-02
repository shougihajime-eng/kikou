import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext(next));

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mb-8 block text-center">
          <span className="font-mincho text-4xl tracking-wide text-sumi">棋稿</span>
          <span className="mt-1.5 block text-[11px] tracking-[0.3em] text-sumi-faint">きこう</span>
        </Link>
        <div className="rounded-xl border border-line-soft bg-washi-2/70 p-6 shadow-[0_12px_36px_-18px_rgba(60,40,10,0.4)]">
          <h1 className="mb-5 text-center text-base font-medium text-sumi">
            新規登録
          </h1>
          <AuthForm mode="signup" next={next} />
        </div>
      </div>
    </main>
  );
}

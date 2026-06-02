import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

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
  if (user) redirect(next || "/projects");

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <span className="font-mincho text-3xl tracking-wide text-sumi">棋稿</span>
          <span className="mt-1 block text-xs text-sumi-soft">きこう</span>
        </Link>
        <div className="rounded-lg border border-line bg-washi-2/60 p-6 shadow-sm">
          <h1 className="mb-5 text-center text-base font-medium text-sumi">
            新規登録
          </h1>
          <AuthForm mode="signup" next={next} />
        </div>
      </div>
    </main>
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバコンポーネント / Server Action / Route Handler 用。スキーマ kikou 固定。
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "kikou" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの set は無視（middleware がセッションを更新する）
          }
        },
      },
    }
  );
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role を使うサーバ専用クライアント。RLS を超える操作（メンバー追加・招待消費）に限定。
// 絶対にクライアントへ渡さないこと（このファイルは server only）。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "kikou" },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

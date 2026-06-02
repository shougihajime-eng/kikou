"use client";

import { createBrowserClient } from "@supabase/ssr";

// ブラウザ用 Supabase クライアント。スキーマは必ず kikou に固定。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "kikou" } }
  );
}

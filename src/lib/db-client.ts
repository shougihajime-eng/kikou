"use client";

import { createClient } from "@/lib/supabase/client";

let _client: ReturnType<typeof createClient> | null = null;

// ブラウザ用 Supabase クライアントを使い回す（スキーマ kikou 固定）。
export function db() {
  if (!_client) _client = createClient();
  return _client;
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/app/auth-actions";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

function makeCode(): string {
  // ハイフン無しの英数。読み取りやすさのため24文字。
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "");
  return (a + b).slice(0, 24);
}

/** 著者が編集者用の招待コードを発行。コード文字列を返す。 */
export async function createInvite(projectId: string): Promise<string> {
  const user = await currentUser();
  const supabase = await createClient();
  const { data: me } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (me?.role !== "author") throw new Error("著者のみ招待できます");

  const code = makeCode();
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);

  const admin = createAdminClient();
  const { error } = await admin.from("invites").insert({
    code,
    project_id: projectId,
    role: "editor",
    created_by: user.id,
    expires_at: expires.toISOString(),
  });
  if (error) throw new Error("招待の作成に失敗しました");
  return code;
}

export interface JoinResult {
  error?: string;
  projectId?: string;
}

/** 招待コードでプロジェクトに参加。 */
export async function acceptInvite(code: string): Promise<JoinResult> {
  const user = await currentUser();
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!invite) return { error: "招待リンクが正しくありません。" };
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return { error: "この招待リンクは期限切れです。著者に再発行を頼んでください。" };

  // すでにメンバーなら、そのまま入れる
  const { data: existing } = await admin
    .from("project_members")
    .select("project_id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await ensureProfile(user.id, user.user_metadata?.display_name);
    const { error: memErr } = await admin.from("project_members").insert({
      project_id: invite.project_id,
      user_id: user.id,
      role: invite.role,
    });
    if (memErr) return { error: "参加に失敗しました。" };
    await admin
      .from("invites")
      .update({ consumed_by: user.id, consumed_at: new Date().toISOString() })
      .eq("code", code);
  }

  return { projectId: invite.project_id };
}

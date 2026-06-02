"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  error?: string;
}

/** ログイン（メール＋合言葉）。 */
export async function signIn(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/projects");

  if (!email || !password) return { error: "メールと合言葉を入れてください。" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: "メールか合言葉が違います。" };

  await ensureProfile(data.user.id, data.user.user_metadata?.display_name);
  redirect(next || "/projects");
}

/** 新規登録（表示名・メール・合言葉）。確認メール不要で即ログイン。 */
export async function signUp(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/projects");

  if (!displayName) return { error: "お名前を入れてください。" };
  if (!email) return { error: "メールを入れてください。" };
  if (password.length < 6) return { error: "合言葉は6文字以上にしてください。" };

  const admin = createAdminClient();
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.includes("registered"))
      return { error: "このメールはすでに登録されています。ログインしてください。" };
    return { error: "登録に失敗しました。時間をおいて試してください。" };
  }

  await ensureProfile(created.user.id, displayName);

  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) return { error: "登録はできましたが、ログインに失敗しました。" };

  redirect(next || "/projects");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** kikou.profiles に行を遅延作成（共有 auth.users にトリガーを付けない方針）。 */
export async function ensureProfile(userId: string, displayName?: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;
  await admin.from("profiles").insert({
    id: userId,
    display_name: displayName?.trim() || "名無し",
  });
}

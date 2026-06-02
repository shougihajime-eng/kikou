"use server";

import { revalidatePath } from "next/cache";
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

/** 新しい本（プロジェクト）を作る。著者メンバーも同時に作る（service_role）。 */
export async function createProject(formData: FormData) {
  const user = await currentUser();
  const title = String(formData.get("title") ?? "").trim() || "無題の本";
  await ensureProfile(user.id, user.user_metadata?.display_name);

  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("projects")
    .insert({ title, owner_id: user.id })
    .select()
    .single();
  if (error || !project) throw new Error("本の作成に失敗しました");

  await admin
    .from("project_members")
    .insert({ project_id: project.id, user_id: user.id, role: "author" });

  // 最初の章と局面も用意しておく（すぐ使えるように）
  const { data: chapter } = await admin
    .from("chapters")
    .insert({ project_id: project.id, title: "第一章", sort_order: 0 })
    .select()
    .single();
  if (chapter) {
    await admin
      .from("positions")
      .insert({ chapter_id: chapter.id, title: "図1", sort_order: 0 });
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function renameProject(projectId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ title: title.trim() || "無題の本" })
    .eq("id", projectId);
  if (error) throw new Error("名前の変更に失敗しました");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function archiveProject(projectId: string) {
  const supabase = await createClient();
  await supabase.from("projects").update({ archived: true }).eq("id", projectId);
  revalidatePath("/projects");
  redirect("/projects");
}

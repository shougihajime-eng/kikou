import { redirect } from "next/navigation";
import { requireUser, getMyRole, getMyDisplayName } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace/Workspace";
import type { Chapter, Position, Project, Profile, Role } from "@/lib/types";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const role = await getMyRole(id, user.id);
  if (!role) redirect("/projects");

  const displayName = await getMyDisplayName(user.id);
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) redirect("/projects");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: positions } = chapterIds.length
    ? await supabase
        .from("positions")
        .select("*")
        .in("chapter_id", chapterIds)
        .order("sort_order", { ascending: true })
    : { data: [] as Position[] };

  // メンバーと表示名
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", id);
  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("*").in("id", memberIds)
    : { data: [] as Profile[] };

  const nameById: Record<string, string> = {};
  const roleById: Record<string, Role> = {};
  (profiles ?? []).forEach((p) => (nameById[p.id] = p.display_name));
  (members ?? []).forEach((m) => (roleById[m.user_id] = m.role as Role));

  return (
    <Workspace
      project={project as Project}
      role={role}
      userId={user.id}
      myName={displayName}
      initialChapters={(chapters ?? []) as Chapter[]}
      initialPositions={(positions ?? []) as Position[]}
      nameById={nameById}
      roleById={roleById}
    />
  );
}

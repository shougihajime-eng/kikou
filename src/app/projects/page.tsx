import Link from "next/link";
import { requireUser, getMyDisplayName } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { NewProjectForm } from "@/components/new-project-form";
import type { Project, Role } from "@/lib/types";

export default async function ProjectsPage() {
  const user = await requireUser();
  const displayName = await getMyDisplayName(user.id);
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  // 各本での自分の役割
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", user.id);
  const roleOf = new Map<string, Role>(
    (memberships ?? []).map((m) => [m.project_id, m.role as Role])
  );

  const list = (projects ?? []) as Project[];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-mincho text-2xl text-sumi">本だな</h1>
            <p className="mt-1 text-xs text-sumi-faint">
              {list.length > 0 ? `${list.length} 冊` : "あなたの本の一覧"}
            </p>
          </div>
        </div>

        <NewProjectForm />

        {list.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-line bg-washi-2/40 p-8 text-center text-sm text-sumi-soft">
            まだ本がありません。上の「新しい本をつくる」からはじめましょう。
          </p>
        ) : (
          <ul className="mt-6 space-y-2.5">
            {list.map((p) => {
              const role = roleOf.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex items-stretch overflow-hidden rounded-lg border border-line-soft bg-washi-2/50 transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-md"
                  >
                    <span className="w-1.5 shrink-0 bg-ai/70 transition-colors group-hover:bg-ai" />
                    <span className="flex flex-1 items-center justify-between px-5 py-4">
                      <span className="font-mincho text-lg text-sumi">
                        {p.title}
                      </span>
                      <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-sumi-soft">
                        {role === "author" ? "著者" : role === "editor" ? "編集者" : "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

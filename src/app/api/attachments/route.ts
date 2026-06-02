import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "kikou";

// 局面が「自分の見えるプロジェクト」に属するか（RLS 経由で確認）。
async function assertMember(positionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };
  const { data } = await supabase
    .from("positions")
    .select("id")
    .eq("id", positionId)
    .maybeSingle();
  if (!data) return { error: "forbidden" as const };
  return { user };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const positionId = String(form.get("positionId") ?? "");
  if (!(file instanceof File) || !positionId)
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const auth = await assertMember(positionId);
  if (auth.error)
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "unauthorized" ? 401 : 403 }
    );

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60);
  const path = `${positionId}/${crypto.randomUUID()}_${safeName}`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/png" });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: insErr } = await admin.from("attachments").insert({
    position_id: positionId,
    storage_path: path,
    uploaded_by: auth.user.id,
  });
  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "no path" }, { status: 400 });
  const positionId = path.split("/")[0];
  const auth = await assertMember(positionId);
  if (auth.error)
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "unauthorized" ? 401 : 403 }
    );

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
  return NextResponse.json({ ok: true });
}

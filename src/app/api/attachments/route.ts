import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "kikou";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const positionId = String(form.get("positionId") ?? "");
  if (!(file instanceof File) || !positionId)
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  // 種類・サイズの検証（クライアントの accept は信用しない）
  if (!ALLOWED.has(file.type))
    return NextResponse.json(
      { error: "画像（PNG/JPEG/WebP/GIF）のみ対応しています" },
      { status: 415 }
    );
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "画像が大きすぎます（8MBまで）" },
      { status: 413 }
    );

  // この局面が自分に見えるか（RLS）＝メンバー確認
  const { data: pos } = await supabase
    .from("positions")
    .select("id")
    .eq("id", positionId)
    .maybeSingle();
  if (!pos) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60);
  const path = `${positionId}/${crypto.randomUUID()}_${safeName}`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: insErr } = await admin.from("attachments").insert({
    position_id: positionId,
    storage_path: path,
    uploaded_by: user.id,
  });
  if (insErr) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}

/** DELETE /api/attachments?id=<attachmentId> — 自分の添付のみ削除（行と実体を両方）。 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS により「自分が見える添付」のみ取得。所有者のみ削除可。
  const { data: row } = await supabase
    .from("attachments")
    .select("id, storage_path, uploaded_by")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (row.uploaded_by !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([row.storage_path]);
  await admin.from("attachments").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Upload generik ke bucket 'program-files'. Dipakai untuk:
// - surat program (PDF) oleh RMDM/MDM
// - excel realisasi, scan tanda terima, foto aktivitas oleh MDS
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "misc";

  if (!file) {
    return NextResponse.json({ ok: false, error: "file wajib diisi" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const path = `${folder}/${user.id}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("program-files")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("program-files").getPublicUrl(path);

  return NextResponse.json({ ok: true, url: pub.publicUrl, path });
}

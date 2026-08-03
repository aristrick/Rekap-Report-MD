import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Membuat user baru + mengundang lewat email (Supabase Auth invite).
// Hanya boleh dipanggil oleh mdm, rmdm (untuk wilayahnya), atau mds (untuk admin/tl-nya).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role, region_id, territory_id, id")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["mdm", "rmdm", "mds"].includes(actorProfile.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, full_name, role, region_id, territory_id } = body;

  // Batasi role yang boleh dibuat sesuai posisi pembuat, dan kunci scope-nya
  if (actorProfile.role === "rmdm" && !["mds"].includes(role)) {
    return NextResponse.json({ ok: false, error: "RMDM hanya boleh membuat akun MDS" }, { status: 403 });
  }
  if (actorProfile.role === "mds" && !["admin", "tl"].includes(role)) {
    return NextResponse.json({ ok: false, error: "MDS hanya boleh membuat akun Admin/TL" }, { status: 403 });
  }

  const finalRegionId = actorProfile.role === "mdm" ? region_id : actorProfile.region_id;
  const finalTerritoryId = actorProfile.role === "mdm" ? territory_id : actorProfile.role === "rmdm" ? territory_id : actorProfile.territory_id;

  const admin = createServiceRoleClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);

  if (inviteErr || !invited.user) {
    return NextResponse.json({ ok: false, error: inviteErr?.message ?? "Gagal mengundang user" }, { status: 500 });
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: invited.user.id,
    full_name,
    role,
    region_id: finalRegionId,
    territory_id: finalTerritoryId,
    supervisor_id: actorProfile.role === "mds" ? actorProfile.id : null,
  });

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

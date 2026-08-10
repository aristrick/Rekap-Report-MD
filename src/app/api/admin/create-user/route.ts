import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Membuat akun baru LANGSUNG dengan email + password (bukan sistem undangan),
// supaya RMDM/MDS bisa langsung login begitu akunnya dibuat oleh atasannya.
// Hanya boleh dipanggil oleh mdm (buat RMDM/MDS) atau rmdm (buat MDS di regionnya).
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
  const { email, password, full_name, role, region_id, territory_id } = body;

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ ok: false, error: "Email wajib diisi, password minimal 6 karakter" }, { status: 400 });
  }

  // Batasi role yang boleh dibuat sesuai posisi pembuat
  if (actorProfile.role === "mdm" && !["rmdm", "mds"].includes(role)) {
    return NextResponse.json({ ok: false, error: "MDM hanya boleh membuat akun RMDM atau MDS" }, { status: 403 });
  }
  if (actorProfile.role === "rmdm" && role !== "mds") {
    return NextResponse.json({ ok: false, error: "RMDM hanya boleh membuat akun MDS" }, { status: 403 });
  }
  if (actorProfile.role === "mds" && !["admin", "tl"].includes(role)) {
    return NextResponse.json({ ok: false, error: "MDS hanya boleh membuat akun Admin atau Team Leader" }, { status: 403 });
  }

  // RMDM hanya boleh membuat MDS di regionnya sendiri; MDS mewariskan wilayah & region-nya sendiri ke Admin/TL
  const finalRegionId = actorProfile.role === "mdm" ? region_id : actorProfile.region_id;
  const finalTerritoryId = actorProfile.role === "mds" ? actorProfile.territory_id : territory_id;

  const admin = createServiceRoleClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return NextResponse.json({ ok: false, error: createErr?.message ?? "Gagal membuat akun" }, { status: 500 });
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name,
    email,
    role,
    region_id: finalRegionId,
    territory_id: role === "mds" || role === "admin" || role === "tl" ? finalTerritoryId : null,
    supervisor_id: actorProfile.role === "mds" ? actorProfile.id : null,
  });

  if (profileErr) {
    // Rollback: hapus auth user kalau insert profile gagal, supaya tidak ada akun "yatim"
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}

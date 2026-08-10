import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

async function getActor(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, region_id")
    .eq("id", user.id)
    .single();
  return profile;
}

async function canManage(actor: any, target: any) {
  if (!actor) return false;
  if (actor.role === "mdm") return true;
  if (actor.role === "rmdm" && target.role === "mds" && target.region_id === actor.region_id) return true;
  return false;
}

// Update nama, wilayah, atau status aktif akun
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const actor = await getActor(supabase);
  if (!actor) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: target } = await admin.from("profiles").select("id, role, region_id").eq("id", params.id).single();
  if (!target || !(await canManage(actor, target))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, any> = {};
  if (typeof body.full_name === "string") updates.full_name = body.full_name;
  if (typeof body.territory_id === "string") updates.territory_id = body.territory_id;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.password === "string" && body.password.length >= 6) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(params.id, { password: body.password });
    if (pwErr) return NextResponse.json({ ok: false, error: pwErr.message }, { status: 500 });
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("profiles").update(updates).eq("id", params.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Hapus akun sepenuhnya (auth user + profile, lewat cascade)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const actor = await getActor(supabase);
  if (!actor) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: target } = await admin.from("profiles").select("id, role, region_id").eq("id", params.id).single();
  if (!target || !(await canManage(actor, target))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

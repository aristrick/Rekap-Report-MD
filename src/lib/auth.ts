import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Dipanggil di awal Server Component halaman yang butuh login.
// Mengembalikan profile lengkap + redirect ke /login kalau belum login.
export async function requireProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id, full_name, role, region_id, territory_id, supervisor_id, is_active,
      regions ( id, code, name ),
      territories ( id, code, name )
    `)
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");
  if (!profile.is_active) redirect("/login?nonaktif=1");

  return profile;
}

// Dipanggil di halaman yang hanya boleh diakses role tertentu, contoh:
// const profile = await requireRole(["mdm", "rmdm"]);
export async function requireRole(allowed: string[]) {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) {
    redirect("/dashboard?forbidden=1");
  }
  return profile;
}

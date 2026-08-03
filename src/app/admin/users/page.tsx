import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import InviteUserForm from "@/components/InviteUserForm";

export default async function AdminUsersPage() {
  const profile = await requireRole(["mdm", "rmdm", "mds"]);
  const supabase = createClient();

  const { data: regions } = await supabase.from("regions").select("id, name").order("name");
  const { data: territories } = await supabase.from("territories").select("id, name, region_id").order("name");
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, regions(name), territories(name)")
    .order("full_name");

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-5 py-8 grid md:grid-cols-[1fr_320px] gap-8">
        <section>
          <p className="label-eyebrow mb-1">Struktur Organisasi</p>
          <h1 className="font-display text-2xl font-bold mb-6">Anggota Tim</h1>
          <div className="card divide-y divide-base-line">
            {(users ?? []).map((u: any) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{u.full_name}</p>
                  <p className="text-xs text-ink-dim font-mono">
                    {u.role.toUpperCase()} · {u.territories?.name ?? u.regions?.name ?? "Semua wilayah"}
                  </p>
                </div>
                {!u.is_active && <span className="status-pill status-rejected">nonaktif</span>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold mb-3">Undang Anggota Baru</h2>
          <InviteUserForm role={profile.role as any} regions={regions ?? []} territories={territories ?? []} />
        </section>
      </main>
    </div>
  );
}

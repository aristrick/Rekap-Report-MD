import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import AddSubordinateForm from "@/components/AddSubordinateForm";
import SubordinateList from "@/components/SubordinateList";

export default async function AdminUsersPage() {
  const profile = await requireRole(["mds"]);
  const supabase = createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("supervisor_id", profile.id)
    .order("full_name");

  return (
    <AppShell profile={profile}>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <div>
          <p className="label-eyebrow mb-1">Wilayah {(profile as any).territories?.name}</p>
          <h1 className="font-display text-2xl font-bold">Anggota Tim (Admin & TL)</h1>
          <p className="text-ink-dim text-sm mt-1">
            Admin dan Team Leader yang kamu buat di sini otomatis mengikuti wilayah kamu.
          </p>
        </div>

        <section>
          <h2 className="font-display font-semibold mb-3">Tambah Anggota Baru</h2>
          <AddSubordinateForm role="mds" />
        </section>

        <section>
          <h2 className="font-display font-semibold mb-3">Daftar Anggota</h2>
          <SubordinateList members={(members ?? []) as any} />
        </section>
      </div>
    </AppShell>
  );
}

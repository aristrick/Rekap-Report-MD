import Link from "next/link";
import LogoutButton from "./LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  mdm: "MDM · Manager Nasional",
  rmdm: "RMDM · Region Manager",
  mds: "MDS",
  admin: "Admin",
  tl: "Team Leader",
};

export default function Navbar({ profile }: { profile: any }) {
  const scope =
    profile.role === "mdm"
      ? "Semua wilayah"
      : profile.role === "rmdm"
      ? profile.regions?.name ?? "-"
      : profile.territories?.name ?? "-";

  const canManage = profile.role === "mdm" || profile.role === "rmdm";

  return (
    <header className="border-b border-base-line">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-display font-bold text-lg tracking-tight">
            Rekap<span className="text-signal-amber">Report MD</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-dim">
            <Link href="/dashboard" className="hover:text-ink transition">Dashboard</Link>
            <Link href="/reports" className="hover:text-ink transition">Laporan Bulanan</Link>
            <Link href="/programs" className="hover:text-ink transition">Program</Link>
            {canManage && (
              <Link href="/admin/regions" className="hover:text-ink transition">Kelola Wilayah</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm">{profile.full_name}</p>
            <p className="text-xs text-ink-dim font-mono">{ROLE_LABEL[profile.role]} · {scope}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

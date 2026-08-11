"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ConfirmButton from "./ConfirmButton";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABEL: Record<string, string> = {
  mdm: "MDM · Manager Nasional",
  rmdm: "RMDM · Region Manager",
  mds: "MDS",
  admin: "Admin",
  tl: "Team Leader",
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M9 2h6l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
          <path d="M9 12h6M9 16h6M9 8h2" />
        </svg>
      );
    case "programs":
      return (
        <svg {...common}>
          <path d="M20 7h-3a2 2 0 01-2-2V2" /><path d="M9 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" />
          <path d="M9 13l2 2 4-4" />
        </svg>
      );
    case "rmdm":
      return (
        <svg {...common}>
          <circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
          <path d="M17 8l2 2 3-3" />
        </svg>
      );
    case "mds":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common}>
          <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case "logout":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const scope =
    profile.role === "mdm"
      ? "Semua wilayah"
      : profile.role === "rmdm"
      ? profile.regions?.name ?? "-"
      : profile.territories?.name ?? "-";

  const canManage = profile.role === "mdm" || profile.role === "rmdm";

  const menu = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", show: true },
    { href: "/reports", label: "Laporan Bulanan", icon: "reports", show: true },
    { href: "/programs", label: "Program", icon: "programs", show: true },
    { href: "/admin/regions", label: "Region & Wilayah", icon: "map", show: profile.role === "mdm" },
    { href: "/admin/rmdm", label: "Kelola RMDM", icon: "rmdm", show: profile.role === "mdm" },
    { href: "/admin/mds", label: "Kelola MDS", icon: "mds", show: canManage },
    { href: "/admin/telegram", label: "Group Telegram", icon: "telegram", show: canManage },
    { href: "/admin/users", label: "Anggota Tim", icon: "mds", show: profile.role === "mds" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("rekap_session_active");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 border-r border-base-line h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-base-line">
        <Link href="/dashboard" className="font-display font-bold text-lg tracking-tight">
          Rekap<span className="text-signal-amber">Report MD</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          if (!item.show) return null;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                active
                  ? "bg-signal-amber/15 text-signal-amber"
                  : "text-ink-dim hover:text-ink hover:bg-base-panel"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-base-line">
        <p className="text-sm truncate">{profile.full_name}</p>
        <p className="text-xs text-ink-dim font-mono truncate mb-3">{ROLE_LABEL[profile.role]} · {scope}</p>
        <ConfirmButton
          title="Keluar dari akun?"
          description="Kamu perlu login lagi untuk mengakses aplikasi ini."
          confirmLabel="Ya, keluar"
          variant="danger"
          onConfirm={handleLogout}
          className="flex items-center gap-2 text-sm text-ink-dim hover:text-signal-red transition"
        >
          <Icon name="logout" /> Keluar
        </ConfirmButton>
      </div>
    </aside>
  );
}

import Sidebar from "./Sidebar";
import SessionGuard from "./SessionGuard";

export default function AppShell({ profile, children }: { profile: any; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SessionGuard />
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}

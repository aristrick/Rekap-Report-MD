import Sidebar from "./Sidebar";
import SessionGuard from "./SessionGuard";
import NotificationBell from "./NotificationBell";

export default function AppShell({ profile, children }: { profile: any; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SessionGuard />
      <Sidebar profile={profile} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-end px-5 py-2.5 border-b border-base-line bg-base/90 backdrop-blur">
          <NotificationBell />
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

import Sidebar from "./Sidebar";

export default function AppShell({ profile, children }: { profile: any; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import { roleLabel, type UserRole } from "@/lib/auth";
import { navigationByRole } from "@/lib/navigation";
import { SidebarNav } from "./sidebar-nav";

type AppShellProps = {
  role: UserRole;
  userName: string;
  children: ReactNode;
};

export function AppShell({ role, userName, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[270px_minmax(0,1fr)] lg:px-8">
        <aside className="panel h-fit p-5 lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Arkali Solutions
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">LMS Core</h1>
          <p className="chip mt-4">{roleLabel(role)}</p>
          <p className="mt-2 text-sm text-slate-600">{userName}</p>

          <SidebarNav items={navigationByRole[role]} />

          <form action={signOutAction} className="mt-6">
            <button
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              type="submit"
            >
              Logout
            </button>
          </form>
        </aside>

        <div className="space-y-4">
          <header className="panel flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-sm text-slate-600">Institution Command Center</p>
              <p className="text-lg font-semibold">
                Role-aware workspace for daily operations
              </p>
            </div>
            <div className="chip">Live Session: Academic Year 2026</div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

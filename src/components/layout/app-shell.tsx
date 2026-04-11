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
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:px-8">
        <aside className="panel-strong h-fit p-5 lg:sticky lg:top-6">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
              <p className="eyebrow">Arkali Solutions</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                LMS Core
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                One command surface for academics, finance, and day-to-day
                institutional operations.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="chip">{roleLabel(role)}</span>
                <span className="chip">Academic Year 2026</span>
              </div>

              <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--accent-soft)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active identity
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {userName}
                </p>
              </div>
            </div>

            <SidebarNav items={navigationByRole[role]} />

            <form action={signOutAction}>
              <button className="button-secondary w-full" type="submit">
                Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="space-y-5">
          <header className="panel-strong flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <div>
              <p className="eyebrow">Institution command center</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Role-aware workspace for daily execution
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                The portal is organized around the current user role, but every
                area is built to scale from simple record keeping into full LMS
                operations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="chip">Live session</span>
              <span className="chip">Academic year 2026</span>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

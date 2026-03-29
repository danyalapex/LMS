import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireIdentity } from "@/lib/auth";

type PortalLayoutProps = {
  children: ReactNode;
};

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const identity = await requireIdentity();

  return (
    <AppShell role={identity.primaryRole} userName={identity.fullName}>
      {children}
    </AppShell>
  );
}

import dynamic from "next/dynamic";
const PayrollWorkspace = dynamic(
  () => import("@/components/admin/payroll-workspace").then((m) => m.PayrollWorkspace),
  { loading: () => <div className="min-h-[200px] p-6">Loading payroll…</div> },
);
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  getOrganizationFeeSettings,
  listPayrollCyclesWithEntries,
  listStaffProfiles,
} from "@/lib/lms/queries";

export default async function AdminPayrollPage() {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const [{ cycles, entries }, staff, feeSettings] = await Promise.all([
    listPayrollCyclesWithEntries(),
    listStaffProfiles(),
    getOrganizationFeeSettings(identity.organizationId),
  ]);

  return (
    <PayrollWorkspace
      cycles={cycles}
      entries={entries}
      staff={staff}
      currencyCode={feeSettings.currency_code}
    />
  );
}

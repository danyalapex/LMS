import dynamic from "next/dynamic";
const FeesWorkspace = dynamic(
  () => import("@/components/admin/fees-workspace").then((m) => m.FeesWorkspace),
  { loading: () => <div className="min-h-[200px] p-6">Loading fees…</div> },
);
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  getOrganizationFeeSettings,
  listFeeInvoices,
  listFeePayments,
  listFeePlans,
  listOrganizationPaymentMethods,
  listStudents,
} from "@/lib/lms/queries";

export default async function AdminFeesPage() {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const [students, feePlans, feeInvoices, feePayments, feeSettings, paymentMethods] =
    await Promise.all([
      listStudents(),
      listFeePlans(),
      listFeeInvoices(),
      listFeePayments(),
      getOrganizationFeeSettings(identity.organizationId),
      listOrganizationPaymentMethods(identity.organizationId),
    ]);

  return (
    <FeesWorkspace
      students={students}
      feePlans={feePlans}
      feeInvoices={feeInvoices}
      feePayments={feePayments}
      feeSettings={feeSettings}
      paymentMethods={paymentMethods}
    />
  );
}

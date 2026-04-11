import dynamic from "next/dynamic";
const StaffWorkspace = dynamic(
  () => import("@/components/admin/staff-workspace").then((m) => m.StaffWorkspace),
  { loading: () => <div className="min-h-[200px] p-6">Loading staff…</div> },
);
import { requireRole } from "@/lib/auth";
import { listStaffProfiles } from "@/lib/lms/queries";

export default async function AdminStaffPage() {
  await requireRole(["admin"]);
  const staff = await listStaffProfiles();

  return <StaffWorkspace staff={staff} />;
}

import dynamic from "next/dynamic";
const StudentsWorkspace = dynamic(
  () => import("@/components/admin/students-workspace").then((m) => m.StudentsWorkspace),
  { loading: () => <div className="min-h-[200px] p-6">Loading students…</div> },
);
import { requireRole } from "@/lib/auth";
import { listStudents } from "@/lib/lms/queries";

export default async function AdminStudentsPage() {
  await requireRole(["admin"]);
  const students = await listStudents();

  return <StudentsWorkspace students={students} />;
}

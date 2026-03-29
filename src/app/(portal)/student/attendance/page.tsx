import { requireIdentity, requireRole } from "@/lib/auth";
import { listStudentAttendance } from "@/lib/lms/queries";

export default async function StudentAttendancePage() {
  await requireRole(["student", "guardian"]);
  const identity = await requireIdentity();

  const attendance = await listStudentAttendance(identity.authUserId);

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">My Attendance Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3">{entry.session_date}</td>
                  <td className="px-5 py-3">{entry.period_label}</td>
                  <td className="px-5 py-3">{entry.course_code}</td>
                  <td className="px-5 py-3 font-semibold capitalize">{entry.state}</td>
                  <td className="px-5 py-3">{entry.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

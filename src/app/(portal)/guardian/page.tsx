import { requireIdentity, requireRole } from "@/lib/auth";
import {
  listGuardianStudentSummaries,
  listGuardianStudents,
} from "@/lib/lms/queries";

export default async function GuardianPage() {
  await requireRole(["guardian"]);
  const identity = await requireIdentity();

  const linkedStudents = await listGuardianStudents(identity.authUserId);
  const summaries = await listGuardianStudentSummaries(
    linkedStudents.map((student) => student.student_id),
  );

  const summaryMap = new Map(
    summaries.map((summary) => [summary.student_id, summary]),
  );

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Guardian Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Linked student performance and attendance visibility.
        </p>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Linked Students</h2>
        </div>

        {linkedStudents.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">
            No linked students yet. Ask an administrator to map your guardian account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100/80 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Relation</th>
                  <th className="px-5 py-3">Grades Recorded</th>
                  <th className="px-5 py-3">Attendance Entries</th>
                </tr>
              </thead>
              <tbody>
                {linkedStudents.map((student) => {
                  const summary = summaryMap.get(student.student_id);

                  return (
                    <tr key={student.student_id} className="border-t border-[color:var(--border)]">
                      <td className="px-5 py-3 font-semibold">{student.student_name}</td>
                      <td className="px-5 py-3">{student.student_code}</td>
                      <td className="px-5 py-3">{student.relation}</td>
                      <td className="px-5 py-3">{summary?.grade_count ?? 0}</td>
                      <td className="px-5 py-3">{summary?.attendance_count ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

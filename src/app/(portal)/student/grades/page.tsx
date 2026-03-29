import { requireIdentity, requireRole } from "@/lib/auth";
import { listStudentGradebook } from "@/lib/lms/queries";

export default async function StudentGradesPage() {
  await requireRole(["student", "guardian"]);
  const identity = await requireIdentity();

  const grades = await listStudentGradebook(identity.authUserId);

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">My Gradebook</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Assignment</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Feedback</th>
                <th className="px-5 py-3">Graded At</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{entry.assignment_title}</td>
                  <td className="px-5 py-3">{entry.course_code}</td>
                  <td className="px-5 py-3">
                    {entry.score}/{entry.assignment_max_score}
                  </td>
                  <td className="px-5 py-3">{entry.feedback || "-"}</td>
                  <td className="px-5 py-3">{new Date(entry.graded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

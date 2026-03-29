import { submitAssignmentAction } from "@/app/actions/lms";
import { requireIdentity, requireRole } from "@/lib/auth";
import { listStudentAssignments } from "@/lib/lms/queries";

function statusLabel(status: "pending" | "submitted" | "overdue" | "graded") {
  if (status === "graded") return "Graded";
  if (status === "submitted") return "Submitted";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

export default async function StudentAssignmentsPage() {
  await requireRole(["student"]);
  const identity = await requireIdentity();

  const assignments = await listStudentAssignments(identity.authUserId);
  const submittableAssignments = assignments.filter((row) => row.status !== "graded");

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <article className="panel p-5">
          <h2 className="section-heading">Submit Assignment</h2>
          <form action={submitAssignmentAction} className="mt-4 space-y-2">
            <select
              name="assignment_id"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              <option value="">Select assignment</option>
              {submittableAssignments.map((assignment) => (
                <option key={assignment.assignment_id} value={assignment.assignment_id}>
                  {assignment.assignment_title} ({assignment.course_code})
                </option>
              ))}
            </select>
            <textarea
              name="content"
              rows={5}
              placeholder="Write your submission notes or answer..."
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <input
              name="attachment_url"
              placeholder="Attachment URL (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Submit Work
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">Submission Guidance</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Use this space to submit text responses or share a file link from Drive/OneDrive.</p>
            <p>You can resubmit before grading; the latest submission timestamp is recorded.</p>
            <p>After your teacher grades the assignment, your score appears in My Grades.</p>
          </div>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">My Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Assignment</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} className="border-t border-[color:var(--border)] align-top">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{assignment.assignment_title}</p>
                    <p className="text-xs text-slate-600">{assignment.assignment_details || "-"}</p>
                  </td>
                  <td className="px-5 py-3">{assignment.course_code}</td>
                  <td className="px-5 py-3">
                    {assignment.assignment_due_at
                      ? new Date(assignment.assignment_due_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-5 py-3">{statusLabel(assignment.status)}</td>
                  <td className="px-5 py-3">
                    {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-5 py-3">
                    {assignment.grade_score !== null
                      ? `${assignment.grade_score}/${assignment.assignment_max_score}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

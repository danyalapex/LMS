import { recordGradeAction } from "@/app/actions/lms";
import { requireIdentity, requireRole } from "@/lib/auth";
import { listTeacherSubmissionQueue } from "@/lib/lms/queries";

export default async function TeacherSubmissionsPage() {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const submissions = await listTeacherSubmissionQueue(identity.authUserId);
  const ungradedCount = submissions.filter((row) => row.grade_score === null).length;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="section-heading">Submission Queue</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
              <p className="text-xs text-slate-500">Total submissions</p>
              <p className="text-2xl font-bold text-slate-900">{submissions.length}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
              <p className="text-xs text-slate-500">Awaiting grading</p>
              <p className="text-2xl font-bold text-slate-900">{ungradedCount}</p>
            </div>
          </div>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">How to use</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>Review submissions line by line and enter the score using each row form.</p>
            <p>Scores are validated against assignment max score and saved to the gradebook.</p>
            <p>Re-submitting a row updates the existing grade and keeps the latest feedback.</p>
          </div>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Student Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Assignment</th>
                <th className="px-5 py-3">Submission</th>
                <th className="px-5 py-3">Submitted At</th>
                <th className="px-5 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.submission_id} className="border-t border-[color:var(--border)] align-top">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{submission.student_name}</p>
                    <p className="text-xs text-slate-600">{submission.student_code}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{submission.assignment_title}</p>
                    <p className="text-xs text-slate-600">
                      {submission.course_code} | Max {submission.assignment_max_score}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="max-w-sm whitespace-pre-wrap text-xs text-slate-700">
                      {submission.submission_content || "-"}
                    </p>
                    {submission.submission_attachment_url ? (
                      <a
                        href={submission.submission_attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-slate-700 underline"
                      >
                        Open attachment
                      </a>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">
                    {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-5 py-3">
                    <form action={recordGradeAction} className="space-y-2">
                      <input type="hidden" name="assignment_id" value={submission.assignment_id} />
                      <input type="hidden" name="student_id" value={submission.student_id} />
                      <input
                        name="score"
                        type="number"
                        step="0.01"
                        min="0"
                        max={submission.assignment_max_score}
                        defaultValue={submission.grade_score ?? ""}
                        placeholder="Score"
                        className="w-28 rounded-xl border border-[color:var(--border)] px-2 py-1 text-xs"
                        required
                      />
                      <textarea
                        name="feedback"
                        rows={2}
                        defaultValue={submission.grade_feedback ?? ""}
                        placeholder="Feedback"
                        className="w-56 rounded-xl border border-[color:var(--border)] px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Save Grade
                      </button>
                    </form>
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

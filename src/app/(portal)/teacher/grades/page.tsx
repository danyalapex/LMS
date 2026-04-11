import { createAssignmentAction, recordGradeAction } from "@/app/actions/lms";
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  getDefaultOrganizationGradingPolicy,
  listCourseEnrollments,
  listCoursesForTeacher,
  listTeacherAssignments,
} from "@/lib/lms/queries";

type TeacherGradesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeacherGradesPage({ searchParams }: TeacherGradesPageProps) {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const params = (await searchParams) ?? {};
  const courseParam = params.course;
  const courseIdFromQuery = Array.isArray(courseParam) ? courseParam[0] : courseParam;

  const [courses, gradingPolicy] = await Promise.all([
    listCoursesForTeacher(identity.authUserId),
    getDefaultOrganizationGradingPolicy(identity.organizationId),
  ]);
  const selectedCourseId = courseIdFromQuery || courses[0]?.id || "";
  const enrollments = selectedCourseId ? await listCourseEnrollments(selectedCourseId) : [];
  const assignments = await listTeacherAssignments(identity.authUserId);

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-heading">Active school grading scale</h2>
            <p className="mt-2 text-sm text-slate-600">
              New grades will use {gradingPolicy?.policy_name ?? "the default percentage scale"}.
            </p>
          </div>
          <div className="chip">Pass mark {gradingPolicy?.pass_mark ?? 50}%</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(gradingPolicy?.bands ?? []).map((band) => (
            <span key={band.id} className="chip">
              {band.band_label}: {band.min_percentage}-{band.max_percentage}%
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="section-heading">Create Assignment</h2>
          <form action={createAssignmentAction} className="mt-4 space-y-2">
            <select name="course_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" defaultValue={selectedCourseId} required>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Assignment title" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <textarea name="details" rows={3} placeholder="Assignment details" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" />
            <input name="max_score" type="number" step="0.01" min="1" placeholder="Maximum score" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="due_at" type="datetime-local" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" />
            <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Create Assignment
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">Record Grade</h2>
          <form action={recordGradeAction} className="mt-4 space-y-2">
            <select name="assignment_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select assignment</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title} ({assignment.course_code})
                </option>
              ))}
            </select>
            <select name="student_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select student</option>
              {enrollments.map((row) => (
                <option key={row.student_id} value={row.student_id}>
                  {row.student_code} - {row.first_name} {row.last_name}
                </option>
              ))}
            </select>
            <input name="score" type="number" step="0.01" min="0" placeholder="Score" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <textarea name="feedback" rows={3} placeholder="Feedback" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" />
            <button type="submit" className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save Grade
            </button>
          </form>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Max Score</th>
                <th className="px-5 py-3">Due At</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{assignment.title}</td>
                  <td className="px-5 py-3">{assignment.course_code}</td>
                  <td className="px-5 py-3">{assignment.max_score}</td>
                  <td className="px-5 py-3">{assignment.due_at ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

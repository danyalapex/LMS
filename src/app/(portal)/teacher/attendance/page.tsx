import { markAttendanceAction } from "@/app/actions/lms";
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  listCourseEnrollments,
  listCoursesForTeacher,
} from "@/lib/lms/queries";

type TeacherAttendancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeacherAttendancePage({ searchParams }: TeacherAttendancePageProps) {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const params = (await searchParams) ?? {};
  const courseParam = params.course;
  const courseIdFromQuery = Array.isArray(courseParam) ? courseParam[0] : courseParam;

  const courses = await listCoursesForTeacher(identity.authUserId);
  const selectedCourseId = courseIdFromQuery || courses[0]?.id || "";
  const enrollments = selectedCourseId ? await listCourseEnrollments(selectedCourseId) : [];

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Mark Attendance</h2>
        <form action={markAttendanceAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="course_id" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" defaultValue={selectedCourseId} required>
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>

          <select name="student_id" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
            <option value="">Select student</option>
            {enrollments.map((row) => (
              <option key={row.student_id} value={row.student_id}>
                {row.student_code} - {row.first_name} {row.last_name}
              </option>
            ))}
          </select>

          <input
            name="session_date"
            type="date"
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <input name="period_label" placeholder="Period label (e.g., P1)" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />

          <select name="state" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm">
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>

          <input name="remarks" placeholder="Remarks (optional)" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" />

          <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
            Save Attendance Record
          </button>
        </form>
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Enrolled Students in Selected Course</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {enrollments.map((row) => (
            <div key={row.student_id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3 text-sm">
              <p className="font-semibold">
                {row.first_name} {row.last_name}
              </p>
              <p className="text-xs text-slate-600">{row.student_code}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

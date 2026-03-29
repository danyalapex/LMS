import {
  assignTeacherToCourseAction,
  createCourseAction,
  enrollStudentInCourseAction,
} from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import {
  listAllCourses,
  listStudents,
  listTeacherUsers,
} from "@/lib/lms/queries";

export default async function AdminCoursesPage() {
  await requireRole(["admin"]);

  const [courses, teachers, students] = await Promise.all([
    listAllCourses(),
    listTeacherUsers(),
    listStudents(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-3">
        <article className="panel p-5 xl:col-span-1">
          <h2 className="section-heading">Create Course</h2>
          <form action={createCourseAction} className="mt-4 space-y-2">
            <input name="code" placeholder="Course code" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="title" placeholder="Course title" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="grade_level" placeholder="Grade level" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Create
            </button>
          </form>
        </article>

        <article className="panel p-5 xl:col-span-1">
          <h2 className="section-heading">Assign Teacher</h2>
          <form action={assignTeacherToCourseAction} className="mt-4 space-y-2">
            <select name="course_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
            <select name="teacher_user_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm">
              <option value="">Unassign teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.full_name} ({teacher.email})
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Save Assignment
            </button>
          </form>
        </article>

        <article className="panel p-5 xl:col-span-1">
          <h2 className="section-heading">Enroll Student</h2>
          <form action={enrollStudentInCourseAction} className="mt-4 space-y-2">
            <select name="course_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
            <select name="student_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_code} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Enroll Student
            </button>
          </form>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Course Catalog</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Grade Level</th>
                <th className="px-5 py-3">Assigned Teacher</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{course.code}</td>
                  <td className="px-5 py-3">{course.title}</td>
                  <td className="px-5 py-3">{course.grade_level}</td>
                  <td className="px-5 py-3">{course.teacher_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

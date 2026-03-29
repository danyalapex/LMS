import { createStudentAction } from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import { listStudents } from "@/lib/lms/queries";

export default async function AdminStudentsPage() {
  await requireRole(["admin"]);
  const students = await listStudents();

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Register Student</h2>
        <form action={createStudentAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="first_name" placeholder="First name" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="last_name" placeholder="Last name" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="email" type="email" placeholder="Email" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="student_code" placeholder="Student code" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="grade_level" placeholder="Grade level" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="admission_date" type="date" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
            Add Student
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Student Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Admission</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-5 py-3">{student.email}</td>
                  <td className="px-5 py-3">{student.student_code}</td>
                  <td className="px-5 py-3">{student.grade_level}</td>
                  <td className="px-5 py-3">{student.admission_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { linkGuardianStudentAction } from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import {
  listGuardianLinks,
  listGuardianUsers,
  listStudents,
} from "@/lib/lms/queries";

export default async function AdminGuardiansPage() {
  await requireRole(["admin"]);

  const [guardians, students, links] = await Promise.all([
    listGuardianUsers(),
    listStudents(),
    listGuardianLinks(),
  ]);

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Link Guardian to Student</h2>
        <form action={linkGuardianStudentAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="guardian_email" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
            <option value="">Select guardian account</option>
            {guardians.map((guardian) => (
              <option key={guardian.user_id} value={guardian.email}>
                {guardian.full_name} ({guardian.email})
              </option>
            ))}
          </select>
          <select name="student_id" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_code} - {student.first_name} {student.last_name}
              </option>
            ))}
          </select>
          <input name="relation" placeholder="Relation (e.g., Mother, Father, Guardian)" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm md:col-span-2" defaultValue="Guardian" />
          <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
            Link Guardian
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Guardian-Student Links</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Guardian</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Student Code</th>
                <th className="px-5 py-3">Relation</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, index) => (
                <tr key={`${link.guardian_email}-${link.student_code}-${index}`} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{link.guardian_name}</td>
                  <td className="px-5 py-3">{link.guardian_email}</td>
                  <td className="px-5 py-3">{link.student_name}</td>
                  <td className="px-5 py-3">{link.student_code}</td>
                  <td className="px-5 py-3">{link.relation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

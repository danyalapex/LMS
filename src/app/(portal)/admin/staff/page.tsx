import { createStaffAction } from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import { listStaffProfiles } from "@/lib/lms/queries";

export default async function AdminStaffPage() {
  await requireRole(["admin"]);
  const staff = await listStaffProfiles();

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Register Staff Member</h2>
        <form action={createStaffAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="first_name" placeholder="First name" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="last_name" placeholder="Last name" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="email" type="email" placeholder="Email" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="employee_code" placeholder="Employee code" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="department" placeholder="Department" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="designation" placeholder="Designation" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="hire_date" type="date" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <input name="monthly_salary" type="number" step="0.01" min="0" placeholder="Monthly salary" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
          <select name="role" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm">
            <option value="teacher">Teacher</option>
            <option value="finance">Finance</option>
          </select>
          <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            Add Staff
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Staff Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Employee Code</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Monthly Salary</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">
                    {member.first_name} {member.last_name}
                  </td>
                  <td className="px-5 py-3">{member.email}</td>
                  <td className="px-5 py-3">{member.employee_code}</td>
                  <td className="px-5 py-3">{member.department}</td>
                  <td className="px-5 py-3">{member.designation}</td>
                  <td className="px-5 py-3">${member.monthly_salary.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

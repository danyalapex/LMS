import Link from "next/link";
import { createPayrollCycleAction, createPayrollEntryAction } from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import { listPayrollCyclesWithEntries, listStaffProfiles } from "@/lib/lms/queries";

export default async function AdminPayrollPage() {
  await requireRole(["admin", "finance"]);

  const [{ cycles, entries }, staff] = await Promise.all([
    listPayrollCyclesWithEntries(),
    listStaffProfiles(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="section-heading">Create Payroll Cycle</h2>
          <form action={createPayrollCycleAction} className="mt-4 space-y-2">
            <input name="cycle_code" placeholder="Cycle code (e.g., P-2026-05)" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <div className="grid gap-2 md:grid-cols-2">
              <input name="period_start" type="date" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
              <input name="period_end" type="date" className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            </div>
            <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Create Cycle
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Add Payroll Entry</h2>
            <Link href="/admin/workflows" className="text-sm font-semibold text-slate-700 underline">
              Open Workflows
            </Link>
          </div>
          <form action={createPayrollEntryAction} className="mt-4 space-y-2">
            <select name="payroll_cycle_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select cycle</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.cycle_code} ({cycle.status})
                </option>
              ))}
            </select>
            <select name="staff_profile_id" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required>
              <option value="">Select staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.employee_code} - {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
            <input name="gross_amount" type="number" step="0.01" min="0" placeholder="Gross amount" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="deductions" type="number" step="0.01" min="0" placeholder="Deductions" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" defaultValue="0" />
            <button type="submit" className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Add Entry
            </button>
          </form>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Payroll Cycles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Cycle</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{cycle.cycle_code}</td>
                  <td className="px-5 py-3">
                    {cycle.period_start} to {cycle.period_end}
                  </td>
                  <td className="px-5 py-3">{cycle.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Payroll Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Staff</th>
                <th className="px-5 py-3">Employee Code</th>
                <th className="px-5 py-3">Gross</th>
                <th className="px-5 py-3">Deductions</th>
                <th className="px-5 py-3">Net</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">
                    {entry.first_name} {entry.last_name}
                  </td>
                  <td className="px-5 py-3">{entry.employee_code}</td>
                  <td className="px-5 py-3">${entry.gross_amount.toFixed(2)}</td>
                  <td className="px-5 py-3">${entry.deductions.toFixed(2)}</td>
                  <td className="px-5 py-3">${entry.net_amount.toFixed(2)}</td>
                  <td className="px-5 py-3">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

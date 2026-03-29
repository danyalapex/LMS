import {
  updatePayrollCycleStatusAction,
  updatePayrollEntryStatusAction,
} from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import { listAuditLogs, listPayrollCyclesWithEntries } from "@/lib/lms/queries";

const payrollStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "paid",
] as const;

export default async function AdminWorkflowsPage() {
  await requireRole(["admin", "finance"]);

  const [{ cycles, entries }, auditLogs] = await Promise.all([
    listPayrollCyclesWithEntries(),
    listAuditLogs(120),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="section-heading">Payroll Cycle Workflow</h2>
          </div>
          <div className="space-y-2 p-4">
            {cycles.map((cycle) => (
              <form
                key={cycle.id}
                action={updatePayrollCycleStatusAction}
                className="grid gap-2 rounded-xl border border-[color:var(--border)] bg-white/80 p-3 md:grid-cols-[1.4fr_1fr_auto]"
              >
                <input name="cycle_id" type="hidden" value={cycle.id} />
                <div>
                  <p className="text-sm font-semibold">{cycle.cycle_code}</p>
                  <p className="text-xs text-slate-600">
                    {cycle.period_start} to {cycle.period_end} | Current: {cycle.status}
                  </p>
                </div>
                <select
                  name="next_status"
                  defaultValue={cycle.status}
                  className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
                >
                  {payrollStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Update
                </button>
              </form>
            ))}
          </div>
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="section-heading">Payroll Entry Workflow</h2>
          </div>
          <div className="max-h-[32rem] space-y-2 overflow-auto p-4">
            {entries.map((entry) => (
              <form
                key={entry.id}
                action={updatePayrollEntryStatusAction}
                className="grid gap-2 rounded-xl border border-[color:var(--border)] bg-white/80 p-3 md:grid-cols-[1.5fr_1fr_auto]"
              >
                <input name="entry_id" type="hidden" value={entry.id} />
                <div>
                  <p className="text-sm font-semibold">
                    {entry.employee_code} - {entry.first_name} {entry.last_name}
                  </p>
                  <p className="text-xs text-slate-600">
                    Gross ${entry.gross_amount.toFixed(2)} | Net ${entry.net_amount.toFixed(2)} | Current: {entry.status}
                  </p>
                </div>
                <select
                  name="next_status"
                  defaultValue={entry.status}
                  className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
                >
                  {payrollStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Apply
                </button>
              </form>
            ))}
          </div>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Audit Stream</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-[color:var(--border)] align-top">
                  <td className="px-5 py-3">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">{log.actor_name}</td>
                  <td className="px-5 py-3 font-semibold">{log.action}</td>
                  <td className="px-5 py-3">{log.entity}</td>
                  <td className="px-5 py-3">
                    <pre className="max-w-xs overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-100">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
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

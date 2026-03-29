import { requireIdentity, requireRole } from "@/lib/auth";
import { listStudentFeeLedger } from "@/lib/lms/queries";

export default async function StudentFeesPage() {
  await requireRole(["student"]);
  const identity = await requireIdentity();

  const invoices = await listStudentFeeLedger(identity.authUserId);

  const totals = invoices.reduce(
    (acc, row) => {
      acc.totalDue += row.amount_due;
      acc.totalPaid += row.total_paid;
      acc.totalBalance += row.balance;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, totalBalance: 0 },
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Billed</p>
          <p className="mt-2 text-2xl font-bold">${totals.totalDue.toFixed(2)}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Paid</p>
          <p className="mt-2 text-2xl font-bold">${totals.totalPaid.toFixed(2)}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-bold">${totals.totalBalance.toFixed(2)}</p>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">My Fee Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{invoice.invoice_code}</td>
                  <td className="px-5 py-3">{invoice.title}</td>
                  <td className="px-5 py-3">{invoice.due_date}</td>
                  <td className="px-5 py-3 capitalize">{invoice.status.replaceAll("_", " ")}</td>
                  <td className="px-5 py-3">${invoice.amount_due.toFixed(2)}</td>
                  <td className="px-5 py-3">${invoice.total_paid.toFixed(2)}</td>
                  <td className="px-5 py-3">${invoice.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

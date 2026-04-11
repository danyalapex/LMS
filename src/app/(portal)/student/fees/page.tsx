import { requireIdentity, requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/lms/format";
import {
  getOrganizationFeeSettings,
  listOrganizationPaymentMethods,
  listStudentFeeLedger,
} from "@/lib/lms/queries";

export default async function StudentFeesPage() {
  await requireRole(["student"]);
  const identity = await requireIdentity();

  const [invoices, feeSettings, paymentMethods] = await Promise.all([
    listStudentFeeLedger(identity.authUserId),
    getOrganizationFeeSettings(identity.organizationId),
    listOrganizationPaymentMethods(identity.organizationId),
  ]);

  const totals = invoices.reduce(
    (acc, row) => {
      acc.totalDue += row.amount_due;
      acc.totalPaid += row.total_paid;
      acc.totalBalance += row.balance;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, totalBalance: 0 },
  );

  const enabledPaymentMethods = paymentMethods.filter((method) => method.enabled);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Billed</p>
          <p className="mt-2 text-2xl font-bold">
            {formatMoney(totals.totalDue, feeSettings.currency_code)}
          </p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Paid</p>
          <p className="mt-2 text-2xl font-bold">
            {formatMoney(totals.totalPaid, feeSettings.currency_code)}
          </p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-bold">
            {formatMoney(totals.totalBalance, feeSettings.currency_code)}
          </p>
        </article>
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Payment rules for your school</h2>
        <p className="mt-2 text-sm text-slate-600">
          Partial payments are{" "}
          {feeSettings.allow_partial_payments ? "allowed" : "not allowed"} for this
          school. Late fee policy:{" "}
          {formatMoney(feeSettings.late_fee_flat_amount, feeSettings.currency_code)} after{" "}
          {feeSettings.late_fee_grace_days} grace days.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {enabledPaymentMethods.map((method) => (
            <span key={method.id || method.method_code} className="chip">
              {method.label}
            </span>
          ))}
        </div>
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
                  <td className="px-5 py-3 capitalize">
                    {invoice.status.replaceAll("_", " ")}
                  </td>
                  <td className="px-5 py-3">
                    {formatMoney(invoice.amount_due, feeSettings.currency_code)}
                  </td>
                  <td className="px-5 py-3">
                    {formatMoney(invoice.total_paid, feeSettings.currency_code)}
                  </td>
                  <td className="px-5 py-3">
                    {formatMoney(invoice.balance, feeSettings.currency_code)}
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

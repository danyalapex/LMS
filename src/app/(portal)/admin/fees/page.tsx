import {
  createFeeInvoiceAction,
  createFeePlanAction,
  recordFeePaymentAction,
} from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import {
  listFeeInvoices,
  listFeePayments,
  listFeePlans,
  listStudents,
} from "@/lib/lms/queries";

export default async function AdminFeesPage() {
  await requireRole(["admin", "finance"]);

  const [students, feePlans, feeInvoices, feePayments] = await Promise.all([
    listStudents(),
    listFeePlans(),
    listFeeInvoices(),
    listFeePayments(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-3">
        <article className="panel p-5">
          <h2 className="section-heading">Create Fee Plan</h2>
          <form action={createFeePlanAction} className="mt-4 space-y-2">
            <input
              name="plan_code"
              placeholder="Plan code (e.g., FEE-G7-MONTHLY)"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="title"
              placeholder="Plan title"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="grade_level"
              placeholder="Grade level"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="Amount"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <select
              name="recurrence"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              defaultValue="monthly"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="term">Term</option>
              <option value="one_time">One Time</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Create Plan
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">Generate Invoice</h2>
          <form action={createFeeInvoiceAction} className="mt-4 space-y-2">
            <select
              name="student_id"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_code} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <select
              name="fee_plan_id"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">No linked plan (custom invoice)</option>
              {feePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_code} - {plan.title}
                </option>
              ))}
            </select>
            <input
              name="invoice_code"
              placeholder="Invoice code (e.g., INV-2026-0001)"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="title"
              placeholder="Invoice title"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="amount_due"
              type="number"
              step="0.01"
              min="1"
              placeholder="Amount due"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="due_date"
              type="date"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Create Invoice
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">Record Payment</h2>
          <form action={recordFeePaymentAction} className="mt-4 space-y-2">
            <select
              name="invoice_id"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              <option value="">Select invoice</option>
              {feeInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_code} - {invoice.student_code} ({invoice.balance.toFixed(2)} due)
                </option>
              ))}
            </select>
            <input
              name="amount_paid"
              type="number"
              step="0.01"
              min="1"
              placeholder="Amount paid"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="payment_date"
              type="date"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <select
              name="method"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              defaultValue="cash"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
            <input
              name="reference_no"
              placeholder="Reference number (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Record Payment
            </button>
          </form>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Fee Plans</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Recurrence</th>
                <th className="px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {feePlans.map((plan) => (
                <tr key={plan.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{plan.plan_code}</td>
                  <td className="px-5 py-3">{plan.title}</td>
                  <td className="px-5 py-3">{plan.grade_level}</td>
                  <td className="px-5 py-3 capitalize">{plan.recurrence.replaceAll("_", " ")}</td>
                  <td className="px-5 py-3">${plan.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {feeInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">
                    <p>{invoice.invoice_code}</p>
                    <p className="text-xs font-normal text-slate-600">{invoice.title}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p>{invoice.student_name}</p>
                    <p className="text-xs text-slate-600">{invoice.student_code}</p>
                  </td>
                  <td className="px-5 py-3">{invoice.fee_plan_code || "-"}</td>
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

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {feePayments.slice(0, 200).map((payment) => (
                <tr key={payment.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3">{payment.payment_date}</td>
                  <td className="px-5 py-3 font-semibold">{payment.invoice_code}</td>
                  <td className="px-5 py-3">{payment.student_name}</td>
                  <td className="px-5 py-3 capitalize">{payment.method.replaceAll("_", " ")}</td>
                  <td className="px-5 py-3">{payment.reference_no || "-"}</td>
                  <td className="px-5 py-3">${payment.amount_paid.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

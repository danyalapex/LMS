import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPageButton } from "@/components/ui/print-page-button";
import { requireIdentity, requireRole } from "@/lib/auth";
import { formatDate, formatLabel, formatMoney } from "@/lib/lms/format";
import { getFeeInvoiceDocument } from "@/lib/lms/queries";

type AdminFeePrintPageProps = {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ paymentId?: string }>;
};

export default async function AdminFeePrintPage({
  params,
  searchParams,
}: AdminFeePrintPageProps) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();
  const { invoiceId } = await params;
  const { paymentId } = await searchParams;

  const document = await getFeeInvoiceDocument(invoiceId, identity.organizationId);
  if (!document) {
    notFound();
  }

  const focusedPayment =
    paymentId && document.payments.some((payment) => payment.id === paymentId)
      ? document.payments.find((payment) => payment.id === paymentId) ?? null
      : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <p className="eyebrow">Fee document</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {focusedPayment ? "Payment receipt" : "Fee invoice"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Use your browser print dialog to print this document or save it as a PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="button-secondary" href="/admin/fees">
              Back to fees
            </Link>
            <PrintPageButton />
          </div>
        </div>

        <article className="panel-strong overflow-hidden print:rounded-none print:border-0 print:bg-white print:shadow-none">
          <div className="border-b border-[color:var(--border)] px-6 py-6 print:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">
                  {focusedPayment ? "Official receipt" : "Official invoice"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {document.organization_name}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {document.organization_contact_email || "Finance office document"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 print:min-w-[320px]">
                <div className="record-metric">
                  <span className="record-metric-label">
                    {focusedPayment ? "Receipt no" : "Invoice no"}
                  </span>
                  <span className="record-metric-value">
                    {focusedPayment ? focusedPayment.receipt_code : document.invoice_code}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Status</span>
                  <span className="record-metric-value">
                    {focusedPayment ? "Payment received" : formatLabel(document.status)}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">
                    {focusedPayment ? "Payment date" : "Due date"}
                  </span>
                  <span className="record-metric-value">
                    {formatDate(focusedPayment?.payment_date ?? document.due_date)}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Currency</span>
                  <span className="record-metric-value">{document.currency_code}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_320px] print:px-8">
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="record-metric">
                  <span className="record-metric-label">Student</span>
                  <span className="record-metric-value">{document.student_name}</span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Student code</span>
                  <span className="record-metric-value">{document.student_code}</span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Grade</span>
                  <span className="record-metric-value">
                    {document.student_grade_level || "Not captured"}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Fee plan</span>
                  <span className="record-metric-value">
                    {document.fee_plan_code || "Custom invoice"}
                  </span>
                </div>
              </div>

              <section className="rounded-[28px] border border-[color:var(--border)] bg-white/80 p-5">
                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {document.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {focusedPayment
                        ? "Payment receipt against the invoice below."
                        : "Billing summary for the current student invoice."}
                    </p>
                  </div>
                  <span className="chip">{document.invoice_code}</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-[24px] border border-[color:var(--border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100/80 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-3">{document.title}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatMoney(document.amount_due, document.currency_code)}
                        </td>
                      </tr>
                      {focusedPayment ? (
                        <tr className="border-t border-[color:var(--border)]">
                          <td className="px-4 py-3">
                            Current payment via {formatLabel(focusedPayment.method)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {formatMoney(focusedPayment.amount_paid, document.currency_code)}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-3">Total collected to date</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatMoney(document.total_paid, document.currency_code)}
                        </td>
                      </tr>
                      <tr className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-3">Balance outstanding</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatMoney(document.balance, document.currency_code)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[28px] border border-[color:var(--border)] bg-white/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    Payment history
                  </h3>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {document.payments.length} entries
                  </span>
                </div>

                {document.payments.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-[24px] border border-[color:var(--border)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100/80 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Receipt</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {document.payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className={`border-t border-[color:var(--border)] ${
                              focusedPayment?.id === payment.id ? "bg-emerald-50/80" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold">{payment.receipt_code}</td>
                            <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                            <td className="px-4 py-3">{formatLabel(payment.method)}</td>
                            <td className="px-4 py-3">{payment.reference_no || "-"}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatMoney(payment.amount_paid, document.currency_code)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    No payments have been recorded against this invoice yet.
                  </p>
                )}
              </section>
            </section>

            <aside className="space-y-4">
              {focusedPayment ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Receipt focus
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {formatMoney(focusedPayment.amount_paid, document.currency_code)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Received on {formatDate(focusedPayment.payment_date)} via{" "}
                    {formatLabel(focusedPayment.method)}.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Reference: {focusedPayment.reference_no || "Not provided"}
                  </p>
                </div>
              ) : null}

              <div className="rounded-[28px] border border-[color:var(--border)] bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Finance summary
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Invoice amount</span>
                    <span className="font-semibold text-slate-950">
                      {formatMoney(document.amount_due, document.currency_code)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Collected</span>
                    <span className="font-semibold text-slate-950">
                      {formatMoney(document.total_paid, document.currency_code)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Outstanding</span>
                    <span className="font-semibold text-slate-950">
                      {formatMoney(document.balance, document.currency_code)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Status</span>
                    <span className="font-semibold text-slate-950">
                      {formatLabel(document.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[color:var(--border)] bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Notes
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {document.notes || "No additional invoice notes were recorded."}
                </p>
              </div>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}

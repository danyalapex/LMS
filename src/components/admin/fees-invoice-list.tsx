"use client";

import React, { startTransition, useDeferredValue, useState } from "react";
import { updateFeeInvoiceAction, deleteFeeInvoiceAction } from "@/app/actions/lms";
import { StatusPill, WorkspaceSection } from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatDate, formatLabel, formatMoney } from "@/lib/lms/format";
import type {
  FeeInvoiceItem,
  FeePaymentItem,
  FeePlanItem,
  OrganizationFeeSettingsItem,
  OrganizationPaymentMethodItem,
  StudentListItem,
} from "@/lib/lms/queries";

type Props = {
  students: StudentListItem[];
  feePlans: FeePlanItem[];
  feeInvoices: FeeInvoiceItem[];
  feePayments: FeePaymentItem[];
  feeSettings: OrganizationFeeSettingsItem;
  paymentMethods: OrganizationPaymentMethodItem[];
};

function invoiceTone(status: string) {
  if (status === "paid") return "good" as const;
  if (status === "overdue" || status === "cancelled") return "warn" as const;
  return "neutral" as const;
}

export default function FeesInvoiceList({
  students,
  feePlans,
  feeInvoices,
  feePayments,
  feeSettings,
  paymentMethods,
}: Props) {
  const [invoiceSearchValue, setInvoiceSearchValue] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [invoiceGradeFilter, setInvoiceGradeFilter] = useState("all");

  const deferredInvoiceSearch = useDeferredValue(invoiceSearchValue);

  const studentMap = new Map(students.map((student) => [student.id, student]));
  const methodLabelMap = new Map(
    paymentMethods.map((method) => [method.method_code, method.label]),
  );
  const paymentsByInvoice = new Map<string, FeePaymentItem[]>();

  for (const payment of feePayments) {
    const current = paymentsByInvoice.get(payment.invoice_id) ?? [];
    current.push(payment);
    paymentsByInvoice.set(payment.invoice_id, current);
  }

  const grades = [...new Set(students.map((student) => student.grade_level))].sort();

  const visibleInvoices = feeInvoices.filter((invoice) => {
    const student = studentMap.get(invoice.student_id);
    const haystack = [
      invoice.invoice_code,
      invoice.title,
      invoice.student_code,
      invoice.student_name,
      invoice.fee_plan_code,
      invoice.status,
      student?.grade_level ?? "",
      invoice.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredInvoiceSearch.trim().length === 0 ||
      haystack.includes(deferredInvoiceSearch.trim().toLowerCase());
    const matchesStatus =
      invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter;
    const matchesGrade = invoiceGradeFilter === "all" || student?.grade_level === invoiceGradeFilter;

    return matchesSearch && matchesStatus && matchesGrade;
  });

  const displayedInvoices = visibleInvoices.slice(0, 60);

  return (
    <WorkspaceSection
      title="Invoice workspace"
      description="Search the billing ledger by student, grade, or invoice status. Each invoice card includes inline correction controls and a live collection snapshot."
      action={
        <span className="chip">
          {visibleInvoices.length} of {feeInvoices.length} visible
        </span>
      }
    >
      <div className="space-y-4">
        <div className="toolbar-grid">
          <label className="field">
            <span className="field-label">Search</span>
            <input
              value={invoiceSearchValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                startTransition(() => setInvoiceSearchValue(nextValue));
              }}
              className="field-input"
              placeholder="Search by invoice, student, plan, or note"
            />
          </label>

          <label className="field">
            <span className="field-label">Status</span>
            <select
              value={invoiceStatusFilter}
              onChange={(event) => setInvoiceStatusFilter(event.target.value)}
              className="field-select"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Grade</span>
            <select
              value={invoiceGradeFilter}
              onChange={(event) => setInvoiceGradeFilter(event.target.value)}
              className="field-select"
            >
              <option value="all">All grades</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
        </div>

        {displayedInvoices.length > 0 ? (
          <div className="record-stack">
            {displayedInvoices.map((invoice) => {
              const student = studentMap.get(invoice.student_id);
              const invoicePayments = paymentsByInvoice.get(invoice.id) ?? [];
              const workflowStatus =
                invoice.status === "cancelled" || invoice.status === "draft"
                  ? invoice.status
                  : "issued";

              return (
                <article key={invoice.id} className="record-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {invoice.invoice_code}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                        {invoice.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {invoice.student_name} ({invoice.student_code})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={invoiceTone(invoice.status)}>
                        {formatLabel(invoice.status)}
                      </StatusPill>
                      <span className="chip">{invoice.fee_plan_code || "Custom invoice"}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="record-metric">
                      <span className="record-metric-label">Grade</span>
                      <span className="record-metric-value">{student?.grade_level ?? "Not linked"}</span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Due date</span>
                      <span className="record-metric-value">{formatDate(invoice.due_date)}</span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Collected</span>
                      <span className="record-metric-value">
                        {formatMoney(invoice.total_paid, feeSettings.currency_code)}
                      </span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Balance</span>
                      <span className="record-metric-value">
                        {formatMoney(invoice.balance, feeSettings.currency_code)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Recent collections</p>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {invoicePayments.length} linked
                      </span>
                    </div>

                    {invoicePayments.length > 0 ? (
                      <div className="space-y-2">
                        {invoicePayments.slice(0, 3).map((payment) => (
                          <div
                            key={payment.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-white/75 px-3 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {formatMoney(payment.amount_paid, feeSettings.currency_code)}
                              </p>
                              <p className="text-xs text-slate-600">
                                {formatDate(payment.payment_date)} via {methodLabelMap.get(payment.method) ?? formatLabel(payment.method)}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500">
                              {payment.reference_no || "No reference"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[color:var(--border)] bg-white/60 px-3 py-3 text-sm text-slate-600">
                        No payments recorded yet. Use the collection form to post the first receipt.
                      </p>
                    )}
                  </div>

                  <details className="record-details">
                    <summary>Edit invoice details</summary>
                    <form action={updateFeeInvoiceAction} className="mt-4 space-y-4">
                      <input type="hidden" name="invoice_id" value={invoice.id} />

                      <div className="form-grid">
                        <label className="field">
                          <span className="field-label">Student</span>
                          <select name="student_id" defaultValue={invoice.student_id} className="field-select" required>
                            {students.map((studentOption) => (
                              <option key={studentOption.id} value={studentOption.id}>
                                {studentOption.student_code} - {studentOption.first_name} {studentOption.last_name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span className="field-label">Linked plan</span>
                          <select name="fee_plan_id" defaultValue={invoice.fee_plan_id ?? ""} className="field-select">
                            <option value="">Custom invoice</option>
                            {feePlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.plan_code} - {plan.title}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span className="field-label">Invoice code</span>
                          <input name="invoice_code" defaultValue={invoice.invoice_code} className="field-input" required />
                        </label>

                        <label className="field">
                          <span className="field-label">Invoice title</span>
                          <input name="title" defaultValue={invoice.title} className="field-input" required />
                        </label>

                        <label className="field">
                          <span className="field-label">Amount due</span>
                          <input name="amount_due" type="number" min="1" step="0.01" defaultValue={invoice.amount_due} className="field-input" required />
                        </label>

                        <label className="field">
                          <span className="field-label">Due date</span>
                          <input name="due_date" type="date" defaultValue={invoice.due_date} className="field-input" required />
                        </label>

                        <label className="field field-span-2">
                          <span className="field-label">Workflow state</span>
                          <select name="workflow_status" defaultValue={workflowStatus} className="field-select">
                            <option value="issued">Issued / live invoice</option>
                            <option value="draft">Draft</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </label>

                        <label className="field field-span-2">
                          <span className="field-label">Notes</span>
                          <textarea name="notes" defaultValue={invoice.notes ?? ""} rows={3} className="field-textarea" placeholder="Optional internal or family-facing notes" />
                        </label>
                      </div>

                      <FormSubmitButton pendingLabel="Updating...">Save invoice</FormSubmitButton>
                    </form>
                  </details>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <a href={`/admin/fees/print/${invoice.id}`} target="_blank" rel="noreferrer" className="button-ghost">
                      Print / PDF
                    </a>
                  </div>

                  <form
                    action={deleteFeeInvoiceAction}
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          invoicePayments.length > 0
                            ? `Delete ${invoice.invoice_code}? This will also remove ${invoicePayments.length} linked payment record(s).`
                            : `Delete ${invoice.invoice_code}?`,
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                    className="mt-3 flex justify-end"
                  >
                    <input type="hidden" name="invoice_id" value={invoice.id} />
                    <FormSubmitButton variant="danger" pendingLabel="Deleting...">
                      Delete invoice
                    </FormSubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-lg font-semibold text-slate-950">No invoices match this filter.</p>
            <p className="mt-1 text-sm text-slate-600">Clear a filter or broaden the search to bring the billing queue back into view.</p>
          </div>
        )}

        {visibleInvoices.length > displayedInvoices.length ? (
          <p className="text-xs text-slate-500">Showing the first {displayedInvoices.length} invoices to keep the workspace fast.</p>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}

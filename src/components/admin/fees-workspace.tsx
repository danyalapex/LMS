"use client";

import React, { Suspense, lazy, startTransition, useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  createFeeInvoiceAction,
  createFeePlanAction,
  deleteFeeInvoiceAction,
  deleteFeePaymentAction,
  deleteFeePlanAction,
  recordFeePaymentAction,
  updateFeeInvoiceAction,
  updateFeePlanAction,
} from "@/app/actions/lms";
import {
  StatusPill,
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
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

type FeesWorkspaceProps = {
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

function planTone(active: boolean) {
  return active ? ("good" as const) : ("warn" as const);
}

export function FeesWorkspace({
  students,
  feePlans,
  feeInvoices,
  feePayments,
  feeSettings,
  paymentMethods,
}: FeesWorkspaceProps) {
  const [planSearchValue, setPlanSearchValue] = useState("");
  const [planGradeFilter, setPlanGradeFilter] = useState("all");
  const [planRecurrenceFilter, setPlanRecurrenceFilter] = useState("all");
  const [paymentSearchValue, setPaymentSearchValue] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const deferredPlanSearch = useDeferredValue(planSearchValue);
  const deferredPaymentSearch = useDeferredValue(paymentSearchValue);

  const studentMap = new Map(students.map((student) => [student.id, student]));
  const methodLabelMap = new Map(
    paymentMethods.map((method) => [method.method_code, method.label]),
  );

  const grades = [...new Set(students.map((student) => student.grade_level))].sort();
  const planRecurrences = [...new Set(feePlans.map((plan) => plan.recurrence))].sort();
  const enabledPaymentMethods = paymentMethods.filter((method) => method.enabled);
  const collectableInvoices = feeInvoices.filter(
    (invoice) => invoice.status !== "cancelled" && invoice.balance > 0,
  );
  // Invoice UI is lazy-loaded into its own chunk to reduce initial bundle size.
  const FeesInvoiceList = lazy(() => import("./fees-invoice-list"));
  const visiblePlans = feePlans.filter((plan) => {
    const haystack = [
      plan.plan_code,
      plan.title,
      plan.grade_level,
      plan.recurrence,
      plan.active ? "active" : "inactive",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredPlanSearch.trim().length === 0 ||
      haystack.includes(deferredPlanSearch.trim().toLowerCase());
    const matchesGrade =
      planGradeFilter === "all" || plan.grade_level === planGradeFilter;
    const matchesRecurrence =
      planRecurrenceFilter === "all" || plan.recurrence === planRecurrenceFilter;

    return matchesSearch && matchesGrade && matchesRecurrence;
  });

  const visiblePayments = feePayments.filter((payment) => {
    const haystack = [
      payment.invoice_code,
      payment.student_name,
      payment.method,
      payment.reference_no ?? "",
      methodLabelMap.get(payment.method) ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredPaymentSearch.trim().length === 0 ||
      haystack.includes(deferredPaymentSearch.trim().toLowerCase());
    const matchesMethod =
      paymentMethodFilter === "all" || payment.method === paymentMethodFilter;

    return matchesSearch && matchesMethod;
  });

  const displayedPlans = visiblePlans.slice(0, 60);
  const displayedPayments = visiblePayments.slice(0, 100);

  const outstandingBalance = feeInvoices.reduce(
    (sum, invoice) => sum + Math.max(invoice.balance, 0),
    0,
  );
  const overdueInvoices = feeInvoices.filter((invoice) => invoice.status === "overdue").length;
  const activePlans = feePlans.filter((plan) => plan.active).length;
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const collectedThisMonth = feePayments.reduce((sum, payment) => {
    if (payment.payment_date.startsWith(currentMonthKey)) {
      return sum + payment.amount_paid;
    }

    return sum;
  }, 0);

  return (
    <WorkspaceShell
      eyebrow="Revenue operations"
      title="Billing, invoicing, and fee collection"
      description="Manage fee structures, issue school-specific invoices, and correct billing activity from one finance workspace that respects each school's payment rules."
      stats={[
        {
          label: "Active plans",
          value: String(activePlans),
          helper: "Fee templates currently live for billing operations.",
          tone: "accent",
        },
        {
          label: "Open balance",
          value: formatMoney(outstandingBalance, feeSettings.currency_code),
          helper: "Outstanding billed amount still awaiting collection.",
          tone: "warn",
        },
        {
          label: "Overdue invoices",
          value: String(overdueInvoices),
          helper: "Invoices past their due date and still carrying balance.",
          tone: overdueInvoices > 0 ? "warn" : "neutral",
        },
        {
          label: "Collected this month",
          value: formatMoney(collectedThisMonth, feeSettings.currency_code),
          helper: "Payments recorded during the current calendar month.",
          tone: "neutral",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_390px]">
        <Suspense fallback={<div className="min-h-[200px] p-6">Loading invoices…</div>}>
          <FeesInvoiceList
            students={students}
            feePlans={feePlans}
            feeInvoices={feeInvoices}
            feePayments={feePayments}
            feeSettings={feeSettings}
            paymentMethods={paymentMethods}
          />
        </Suspense>

        <div className="space-y-5">
          <WorkspaceSection
            tone="accent"
            title="Issue and collect"
            description="Create fee templates, generate invoices, and post payments without leaving the billing workspace."
          >
            <div className="space-y-5">
              <form action={createFeePlanAction} className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Create fee plan</p>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Plan code</span>
                    <input
                      name="plan_code"
                      className="field-input"
                      placeholder="FEE-G7-MONTHLY"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Title</span>
                    <input
                      name="title"
                      className="field-input"
                      placeholder="Grade 7 monthly tuition"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Grade level</span>
                    <input name="grade_level" className="field-input" required />
                  </label>
                  <label className="field">
                    <span className="field-label">Amount</span>
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      className="field-input"
                      placeholder={feeSettings.currency_code}
                      required
                    />
                  </label>
                  <label className="field field-span-2">
                    <span className="field-label">Recurrence</span>
                    <select name="recurrence" defaultValue="monthly" className="field-select">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="term">Term</option>
                      <option value="one_time">One time</option>
                    </select>
                  </label>
                </div>
                <FormSubmitButton pendingLabel="Creating...">
                  Add fee plan
                </FormSubmitButton>
              </form>

              <div className="h-px bg-[color:var(--border)]" />

              <form action={createFeeInvoiceAction} className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Generate invoice</p>
                <div className="form-grid">
                  <label className="field field-span-2">
                    <span className="field-label">Student</span>
                    <select name="student_id" className="field-select" required>
                      <option value="">Select student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.student_code} - {student.first_name} {student.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-span-2">
                    <span className="field-label">Linked plan</span>
                    <select name="fee_plan_id" defaultValue="" className="field-select">
                      <option value="">Custom invoice</option>
                      {feePlans
                        .filter((plan) => plan.active)
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.plan_code} - {plan.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Invoice code</span>
                    <input
                      name="invoice_code"
                      className="field-input"
                      placeholder="INV-2026-0001"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Title</span>
                    <input name="title" className="field-input" required />
                  </label>
                  <label className="field">
                    <span className="field-label">Amount due</span>
                    <input
                      name="amount_due"
                      type="number"
                      min="1"
                      step="0.01"
                      className="field-input"
                      placeholder={feeSettings.currency_code}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Due date</span>
                    <input name="due_date" type="date" className="field-input" required />
                  </label>
                  <label className="field field-span-2">
                    <span className="field-label">Notes</span>
                    <textarea
                      name="notes"
                      rows={3}
                      className="field-textarea"
                      placeholder="Optional note for parent or finance team"
                    />
                  </label>
                </div>
                <FormSubmitButton variant="secondary" pendingLabel="Creating...">
                  Create invoice
                </FormSubmitButton>
              </form>

              <div className="h-px bg-[color:var(--border)]" />

              <form action={recordFeePaymentAction} className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Record payment</p>
                <div className="form-grid">
                  <label className="field field-span-2">
                    <span className="field-label">Invoice</span>
                    <select name="invoice_id" className="field-select" required>
                      <option value="">Select invoice</option>
                      {collectableInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_code} - {invoice.student_code} (
                          {formatMoney(invoice.balance, feeSettings.currency_code)} due)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Amount paid</span>
                    <input
                      name="amount_paid"
                      type="number"
                      min="1"
                      step="0.01"
                      className="field-input"
                      placeholder={feeSettings.currency_code}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Payment date</span>
                    <input name="payment_date" type="date" className="field-input" />
                  </label>
                  <label className="field">
                    <span className="field-label">Method</span>
                    <select
                      name="method"
                      defaultValue={enabledPaymentMethods[0]?.method_code ?? "cash"}
                      className="field-select"
                    >
                      {enabledPaymentMethods.map((method) => (
                        <option
                          key={method.id || method.method_code}
                          value={method.method_code}
                        >
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Reference</span>
                    <input
                      name="reference_no"
                      className="field-input"
                      placeholder="Bank slip, cheque, receipt id"
                    />
                  </label>
                </div>

                {enabledPaymentMethods.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    No payment methods are enabled yet. Turn one on in school settings before recording collections.
                  </p>
                ) : null}

                <FormSubmitButton
                  variant="secondary"
                  pendingLabel="Recording..."
                  disabled={enabledPaymentMethods.length === 0}
                >
                  Record payment
                </FormSubmitButton>
              </form>
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="School billing policy"
            description="These settings are live for the current school and directly affect invoice collection behavior."
          >
            <div className="space-y-4 text-sm text-slate-600">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="record-metric">
                  <span className="record-metric-label">Currency</span>
                  <span className="record-metric-value">{feeSettings.currency_code}</span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Partial payments</span>
                  <span className="record-metric-value">
                    {feeSettings.allow_partial_payments ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Late fee</span>
                  <span className="record-metric-value">
                    {formatMoney(
                      feeSettings.late_fee_flat_amount,
                      feeSettings.currency_code,
                    )}
                  </span>
                </div>
                <div className="record-metric">
                  <span className="record-metric-label">Receipt prefix</span>
                  <span className="record-metric-value">{feeSettings.receipt_prefix}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-950">Enabled payment methods</p>
                {enabledPaymentMethods.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {enabledPaymentMethods.map((method) => (
                      <span key={method.id || method.method_code} className="chip">
                        {method.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No methods are enabled yet for this school.
                  </p>
                )}
              </div>

              <p>
                Grace period: {feeSettings.late_fee_grace_days} day
                {feeSettings.late_fee_grace_days === 1 ? "" : "s"} before the late fee applies.
              </p>

              <Link className="button-secondary" href="/admin/settings">
                Open billing settings
              </Link>
            </div>
          </WorkspaceSection>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <WorkspaceSection
          title="Fee plan catalog"
          description="Maintain reusable billing plans by grade and recurrence. Plans can be paused or updated without leaving the page."
          action={
            <span className="chip">
              {visiblePlans.length} of {feePlans.length} visible
            </span>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="field">
                <span className="field-label">Search</span>
                <input
                  value={planSearchValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    startTransition(() => setPlanSearchValue(nextValue));
                  }}
                  className="field-input"
                  placeholder="Search by plan, title, or grade"
                />
              </label>
              <label className="field">
                <span className="field-label">Grade</span>
                <select
                  value={planGradeFilter}
                  onChange={(event) => setPlanGradeFilter(event.target.value)}
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
              <label className="field">
                <span className="field-label">Recurrence</span>
                <select
                  value={planRecurrenceFilter}
                  onChange={(event) => setPlanRecurrenceFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All schedules</option>
                  {planRecurrences.map((recurrence) => (
                    <option key={recurrence} value={recurrence}>
                      {formatLabel(recurrence)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {displayedPlans.length > 0 ? (
              <div className="record-stack">
                {displayedPlans.map((plan) => (
                  <article key={plan.id} className="record-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {plan.plan_code}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {plan.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Grade {plan.grade_level} billing template
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={planTone(plan.active)}>
                          {plan.active ? "Active" : "Inactive"}
                        </StatusPill>
                        <span className="chip">{formatLabel(plan.recurrence)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="record-metric">
                        <span className="record-metric-label">Amount</span>
                        <span className="record-metric-value">
                          {formatMoney(plan.amount, feeSettings.currency_code)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Grade</span>
                        <span className="record-metric-value">{plan.grade_level}</span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Recurrence</span>
                        <span className="record-metric-value">
                          {formatLabel(plan.recurrence)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Availability</span>
                        <span className="record-metric-value">
                          {plan.active ? "Ready to invoice" : "Paused"}
                        </span>
                      </div>
                    </div>

                    <details className="record-details">
                      <summary>Edit fee plan</summary>
                      <form action={updateFeePlanAction} className="mt-4 space-y-4">
                        <input type="hidden" name="plan_id" value={plan.id} />
                        <div className="form-grid">
                          <label className="field">
                            <span className="field-label">Plan code</span>
                            <input
                              name="plan_code"
                              defaultValue={plan.plan_code}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Title</span>
                            <input
                              name="title"
                              defaultValue={plan.title}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Grade level</span>
                            <input
                              name="grade_level"
                              defaultValue={plan.grade_level}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Amount</span>
                            <input
                              name="amount"
                              type="number"
                              min="1"
                              step="0.01"
                              defaultValue={plan.amount}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Recurrence</span>
                            <select
                              name="recurrence"
                              defaultValue={plan.recurrence}
                              className="field-select"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="term">Term</option>
                              <option value="one_time">One time</option>
                            </select>
                          </label>
                          <label className="field">
                            <span className="field-label">Status</span>
                            <select
                              name="active"
                              defaultValue={String(plan.active)}
                              className="field-select"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </label>
                        </div>

                        <FormSubmitButton pendingLabel="Updating...">
                          Save plan
                        </FormSubmitButton>
                      </form>
                    </details>

                    <form
                      action={deleteFeePlanAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Delete ${plan.plan_code}? Existing linked invoices will become custom invoices.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                      className="mt-3 flex justify-end"
                    >
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <FormSubmitButton variant="danger" pendingLabel="Deleting...">
                        Delete plan
                      </FormSubmitButton>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">
                  No fee plans match this filter.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Try a different grade or recurrence to bring the plan catalog back into view.
                </p>
              </div>
            )}

            {visiblePlans.length > displayedPlans.length ? (
              <p className="text-xs text-slate-500">
                Showing the first {displayedPlans.length} plans to keep the catalog responsive.
              </p>
            ) : null}
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          title="Payment correction ledger"
          description="Recent payment records stay visible for audit and can be removed if finance posts the wrong method, amount, or reference."
          action={
            <span className="chip">
              {visiblePayments.length} of {feePayments.length} visible
            </span>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.8fr)]">
              <label className="field">
                <span className="field-label">Search</span>
                <input
                  value={paymentSearchValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    startTransition(() => setPaymentSearchValue(nextValue));
                  }}
                  className="field-input"
                  placeholder="Search by invoice, student, method, or reference"
                />
              </label>

              <label className="field">
                <span className="field-label">Method</span>
                <select
                  value={paymentMethodFilter}
                  onChange={(event) => setPaymentMethodFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All methods</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id || method.method_code} value={method.method_code}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {displayedPayments.length > 0 ? (
              <div className="record-stack">
                {displayedPayments.map((payment) => (
                  <article key={payment.id} className="record-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {payment.invoice_code}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {formatMoney(payment.amount_paid, feeSettings.currency_code)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">{payment.student_name}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip">
                          {methodLabelMap.get(payment.method) ?? formatLabel(payment.method)}
                        </span>
                        <StatusPill tone="neutral">{formatDate(payment.payment_date)}</StatusPill>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="record-metric">
                        <span className="record-metric-label">Reference</span>
                        <span className="record-metric-value">
                          {payment.reference_no || "Not captured"}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Method code</span>
                        <span className="record-metric-value">
                          {formatLabel(payment.method)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Recorded on</span>
                        <span className="record-metric-value">
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                    </div>

                    <form
                      action={deleteFeePaymentAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Delete this payment on ${payment.invoice_code}? You can re-record it immediately with the correct amount or method.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                      className="mt-4 flex flex-wrap justify-end gap-2"
                    >
                      <Link
                        href={`/admin/fees/print/${payment.invoice_id}?paymentId=${payment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="button-secondary"
                      >
                        Receipt
                      </Link>
                      <input type="hidden" name="payment_id" value={payment.id} />
                      <FormSubmitButton variant="ghost" pendingLabel="Removing...">
                        Delete and correct
                      </FormSubmitButton>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">
                  No payments match this filter.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Clear the method filter or search for a different receipt reference.
                </p>
              </div>
            )}

            {visiblePayments.length > displayedPayments.length ? (
              <p className="text-xs text-slate-500">
                Showing the first {displayedPayments.length} payments so the ledger stays fast to scan.
              </p>
            ) : null}
          </div>
        </WorkspaceSection>
      </div>
    </WorkspaceShell>
  );
}

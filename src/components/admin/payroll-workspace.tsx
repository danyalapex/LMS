"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import {
  createPayrollCycleAction,
  createPayrollEntryAction,
  updatePayrollCycleStatusAction,
  updatePayrollEntryStatusAction,
} from "@/app/actions/lms";
import {
  StatusPill,
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatDate, formatLabel, formatMoney } from "@/lib/lms/format";
import type {
  PayrollCycleItem,
  PayrollEntryItem,
  StaffListItem,
} from "@/lib/lms/queries";

type PayrollWorkspaceProps = {
  cycles: PayrollCycleItem[];
  entries: PayrollEntryItem[];
  staff: StaffListItem[];
  currencyCode: string;
};

const entryTransitions: Record<string, string[]> = {
  draft: ["pending_approval", "rejected"],
  pending_approval: ["approved", "rejected"],
  approved: ["paid", "rejected"],
  rejected: ["pending_approval"],
  paid: [],
};

const cycleStatuses = ["draft", "pending_approval", "approved", "paid", "rejected"];

function statusTone(status: string) {
  if (status === "paid" || status === "approved") return "good" as const;
  if (status === "rejected") return "warn" as const;
  return "neutral" as const;
}

export function PayrollWorkspace({
  cycles,
  entries,
  staff,
  currencyCode,
}: PayrollWorkspaceProps) {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const deferredSearch = useDeferredValue(searchValue);

  const cycleMap = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const visibleEntries = entries.filter((entry) => {
    const cycle = cycleMap.get(entry.payroll_cycle_id);
    const haystack = [
      `${entry.first_name} ${entry.last_name}`,
      entry.employee_code,
      entry.status,
      cycle?.cycle_code ?? "",
      cycle?.period_start ?? "",
      cycle?.period_end ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      haystack.includes(deferredSearch.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;
    const matchesCycle =
      cycleFilter === "all" || entry.payroll_cycle_id === cycleFilter;

    return matchesSearch && matchesStatus && matchesCycle;
  });

  const visibleCycles = cycles.filter((cycle) => {
    const relatedEntries = entries.filter((entry) => entry.payroll_cycle_id === cycle.id);
    const haystack = [
      cycle.cycle_code,
      cycle.status,
      cycle.period_start,
      cycle.period_end,
      String(relatedEntries.length),
    ]
      .join(" ")
      .toLowerCase();

    return (
      deferredSearch.trim().length === 0 ||
      haystack.includes(deferredSearch.trim().toLowerCase())
    );
  });

  const pendingApprovalCount = entries.filter(
    (entry) => entry.status === "pending_approval",
  ).length;
  const approvedNet = entries
    .filter((entry) => entry.status === "approved" || entry.status === "paid")
    .reduce((sum, entry) => sum + entry.net_amount, 0);
  const paidEntries = entries.filter((entry) => entry.status === "paid").length;

  return (
    <WorkspaceShell
      eyebrow="Payroll operations"
      title="Compensation cycles and approval flow"
      description="Run payroll from one workspace: open cycles, queue staff entries, move records through approval, and keep finance teams out of manual side sheets."
      stats={[
        {
          label: "Payroll cycles",
          value: String(cycles.length),
          helper: "Open and historical processing windows for payroll.",
          tone: "accent",
        },
        {
          label: "Entries queued",
          value: String(entries.length),
          helper: "Compensation records currently loaded in the system.",
          tone: "neutral",
        },
        {
          label: "Pending approval",
          value: String(pendingApprovalCount),
          helper: "Entries waiting for finance or admin review.",
          tone: pendingApprovalCount > 0 ? "warn" : "neutral",
        },
        {
          label: "Approved value",
          value: formatMoney(approvedNet, currencyCode),
          helper: "Net payroll already approved or paid.",
          tone: "neutral",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_390px]">
        <WorkspaceSection
          title="Entry control board"
          description="Search payroll records by staff member, cycle, or status, then move each entry through the approval workflow."
          action={
            <span className="chip">
              {visibleEntries.length} of {entries.length} visible
            </span>
          }
        >
          <div className="space-y-4">
            <div className="toolbar-grid">
              <label className="field">
                <span className="field-label">Search</span>
                <input
                  value={searchValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    startTransition(() => setSearchValue(nextValue));
                  }}
                  className="field-input"
                  placeholder="Search by staff, employee code, or cycle"
                />
              </label>

              <label className="field">
                <span className="field-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All statuses</option>
                  {Object.keys(entryTransitions).map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Cycle</span>
                <select
                  value={cycleFilter}
                  onChange={(event) => setCycleFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All cycles</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.cycle_code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleEntries.length > 0 ? (
              <div className="record-stack">
                {visibleEntries.map((entry) => {
                  const cycle = cycleMap.get(entry.payroll_cycle_id);
                  const nextStatuses = entryTransitions[entry.status] ?? [];

                  return (
                    <article key={entry.id} className="record-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {entry.employee_code}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                            {entry.first_name} {entry.last_name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {cycle?.cycle_code ?? "Cycle missing"} |{" "}
                            {cycle ? `${formatDate(cycle.period_start)} to ${formatDate(cycle.period_end)}` : "No period"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={statusTone(entry.status)}>
                            {formatLabel(entry.status)}
                          </StatusPill>
                          {cycle ? <span className="chip">{cycle.cycle_code}</span> : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="record-metric">
                          <span className="record-metric-label">Gross</span>
                          <span className="record-metric-value">
                            {formatMoney(entry.gross_amount, currencyCode)}
                          </span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Deductions</span>
                          <span className="record-metric-value">
                            {formatMoney(entry.deductions, currencyCode)}
                          </span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Net</span>
                          <span className="record-metric-value">
                            {formatMoney(entry.net_amount, currencyCode)}
                          </span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Cycle status</span>
                          <span className="record-metric-value">
                            {cycle ? formatLabel(cycle.status) : "-"}
                          </span>
                        </div>
                      </div>

                      {nextStatuses.length > 0 ? (
                        <form
                          action={updatePayrollEntryStatusAction}
                          className="mt-4 flex flex-wrap items-end gap-3"
                        >
                          <input type="hidden" name="entry_id" value={entry.id} />
                          <label className="field min-w-[220px]">
                            <span className="field-label">Move to</span>
                            <select name="next_status" className="field-select" defaultValue={nextStatuses[0]}>
                              {nextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {formatLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <FormSubmitButton variant="secondary" pendingLabel="Updating...">
                            Update status
                          </FormSubmitButton>
                        </form>
                      ) : (
                        <p className="mt-4 text-sm text-slate-600">
                          This entry has reached the end of its workflow.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">No payroll entries match this filter.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Try a broader search or switch back to all statuses and cycles.
                </p>
              </div>
            )}
          </div>
        </WorkspaceSection>

        <div className="space-y-5">
          <WorkspaceSection
            tone="accent"
            title="Open payroll cycle"
            description="Start a new payroll window with a clear date range for finance processing."
          >
            <form action={createPayrollCycleAction} className="space-y-4">
              <div className="form-grid">
                <label className="field field-span-2">
                  <span className="field-label">Cycle code</span>
                  <input
                    name="cycle_code"
                    className="field-input"
                    placeholder="P-2026-05"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Period start</span>
                  <input name="period_start" type="date" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Period end</span>
                  <input name="period_end" type="date" className="field-input" required />
                </label>
              </div>

              <FormSubmitButton pendingLabel="Creating...">Create cycle</FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Add payroll entry"
            description="Load an employee record into a cycle with gross and deduction values."
            action={
              <Link href="/admin/workflows" className="button-secondary">
                Open workflows
              </Link>
            }
          >
            <form action={createPayrollEntryAction} className="space-y-4">
              <div className="form-grid">
                <label className="field field-span-2">
                  <span className="field-label">Cycle</span>
                  <select name="payroll_cycle_id" className="field-select" required>
                    <option value="">Select cycle</option>
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.cycle_code} ({formatLabel(cycle.status)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-span-2">
                  <span className="field-label">Staff member</span>
                  <select name="staff_profile_id" className="field-select" required>
                    <option value="">Select staff</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.employee_code} - {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Gross amount</span>
                  <input
                    name="gross_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Deductions</span>
                  <input
                    name="deductions"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="field-input"
                  />
                </label>
              </div>

              <FormSubmitButton variant="secondary" pendingLabel="Adding...">
                Add entry
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Payroll snapshot"
            description="A quick sense of where processing stands before you jump into approvals."
          >
            <div className="space-y-3 text-sm text-slate-600">
              <p>{paidEntries} entries have already been marked paid.</p>
              <p>{pendingApprovalCount} entries are waiting on action right now.</p>
              <p>{staff.length} staff profiles are available for payroll loading.</p>
            </div>
          </WorkspaceSection>
        </div>
      </div>

      <WorkspaceSection
        title="Cycle directory"
        description="Review payroll windows, see how many entries belong to each cycle, and move cycles forward as finance closes them."
        action={<span className="chip">{visibleCycles.length} cycles visible</span>}
      >
        {visibleCycles.length > 0 ? (
          <div className="record-stack">
            {visibleCycles.map((cycle) => {
              const cycleEntries = entries.filter((entry) => entry.payroll_cycle_id === cycle.id);
              const totalNet = cycleEntries.reduce((sum, entry) => sum + entry.net_amount, 0);
              const availableStatuses = cycleStatuses.filter((status) => status !== cycle.status);

              return (
                <article key={cycle.id} className="record-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Payroll cycle
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                        {cycle.cycle_code}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDate(cycle.period_start)} to {formatDate(cycle.period_end)}
                      </p>
                    </div>

                    <StatusPill tone={statusTone(cycle.status)}>
                      {formatLabel(cycle.status)}
                    </StatusPill>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="record-metric">
                      <span className="record-metric-label">Entries</span>
                      <span className="record-metric-value">{cycleEntries.length}</span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Net value</span>
                      <span className="record-metric-value">
                        {formatMoney(totalNet, currencyCode)}
                      </span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Approved items</span>
                      <span className="record-metric-value">
                        {
                          cycleEntries.filter(
                            (entry) => entry.status === "approved" || entry.status === "paid",
                          ).length
                        }
                      </span>
                    </div>
                    <div className="record-metric">
                      <span className="record-metric-label">Pending items</span>
                      <span className="record-metric-value">
                        {
                          cycleEntries.filter((entry) => entry.status === "pending_approval")
                            .length
                        }
                      </span>
                    </div>
                  </div>

                  <form
                    action={updatePayrollCycleStatusAction}
                    className="mt-4 flex flex-wrap items-end gap-3"
                  >
                    <input type="hidden" name="cycle_id" value={cycle.id} />
                    <label className="field min-w-[240px]">
                      <span className="field-label">Move cycle to</span>
                      <select
                        name="next_status"
                        defaultValue={availableStatuses[0] ?? cycle.status}
                        className="field-select"
                        disabled={availableStatuses.length === 0}
                      >
                        {availableStatuses.length > 0 ? (
                          availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))
                        ) : (
                          <option value={cycle.status}>{formatLabel(cycle.status)}</option>
                        )}
                      </select>
                    </label>
                    <FormSubmitButton
                      variant="secondary"
                      pendingLabel="Updating..."
                      disabled={availableStatuses.length === 0}
                    >
                      Update cycle
                    </FormSubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-lg font-semibold text-slate-950">No payroll cycles match this search.</p>
            <p className="mt-1 text-sm text-slate-600">
              Clear the search field to see the full payroll calendar again.
            </p>
          </div>
        )}
      </WorkspaceSection>
    </WorkspaceShell>
  );
}

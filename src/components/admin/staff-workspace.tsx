"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  createStaffAction,
  deleteStaffAction,
  updateStaffAction,
} from "@/app/actions/lms";
import {
  StatusPill,
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatCurrency, formatDate, formatLabel } from "@/lib/lms/format";
import type { StaffListItem } from "@/lib/lms/queries";

type StaffWorkspaceProps = {
  staff: StaffListItem[];
};

function toneForStaffStatus(status: string) {
  if (status === "active") return "good" as const;
  if (status === "inactive") return "warn" as const;
  return "neutral" as const;
}

export function StaffWorkspace({ staff }: StaffWorkspaceProps) {
  const [searchValue, setSearchValue] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const deferredSearch = useDeferredValue(searchValue);

  const departments = [...new Set(staff.map((member) => member.department))].sort();
  const visibleStaff = staff.filter((member) => {
    const haystack = [
      `${member.first_name} ${member.last_name}`,
      member.email,
      member.phone ?? "",
      member.employee_code,
      member.department,
      member.designation,
      member.role,
      member.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      haystack.includes(deferredSearch.trim().toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || member.department === departmentFilter;
    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesDepartment && matchesRole;
  });

  const teacherCount = staff.filter((member) => member.role === "teacher").length;
  const financeCount = staff.filter((member) => member.role === "finance").length;
  const payrollRunway = staff.reduce(
    (total, member) => total + member.monthly_salary,
    0,
  );

  return (
    <WorkspaceShell
      eyebrow="Staff operations"
      title="Workforce directory and staffing controls"
      description="Track teacher and finance profiles, keep workforce data clean, and manage operational roles without bouncing between separate admin pages."
      stats={[
        {
          label: "Total staff",
          value: String(staff.length),
          helper: "Teacher and finance profiles in the institution.",
          tone: "accent",
        },
        {
          label: "Teachers",
          value: String(teacherCount),
          helper: "Instructional staff available for courses and attendance.",
          tone: "neutral",
        },
        {
          label: "Finance users",
          value: String(financeCount),
          helper: "Staff with access to billing and payroll flows.",
          tone: "warn",
        },
        {
          label: "Monthly payroll",
          value: formatCurrency(payrollRunway),
          helper: "Current salary exposure from staff profiles.",
          tone: "neutral",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <WorkspaceSection
          title="Operational directory"
          description="Search by person, code, function, or contact field. Update each record inline without leaving the directory."
          action={
            <span className="chip">
              {visibleStaff.length} of {staff.length} visible
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
                  placeholder="Search by name, code, department, or email"
                />
              </label>

              <label className="field">
                <span className="field-label">Department</span>
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All roles</option>
                  <option value="teacher">Teacher</option>
                  <option value="finance">Finance</option>
                </select>
              </label>
            </div>

            {visibleStaff.length > 0 ? (
              <div className="record-stack">
                {visibleStaff.map((member) => (
                  <article key={member.id} className="record-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {member.employee_code}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {member.first_name} {member.last_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">{member.email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={toneForStaffStatus(member.status)}>
                          {formatLabel(member.status)}
                        </StatusPill>
                        <span className="chip capitalize">{formatLabel(member.role)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="record-metric">
                        <span className="record-metric-label">Department</span>
                        <span className="record-metric-value">{member.department}</span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Designation</span>
                        <span className="record-metric-value">{member.designation}</span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Hire date</span>
                        <span className="record-metric-value">
                          {formatDate(member.hire_date)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Monthly salary</span>
                        <span className="record-metric-value">
                          {formatCurrency(member.monthly_salary)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {member.phone ? `Direct contact: ${member.phone}` : "No phone number captured yet."}
                    </p>

                    <details className="record-details">
                      <summary>Edit staff profile</summary>
                      <form action={updateStaffAction} className="mt-4 space-y-4">
                        <input type="hidden" name="staff_profile_id" value={member.id} />
                        <input type="hidden" name="user_id" value={member.user_id} />

                        <div className="form-grid">
                          <label className="field">
                            <span className="field-label">First name</span>
                            <input
                              name="first_name"
                              defaultValue={member.first_name}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Last name</span>
                            <input
                              name="last_name"
                              defaultValue={member.last_name}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Email</span>
                            <input
                              name="email"
                              type="email"
                              defaultValue={member.email}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Phone</span>
                            <input
                              name="phone"
                              defaultValue={member.phone ?? ""}
                              className="field-input"
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Employee code</span>
                            <input
                              name="employee_code"
                              defaultValue={member.employee_code}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Department</span>
                            <input
                              name="department"
                              defaultValue={member.department}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Designation</span>
                            <input
                              name="designation"
                              defaultValue={member.designation}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Hire date</span>
                            <input
                              name="hire_date"
                              type="date"
                              defaultValue={member.hire_date}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Monthly salary</span>
                            <input
                              name="monthly_salary"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={member.monthly_salary}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Operational role</span>
                            <select
                              name="role"
                              defaultValue={member.role}
                              className="field-select"
                            >
                              <option value="teacher">Teacher</option>
                              <option value="finance">Finance</option>
                            </select>
                          </label>
                          <label className="field">
                            <span className="field-label">Status</span>
                            <select
                              name="status"
                              defaultValue={member.status}
                              className="field-select"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="on_leave">On leave</option>
                            </select>
                          </label>
                        </div>

                        <FormSubmitButton pendingLabel="Updating...">
                          Save changes
                        </FormSubmitButton>
                      </form>
                    </details>

                    <form
                      action={deleteStaffAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Delete ${member.first_name} ${member.last_name}? This will remove the linked user account and unassign their operational access.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                      className="mt-3 flex justify-end"
                    >
                      <input type="hidden" name="staff_profile_id" value={member.id} />
                      <FormSubmitButton
                        variant="danger"
                        pendingLabel="Deleting..."
                      >
                        Delete profile
                      </FormSubmitButton>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">No staff match this filter.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Try a broader query or switch back to all departments and roles.
                </p>
              </div>
            )}
          </div>
        </WorkspaceSection>

        <div className="space-y-5">
          <WorkspaceSection
            tone="accent"
            title="Register staff"
            description="Capture the operational details needed for payroll, timetabling, and permissions."
          >
            <form action={createStaffAction} className="space-y-4">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">First name</span>
                  <input name="first_name" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Last name</span>
                  <input name="last_name" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input name="email" type="email" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Phone</span>
                  <input name="phone" className="field-input" placeholder="Optional" />
                </label>
                <label className="field">
                  <span className="field-label">Employee code</span>
                  <input name="employee_code" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Department</span>
                  <input name="department" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Designation</span>
                  <input name="designation" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Hire date</span>
                  <input name="hire_date" type="date" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Monthly salary</span>
                  <input
                    name="monthly_salary"
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Operational role</span>
                  <select name="role" defaultValue="teacher" className="field-select">
                    <option value="teacher">Teacher</option>
                    <option value="finance">Finance</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Status</span>
                  <select name="status" defaultValue="active" className="field-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On leave</option>
                  </select>
                </label>
              </div>

              <FormSubmitButton pendingLabel="Creating...">
                Add staff member
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Why this is more scalable"
            description="The page is built for an operations team, not just for one-off inserts."
          >
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                You can now filter by department and role, which matters once the
                institution moves past a small founding team.
              </p>
              <p>
                Payroll-facing data, permissions, and contact details live in the same
                record so staff ops are easier to audit.
              </p>
              <p>
                Inline edits mean day-to-day corrections do not require a custom admin
                endpoint or a separate maintenance screen.
              </p>
            </div>
          </WorkspaceSection>
        </div>
      </div>
    </WorkspaceShell>
  );
}

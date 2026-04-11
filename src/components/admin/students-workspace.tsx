"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  createStudentAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/actions/lms";
import {
  StatusPill,
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatDate, formatLabel } from "@/lib/lms/format";
import type { StudentListItem } from "@/lib/lms/queries";

type StudentsWorkspaceProps = {
  students: StudentListItem[];
};

function statusTone(status: string) {
  if (status === "active") return "good" as const;
  if (status === "inactive") return "warn" as const;
  return "neutral" as const;
}

export function StudentsWorkspace({ students }: StudentsWorkspaceProps) {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const deferredSearch = useDeferredValue(searchValue);

  const grades = [...new Set(students.map((student) => student.grade_level))].sort();
  const visibleStudents = students.filter((student) => {
    const haystack = [
      `${student.first_name} ${student.last_name}`,
      student.email,
      student.phone ?? "",
      student.student_code,
      student.grade_level,
      student.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      haystack.includes(deferredSearch.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" || student.status === statusFilter;
    const matchesGrade =
      gradeFilter === "all" || student.grade_level === gradeFilter;

    return matchesSearch && matchesStatus && matchesGrade;
  });

  const activeStudents = students.filter((student) => student.status === "active").length;
  const withPhone = students.filter((student) => Boolean(student.phone)).length;
  const newestAdmission = students[0]?.admission_date ?? null;

  return (
    <WorkspaceShell
      eyebrow="Student operations"
      title="Student lifecycle workspace"
      description="Run admissions, keep contact data clean, and update academic roster records from one searchable workspace."
      stats={[
        {
          label: "Total records",
          value: String(students.length),
          helper: "Student profiles currently available to admins.",
          tone: "accent",
        },
        {
          label: "Active students",
          value: String(activeStudents),
          helper: "Profiles marked active and ready for daily operations.",
          tone: "neutral",
        },
        {
          label: "With contact phone",
          value: String(withPhone),
          helper: "Families reachable without opening another system.",
          tone: "neutral",
        },
        {
          label: "Latest admission",
          value: newestAdmission ? formatDate(newestAdmission) : "-",
          helper: "Most recently admitted student on the roster.",
          tone: "warn",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <WorkspaceSection
          title="Searchable roster"
          description="Filter the directory by grade, status, or any student detail. Each card includes inline update and delete actions."
          action={
            <span className="chip">
              {visibleStudents.length} of {students.length} visible
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
                  placeholder="Search by name, code, phone, or email"
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On leave</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Grade</span>
                <select
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
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

            {visibleStudents.length > 0 ? (
              <div className="record-stack">
                {visibleStudents.map((student) => (
                  <article key={student.id} className="record-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {student.student_code}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">{student.email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={statusTone(student.status)}>
                          {formatLabel(student.status)}
                        </StatusPill>
                        <span className="chip">Grade {student.grade_level}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="record-metric">
                        <span className="record-metric-label">Admission</span>
                        <span className="record-metric-value">
                          {formatDate(student.admission_date)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Phone</span>
                        <span className="record-metric-value">
                          {student.phone || "Not captured"}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Status</span>
                        <span className="record-metric-value capitalize">
                          {formatLabel(student.status)}
                        </span>
                      </div>
                      <div className="record-metric">
                        <span className="record-metric-label">Academic band</span>
                        <span className="record-metric-value">{student.grade_level}</span>
                      </div>
                    </div>

                    <details className="record-details">
                      <summary>Edit student record</summary>
                      <form action={updateStudentAction} className="mt-4 space-y-4">
                        <input type="hidden" name="student_id" value={student.id} />
                        <input type="hidden" name="user_id" value={student.user_id} />

                        <div className="form-grid">
                          <label className="field">
                            <span className="field-label">First name</span>
                            <input
                              name="first_name"
                              defaultValue={student.first_name}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Last name</span>
                            <input
                              name="last_name"
                              defaultValue={student.last_name}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Email</span>
                            <input
                              name="email"
                              type="email"
                              defaultValue={student.email}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Phone</span>
                            <input
                              name="phone"
                              defaultValue={student.phone ?? ""}
                              className="field-input"
                              placeholder="Optional family contact"
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Student code</span>
                            <input
                              name="student_code"
                              defaultValue={student.student_code}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Grade</span>
                            <input
                              name="grade_level"
                              defaultValue={student.grade_level}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Admission date</span>
                            <input
                              name="admission_date"
                              type="date"
                              defaultValue={student.admission_date}
                              className="field-input"
                              required
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Status</span>
                            <select
                              name="status"
                              defaultValue={student.status}
                              className="field-select"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="on_leave">On leave</option>
                            </select>
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <FormSubmitButton pendingLabel="Updating...">
                            Save changes
                          </FormSubmitButton>
                        </div>
                      </form>
                    </details>

                    <form
                      action={deleteStudentAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Delete ${student.first_name} ${student.last_name}? This will remove the linked student record and related dependent mappings.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                      className="mt-3 flex justify-end"
                    >
                      <input type="hidden" name="student_id" value={student.id} />
                      <FormSubmitButton
                        variant="danger"
                        pendingLabel="Deleting..."
                      >
                        Delete record
                      </FormSubmitButton>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">No students match this filter.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Try broadening the search or switching back to all grades and statuses.
                </p>
              </div>
            )}
          </div>
        </WorkspaceSection>

        <div className="space-y-5">
          <WorkspaceSection
            tone="accent"
            title="Register a new student"
            description="Capture the essentials for admissions, communication, and status tracking."
          >
            <form action={createStudentAction} className="space-y-4">
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
                  <span className="field-label">Student code</span>
                  <input name="student_code" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Grade</span>
                  <input name="grade_level" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Admission date</span>
                  <input
                    name="admission_date"
                    type="date"
                    className="field-input"
                    required
                  />
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
                Add student
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="What this page now handles"
            description="The workspace is meant to be operational, not just descriptive."
          >
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                Use the filters to narrow large rosters quickly by grade band, status,
                or contact detail.
              </p>
              <p>
                Every student card supports update and delete without leaving the
                directory, which keeps day-to-day admin work fast.
              </p>
              <p>
                Phone and status are now first-class fields, so admissions and support
                teams are not forced into side spreadsheets.
              </p>
            </div>
          </WorkspaceSection>
        </div>
      </div>
    </WorkspaceShell>
  );
}

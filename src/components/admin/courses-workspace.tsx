"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  assignTeacherToCourseAction,
  createCourseAction,
  deleteCourseAction,
  enrollStudentInCourseAction,
  removeStudentEnrollmentAction,
  updateCourseAction,
} from "@/app/actions/lms";
import {
  StatusPill,
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type {
  CourseEnrollmentDirectoryItem,
  CourseWithTeacherItem,
  StudentListItem,
  TeacherUserItem,
} from "@/lib/lms/queries";

type CoursesWorkspaceProps = {
  courses: CourseWithTeacherItem[];
  teachers: TeacherUserItem[];
  students: StudentListItem[];
  enrollments: CourseEnrollmentDirectoryItem[];
};

export function CoursesWorkspace({
  courses,
  teachers,
  students,
  enrollments,
}: CoursesWorkspaceProps) {
  const [searchValue, setSearchValue] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const deferredSearch = useDeferredValue(searchValue);

  const rosterByCourse = new Map<string, CourseEnrollmentDirectoryItem[]>();

  for (const enrollment of enrollments) {
    const current = rosterByCourse.get(enrollment.course_id) ?? [];
    current.push(enrollment);
    rosterByCourse.set(enrollment.course_id, current);
  }

  const grades = [...new Set(courses.map((course) => course.grade_level))].sort();
  const visibleCourses = courses.filter((course) => {
    const haystack = [
      course.code,
      course.title,
      course.grade_level,
      course.teacher_name,
      String(course.credit_hours),
      String(course.enrollment_count),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      haystack.includes(deferredSearch.trim().toLowerCase());
    const matchesGrade =
      gradeFilter === "all" || course.grade_level === gradeFilter;
    const matchesTeacher =
      teacherFilter === "all"
        ? true
        : teacherFilter === "unassigned"
          ? !course.teacher_user_id
          : course.teacher_user_id === teacherFilter;

    return matchesSearch && matchesGrade && matchesTeacher;
  });

  const totalEnrollments = courses.reduce(
    (total, course) => total + course.enrollment_count,
    0,
  );
  const unassignedCourses = courses.filter((course) => !course.teacher_user_id).length;
  const averageCredits =
    courses.length > 0
      ? (
          courses.reduce((total, course) => total + course.credit_hours, 0) /
          courses.length
        ).toFixed(1)
      : "0.0";

  return (
    <WorkspaceShell
      eyebrow="Academic structure"
      title="Course catalog, staffing, and enrollment"
      description="Manage the academic catalog from one place: create courses, assign teachers, enroll students, and maintain the roster without losing context."
      stats={[
        {
          label: "Courses",
          value: String(courses.length),
          helper: "Active academic records available for delivery.",
          tone: "accent",
        },
        {
          label: "Enrolled seats",
          value: String(totalEnrollments),
          helper: "Student-course links currently active in the system.",
          tone: "neutral",
        },
        {
          label: "Unassigned courses",
          value: String(unassignedCourses),
          helper: "Courses still missing a teacher owner.",
          tone: "warn",
        },
        {
          label: "Average credits",
          value: averageCredits,
          helper: "Mean credit load across the course catalog.",
          tone: "neutral",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_400px]">
        <WorkspaceSection
          title="Course directory"
          description="Search and filter the catalog, then update the course row, teacher owner, or enrolled roster directly from each card."
          action={
            <span className="chip">
              {visibleCourses.length} of {courses.length} visible
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
                  placeholder="Search by code, title, grade, or teacher"
                />
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

              <label className="field">
                <span className="field-label">Teacher</span>
                <select
                  value={teacherFilter}
                  onChange={(event) => setTeacherFilter(event.target.value)}
                  className="field-select"
                >
                  <option value="all">All assignments</option>
                  <option value="unassigned">Unassigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleCourses.length > 0 ? (
              <div className="record-stack">
                {visibleCourses.map((course) => {
                  const roster = rosterByCourse.get(course.id) ?? [];

                  return (
                    <article key={course.id} className="record-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {course.code}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                            {course.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {course.teacher_name}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={course.teacher_user_id ? "good" : "warn"}>
                            {course.teacher_user_id ? "Teacher assigned" : "Needs teacher"}
                          </StatusPill>
                          <span className="chip">Grade {course.grade_level}</span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="record-metric">
                          <span className="record-metric-label">Credit hours</span>
                          <span className="record-metric-value">{course.credit_hours}</span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Roster size</span>
                          <span className="record-metric-value">{course.enrollment_count}</span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Teacher</span>
                          <span className="record-metric-value">{course.teacher_name}</span>
                        </div>
                        <div className="record-metric">
                          <span className="record-metric-label">Delivery</span>
                          <span className="record-metric-value">
                            {course.teacher_user_id ? "Live" : "Pending setup"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            Enrolled students
                          </p>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {roster.length} linked
                          </span>
                        </div>

                        {roster.length > 0 ? (
                          <div className="space-y-2">
                            {roster.slice(0, 5).map((student) => (
                              <div
                                key={student.student_id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-white/75 px-3 py-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-950">
                                    {student.student_name}
                                  </p>
                                  <p className="text-xs text-slate-600">{student.student_code}</p>
                                </div>

                                <form action={removeStudentEnrollmentAction}>
                                  <input type="hidden" name="course_id" value={course.id} />
                                  <input
                                    type="hidden"
                                    name="student_id"
                                    value={student.student_id}
                                  />
                                  <FormSubmitButton
                                    variant="ghost"
                                    pendingLabel="Removing..."
                                  >
                                    Remove
                                  </FormSubmitButton>
                                </form>
                              </div>
                            ))}

                            {roster.length > 5 ? (
                              <p className="text-xs text-slate-500">
                                +{roster.length - 5} more students linked to this course.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-[color:var(--border)] bg-white/60 px-3 py-3 text-sm text-slate-600">
                            No students are enrolled yet. Use the quick enroll form to add learners.
                          </p>
                        )}
                      </div>

                      <details className="record-details">
                        <summary>Edit course setup</summary>
                        <form action={updateCourseAction} className="mt-4 space-y-4">
                          <input type="hidden" name="course_id" value={course.id} />

                          <div className="form-grid">
                            <label className="field">
                              <span className="field-label">Course code</span>
                              <input
                                name="code"
                                defaultValue={course.code}
                                className="field-input"
                                required
                              />
                            </label>
                            <label className="field">
                              <span className="field-label">Course title</span>
                              <input
                                name="title"
                                defaultValue={course.title}
                                className="field-input"
                                required
                              />
                            </label>
                            <label className="field">
                              <span className="field-label">Grade level</span>
                              <input
                                name="grade_level"
                                defaultValue={course.grade_level}
                                className="field-input"
                                required
                              />
                            </label>
                            <label className="field">
                              <span className="field-label">Credit hours</span>
                              <input
                                name="credit_hours"
                                type="number"
                                min="0.5"
                                step="0.5"
                                defaultValue={course.credit_hours}
                                className="field-input"
                                required
                              />
                            </label>
                            <label className="field field-span-2">
                              <span className="field-label">Assigned teacher</span>
                              <select
                                name="teacher_user_id"
                                defaultValue={course.teacher_user_id ?? ""}
                                className="field-select"
                              >
                                <option value="">Unassigned</option>
                                {teachers.map((teacher) => (
                                  <option key={teacher.user_id} value={teacher.user_id}>
                                    {teacher.full_name} ({teacher.email})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <FormSubmitButton pendingLabel="Updating...">
                            Save changes
                          </FormSubmitButton>
                        </form>
                      </details>

                      <form
                        action={deleteCourseAction}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Delete ${course.code} - ${course.title}? This will also remove linked timetable slots, enrollments, assignments, and attendance sessions.`,
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                        className="mt-3 flex justify-end"
                      >
                        <input type="hidden" name="course_id" value={course.id} />
                        <FormSubmitButton
                          variant="danger"
                          pendingLabel="Deleting..."
                        >
                          Delete course
                        </FormSubmitButton>
                      </form>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-lg font-semibold text-slate-950">No courses match this filter.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Clear one of the filters or search for a broader course keyword.
                </p>
              </div>
            )}
          </div>
        </WorkspaceSection>

        <div className="space-y-5">
          <WorkspaceSection
            tone="accent"
            title="Create course"
            description="Open a new catalog entry with credits and teacher ownership in one step."
          >
            <form action={createCourseAction} className="space-y-4">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Course code</span>
                  <input name="code" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Course title</span>
                  <input name="title" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Grade level</span>
                  <input name="grade_level" className="field-input" required />
                </label>
                <label className="field">
                  <span className="field-label">Credit hours</span>
                  <input
                    name="credit_hours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    defaultValue="1"
                    className="field-input"
                    required
                  />
                </label>
                <label className="field field-span-2">
                  <span className="field-label">Assigned teacher</span>
                  <select name="teacher_user_id" defaultValue="" className="field-select">
                    <option value="">Assign later</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.user_id} value={teacher.user_id}>
                        {teacher.full_name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <FormSubmitButton pendingLabel="Creating...">
                Add course
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Quick operations"
            description="Run common academic admin tasks without opening separate pages."
          >
            <div className="space-y-5">
              <form action={assignTeacherToCourseAction} className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Assign teacher</p>
                <label className="field">
                  <span className="field-label">Course</span>
                  <select name="course_id" className="field-select" required>
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Teacher</span>
                  <select name="teacher_user_id" className="field-select" defaultValue="">
                    <option value="">Unassign teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.user_id} value={teacher.user_id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <FormSubmitButton variant="secondary" pendingLabel="Saving...">
                  Save assignment
                </FormSubmitButton>
              </form>

              <div className="h-px bg-[color:var(--border)]" />

              <form action={enrollStudentInCourseAction} className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Enroll student</p>
                <label className="field">
                  <span className="field-label">Course</span>
                  <select name="course_id" className="field-select" required>
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
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
                <FormSubmitButton variant="secondary" pendingLabel="Enrolling...">
                  Enroll student
                </FormSubmitButton>
              </form>
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Relationship-aware LMS management"
            description="This page now covers the catalog and the key relationships around it."
          >
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                The directory tracks course ownership and roster size so admins can see
                setup gaps immediately.
              </p>
              <p>
                Student-course links are visible inside the course card, which makes the
                page useful for real roster work instead of just course creation.
              </p>
              <p>
                Inline updates, removals, and quick assignment forms keep academic setup
                in one scalable workflow.
              </p>
            </div>
          </WorkspaceSection>
        </div>
      </div>
    </WorkspaceShell>
  );
}


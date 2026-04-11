import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { requireIdentity } from "@/lib/auth";
import {
  getFeeInvoiceBalance,
  resolveFeeInvoiceStatus,
} from "@/lib/lms/billing";
import {
  createDefaultOrganizationFeeSettings,
  createDefaultOrganizationPaymentMethods,
  isMissingRelationError,
} from "@/lib/lms/school-rules";

type MaybeArray<T> = T | T[] | null;

function one<T>(value: MaybeArray<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getViewerOrganizationId() {
  const identity = await requireIdentity();
  return identity.organizationId;
}

export type StudentListItem = {
  id: string;
  user_id: string;
  student_code: string;
  grade_level: string;
  admission_date: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
};

export type StaffListItem = {
  id: string;
  user_id: string;
  employee_code: string;
  department: string;
  designation: string;
  hire_date: string;
  monthly_salary: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
};

export type PayrollCycleItem = {
  id: string;
  cycle_code: string;
  period_start: string;
  period_end: string;
  status: string;
};

export type PayrollEntryItem = {
  id: string;
  payroll_cycle_id: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  employee_code: string;
  first_name: string;
  last_name: string;
};

export type CourseItem = {
  id: string;
  code: string;
  title: string;
  grade_level: string;
};

export type TeacherAssignmentItem = {
  id: string;
  title: string;
  max_score: number;
  due_at: string | null;
  course_code: string;
  course_title: string;
};

export type StudentAssignmentItem = {
  assignment_id: string;
  assignment_title: string;
  assignment_details: string | null;
  assignment_max_score: number;
  assignment_due_at: string | null;
  course_id: string;
  course_code: string;
  course_title: string;
  submission_id: string | null;
  submitted_at: string | null;
  submission_content: string | null;
  submission_attachment_url: string | null;
  grade_score: number | null;
  grade_feedback: string | null;
  grade_graded_at: string | null;
  status: "pending" | "submitted" | "overdue" | "graded";
};

export type TeacherSubmissionItem = {
  submission_id: string;
  assignment_id: string;
  assignment_title: string;
  assignment_max_score: number;
  assignment_due_at: string | null;
  submitted_at: string | null;
  submission_content: string | null;
  submission_attachment_url: string | null;
  student_id: string;
  student_code: string;
  student_name: string;
  course_code: string;
  course_title: string;
  grade_score: number | null;
  grade_percentage: number | null;
  grade_letter: string | null;
  grade_points: number | null;
  grade_feedback: string | null;
  grade_graded_at: string | null;
};

export type CourseEnrollmentItem = {
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
};

export type CourseEnrollmentDirectoryItem = {
  course_id: string;
  student_id: string;
  student_code: string;
  student_name: string;
};

export type StudentGradeItem = {
  id: string;
  score: number;
  percentage: number | null;
  letter_grade: string | null;
  grade_points: number | null;
  feedback: string | null;
  graded_at: string;
  assignment_title: string;
  assignment_max_score: number;
  course_code: string;
  course_title: string;
};

export type OrganizationFeeSettingsItem = {
  id: string;
  organization_id: string;
  currency_code: string;
  allow_partial_payments: boolean;
  late_fee_grace_days: number;
  late_fee_flat_amount: number;
  receipt_prefix: string;
};

export type OrganizationPaymentMethodItem = {
  id: string;
  organization_id: string;
  method_code: string;
  label: string;
  instructions: string | null;
  enabled: boolean;
  account_details: Record<string, unknown>;
  sort_order: number;
};

export type OrganizationGradingBandItem = {
  id: string;
  grading_policy_id: string;
  band_label: string;
  min_percentage: number;
  max_percentage: number;
  grade_points: number | null;
  remarks: string | null;
  sort_order: number;
};

export type OrganizationGradingPolicyItem = {
  id: string;
  organization_id: string;
  policy_name: string;
  pass_mark: number;
  decimal_precision: number;
  is_default: boolean;
  created_at: string;
  bands: OrganizationGradingBandItem[];
};

export type CourseWithTeacherItem = {
  id: string;
  code: string;
  title: string;
  grade_level: string;
  credit_hours: number;
  enrollment_count: number;
  teacher_user_id: string | null;
  teacher_name: string;
};

export type TeacherUserItem = {
  user_id: string;
  full_name: string;
  email: string;
};

export type StudentAttendanceItem = {
  id: string;
  state: string;
  remarks: string | null;
  marked_at: string;
  session_date: string;
  period_label: string;
  course_code: string;
  course_title: string;
};

export type GuardianStudentViewItem = {
  student_id: string;
  student_code: string;
  student_name: string;
  relation: string;
};

export type GuardianUserItem = {
  user_id: string;
  full_name: string;
  email: string;
};

export type GuardianLinkRow = {
  guardian_name: string;
  guardian_email: string;
  student_name: string;
  student_code: string;
  relation: string;
};

export type GuardianStudentSummary = {
  student_id: string;
  grade_count: number;
  attendance_count: number;
};

export type TimetablePeriodItem = {
  id: string;
  period_code: string;
  title: string;
  start_time: string;
  end_time: string;
  sort_order: number;
};

export type TimetableEntryItem = {
  id: string;
  day_of_week: number;
  room_label: string;
  active: boolean;
  course_id: string;
  course_code: string;
  course_title: string;
  course_grade_level: string;
  period_id: string;
  period_code: string;
  period_title: string;
  period_start_time: string;
  period_end_time: string;
  period_sort_order: number;
  teacher_user_id: string | null;
  teacher_name: string;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type AttendanceDistributionItem = {
  state: string;
  count: number;
};

export type CoursePerformanceItem = {
  course_code: string;
  course_title: string;
  assessments: number;
  average_score: number;
};

export type PayrollCycleSummaryItem = {
  cycle_code: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  entries: number;
};

export type FeePlanItem = {
  id: string;
  plan_code: string;
  title: string;
  grade_level: string;
  amount: number;
  recurrence: string;
  active: boolean;
};

export type FeeInvoiceItem = {
  id: string;
  invoice_code: string;
  title: string;
  student_id: string;
  student_code: string;
  student_name: string;
  fee_plan_id: string | null;
  fee_plan_code: string;
  amount_due: number;
  total_paid: number;
  balance: number;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type FeePaymentItem = {
  id: string;
  invoice_id: string;
  invoice_code: string;
  student_id: string;
  student_name: string;
  amount_paid: number;
  payment_date: string;
  method: string;
  reference_no: string | null;
  created_at: string;
};

export type FeeInvoiceDocumentPaymentItem = {
  id: string;
  amount_paid: number;
  payment_date: string;
  method: string;
  reference_no: string | null;
  created_at: string;
  receipt_code: string;
};

export type FeeInvoiceDocumentItem = {
  id: string;
  invoice_code: string;
  title: string;
  student_id: string;
  student_code: string;
  student_name: string;
  student_grade_level: string;
  fee_plan_code: string;
  amount_due: number;
  total_paid: number;
  balance: number;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  organization_name: string;
  organization_contact_email: string | null;
  currency_code: string;
  receipt_prefix: string;
  payments: FeeInvoiceDocumentPaymentItem[];
};

export type StudentFeeInvoiceItem = {
  id: string;
  invoice_code: string;
  title: string;
  amount_due: number;
  total_paid: number;
  balance: number;
  due_date: string;
  status: string;
  notes: string | null;
};

export type FeeCollectionSummaryItem = {
  month: string;
  invoices: number;
  billed_amount: number;
  collected_amount: number;
  outstanding_amount: number;
};

export type InstitutionReportSnapshot = {
  student_count: number;
  staff_count: number;
  course_count: number;
  active_timetable_slots: number;
  average_score: number;
  attendance_distribution: AttendanceDistributionItem[];
};

export type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name: string;
};

export async function getAdminOverviewData() {
  const admin = createSupabaseAdminClient();

  const [
    studentsCount,
    staffCount,
    pendingPayrollCount,
    attendanceTodayCount,
  ] = await Promise.all([
    admin.from("students").select("id", { count: "exact", head: true }),
    admin.from("staff_profiles").select("id", { count: "exact", head: true }),
    admin
      .from("payroll_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    admin
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true })
      .eq("session_date", new Date().toISOString().slice(0, 10)),
  ]);

  return {
    studentCount: studentsCount.count ?? 0,
    staffCount: staffCount.count ?? 0,
    pendingPayrollCount: pendingPayrollCount.count ?? 0,
    attendanceTodayCount: attendanceTodayCount.count ?? 0,
  };
}

export async function listStudents(): Promise<StudentListItem[]> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();

  const { data: userRows, error: userError } = await admin
    .from("users")
    .select("id, first_name, last_name, email, phone, status")
    .eq("organization_id", organizationId)
    .limit(5000);

  if (userError) throw new Error(userError.message);

  const userMap = new Map(
    (userRows ?? []).map((row) => [
      row.id,
      {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
      },
    ]),
  );

  const userIds = [...userMap.keys()];
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("students")
    .select("id, user_id, student_code, grade_level, admission_date")
    .in("user_id", userIds)
    .order("admission_date", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const user = userMap.get(row.user_id);

    return {
      id: row.id,
      user_id: row.user_id,
      student_code: row.student_code,
      grade_level: row.grade_level,
      admission_date: row.admission_date,
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? null,
      status: user?.status ?? "active",
    };
  });
}

export async function listStaffProfiles(): Promise<StaffListItem[]> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();

  const { data: userRows, error: userError } = await admin
    .from("users")
    .select("id, first_name, last_name, email, phone, status")
    .eq("organization_id", organizationId)
    .limit(5000);

  if (userError) throw new Error(userError.message);

  const userMap = new Map(
    (userRows ?? []).map((row) => [
      row.id,
      {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
      },
    ]),
  );

  const userIds = [...userMap.keys()];
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("staff_profiles")
    .select("id, user_id, employee_code, department, designation, hire_date, monthly_salary")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const staffUserIds = (data ?? []).map((row) => row.user_id);
  const { data: roleRows, error: roleError } =
    staffUserIds.length === 0
      ? { data: [], error: null }
      : await admin
          .from("user_role_assignments")
          .select("user_id, role")
          .in("user_id", staffUserIds)
          .in("role", ["teacher", "finance", "admin"]);

  if (roleError) throw new Error(roleError.message);

  const rolePriority: Record<string, number> = {
    finance: 1,
    teacher: 2,
    admin: 3,
  };
  const roleMap = new Map<string, string>();

  for (const row of roleRows ?? []) {
    const current = roleMap.get(row.user_id);
    if (!current || rolePriority[row.role] < rolePriority[current]) {
      roleMap.set(row.user_id, row.role);
    }
  }

  return (data ?? []).map((row) => {
    const user = userMap.get(row.user_id);

    return {
      id: row.id,
      user_id: row.user_id,
      employee_code: row.employee_code,
      department: row.department,
      designation: row.designation,
      hire_date: row.hire_date,
      monthly_salary: Number(row.monthly_salary),
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? null,
      status: user?.status ?? "active",
      role: roleMap.get(row.user_id) ?? "teacher",
    };
  });
}

export async function listPayrollCyclesWithEntries(): Promise<{
  cycles: PayrollCycleItem[];
  entries: PayrollEntryItem[];
}> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();

  const { data: cycles, error: cycleError } = await admin
    .from("payroll_cycles")
    .select("id, cycle_code, period_start, period_end, status")
    .eq("organization_id", organizationId)
    .order("period_start", { ascending: false })
    .limit(12);

  if (cycleError) throw new Error(cycleError.message);
  const cycleIds = (cycles ?? []).map((c) => c.id);

  if (cycleIds.length === 0) {
    return {
      cycles: (cycles ?? []).map((row) => ({
        id: row.id,
        cycle_code: row.cycle_code,
        period_start: row.period_start,
        period_end: row.period_end,
        status: row.status,
      })),
      entries: [],
    };
  }

  const { data: entries, error: entryError } = await admin
    .from("payroll_entries")
    .select(
      "id, payroll_cycle_id, gross_amount, deductions, net_amount, status, staff_profiles!payroll_entries_staff_profile_id_fkey(employee_code, users!staff_profiles_user_id_fkey(first_name,last_name))",
    )
    .in("payroll_cycle_id", cycleIds)
    .order("id", { ascending: false })
    .limit(100);

  if (entryError) throw new Error(entryError.message);

  return {
    cycles: (cycles ?? []).map((row) => ({
      id: row.id,
      cycle_code: row.cycle_code,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
    })),
    entries: (entries ?? []).map((row) => {
      const staff = one(
        row.staff_profiles as MaybeArray<{
          employee_code: string;
          users: MaybeArray<{ first_name: string; last_name: string }>;
        }>,
      );
      const user = one(staff?.users ?? null);

      return {
        id: row.id,
        payroll_cycle_id: row.payroll_cycle_id,
        gross_amount: Number(row.gross_amount),
        deductions: Number(row.deductions),
        net_amount: Number(row.net_amount),
        status: row.status,
        employee_code: staff?.employee_code ?? "",
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
      };
    }),
  };
}

export async function listCoursesForTeacher(authUserId: string): Promise<CourseItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data, error } = await admin
    .from("courses")
    .select("id, code, title, grade_level")
    .eq("teacher_user_id", user.id)
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    grade_level: row.grade_level,
  }));
}

export async function listAllCourses(): Promise<CourseWithTeacherItem[]> {
  const admin = createSupabaseAdminClient();

  const [courseRows, enrollmentRows] = await Promise.all([
    admin
      .from("courses")
      .select(
        "id, code, title, grade_level, credit_hours, teacher_user_id, users!courses_teacher_user_id_fkey(first_name,last_name)",
      )
      .order("code", { ascending: true })
      .limit(300),
    admin.from("course_enrollments").select("course_id").limit(10000),
  ]);

  if (courseRows.error) throw new Error(courseRows.error.message);
  if (enrollmentRows.error) throw new Error(enrollmentRows.error.message);

  const enrollmentCountMap = new Map<string, number>();
  for (const row of enrollmentRows.data ?? []) {
    enrollmentCountMap.set(
      row.course_id,
      (enrollmentCountMap.get(row.course_id) ?? 0) + 1,
    );
  }

  return (courseRows.data ?? []).map((row) => {
    const teacher = one(
      row.users as MaybeArray<{ first_name: string; last_name: string }>,
    );

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      grade_level: row.grade_level,
      credit_hours: Number(row.credit_hours ?? 1),
      enrollment_count: enrollmentCountMap.get(row.id) ?? 0,
      teacher_user_id: row.teacher_user_id,
      teacher_name: teacher
        ? `${teacher.first_name} ${teacher.last_name}`.trim()
        : "Unassigned",
    };
  });
}

export async function listTimetablePeriods(): Promise<TimetablePeriodItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("timetable_periods")
    .select("id, period_code, title, start_time, end_time, sort_order")
    .order("sort_order", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    period_code: row.period_code,
    title: row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    sort_order: row.sort_order,
  }));
}

export async function listTimetableEntries(): Promise<TimetableEntryItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("timetable_entries")
    .select(
      "id, day_of_week, room_label, active, course_id, period_id, teacher_user_id, courses!timetable_entries_course_id_fkey(code,title,grade_level), timetable_periods!timetable_entries_period_id_fkey(period_code,title,start_time,end_time,sort_order), users!timetable_entries_teacher_user_id_fkey(first_name,last_name)",
    )
    .order("day_of_week", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const course = one(
      row.courses as MaybeArray<{
        code: string;
        title: string;
        grade_level: string;
      }>,
    );
    const period = one(
      row.timetable_periods as MaybeArray<{
        period_code: string;
        title: string;
        start_time: string;
        end_time: string;
        sort_order: number;
      }>,
    );
    const teacher = one(
      row.users as MaybeArray<{ first_name: string; last_name: string }>,
    );

    return {
      id: row.id,
      day_of_week: row.day_of_week,
      room_label: row.room_label ?? "",
      active: row.active,
      course_id: row.course_id,
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
      course_grade_level: course?.grade_level ?? "",
      period_id: row.period_id,
      period_code: period?.period_code ?? "",
      period_title: period?.title ?? "",
      period_start_time: period?.start_time ?? "",
      period_end_time: period?.end_time ?? "",
      period_sort_order: period?.sort_order ?? 0,
      teacher_user_id: row.teacher_user_id,
      teacher_name: teacher
        ? `${teacher.first_name} ${teacher.last_name}`.trim()
        : "Unassigned",
    };
  });
}

export async function listTeacherUsers(): Promise<TeacherUserItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_role_assignments")
    .select("role, users!user_role_assignments_user_id_fkey(id, first_name, last_name, email)")
    .eq("role", "teacher")
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) =>
      one(
        row.users as MaybeArray<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        }>,
      ),
    )
    .filter((user): user is { id: string; first_name: string; last_name: string; email: string } => !!user)
    .map((user) => ({
      user_id: user.id,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
    }));
}

export async function listGuardianUsers(): Promise<GuardianUserItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_role_assignments")
    .select("role, users!user_role_assignments_user_id_fkey(id, first_name, last_name, email)")
    .eq("role", "guardian")
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) =>
      one(
        row.users as MaybeArray<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        }>,
      ),
    )
    .filter((user): user is { id: string; first_name: string; last_name: string; email: string } => !!user)
    .map((user) => ({
      user_id: user.id,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
    }));
}

export async function listTeacherAssignments(
  teacherAuthUserId: string,
): Promise<TeacherAssignmentItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", teacherAuthUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data, error } = await admin
    .from("assignments")
    .select(
      "id, title, max_score, due_at, courses!assignments_course_id_fkey(code,title)",
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const course = one(row.courses as MaybeArray<{ code: string; title: string }>);

    return {
      id: row.id,
      title: row.title,
      max_score: Number(row.max_score),
      due_at: row.due_at,
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
    };
  });
}

export async function listStudentAssignments(
  authUserId: string,
): Promise<StudentAssignmentItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student?.id) return [];

  const { data: enrollments, error: enrollmentError } = await admin
    .from("course_enrollments")
    .select("course_id")
    .eq("student_id", student.id)
    .limit(500);

  if (enrollmentError) throw new Error(enrollmentError.message);

  const courseIds = (enrollments ?? []).map((row) => row.course_id);
  if (courseIds.length === 0) return [];

  const { data: assignments, error: assignmentError } = await admin
    .from("assignments")
    .select(
      "id, title, details, max_score, due_at, course_id, courses!assignments_course_id_fkey(code,title)",
    )
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (assignmentError) throw new Error(assignmentError.message);

  const assignmentIds = (assignments ?? []).map((row) => row.id);
  if (assignmentIds.length === 0) return [];

  const [submissionRows, gradeRows] = await Promise.all([
    admin
      .from("assignment_submissions")
      .select("id, assignment_id, submitted_at, content, attachment_url")
      .eq("student_id", student.id)
      .in("assignment_id", assignmentIds)
      .limit(1000),
    admin
      .from("grades")
      .select("assignment_id, score, feedback, graded_at")
      .eq("student_id", student.id)
      .in("assignment_id", assignmentIds)
      .limit(1000),
  ]);

  if (submissionRows.error) throw new Error(submissionRows.error.message);
  if (gradeRows.error) throw new Error(gradeRows.error.message);

  const submissionByAssignmentId = new Map(
    (submissionRows.data ?? []).map((row) => [row.assignment_id, row]),
  );
  const gradeByAssignmentId = new Map(
    (gradeRows.data ?? []).map((row) => [row.assignment_id, row]),
  );

  const now = Date.now();

  return (assignments ?? []).map((row) => {
    const course = one(row.courses as MaybeArray<{ code: string; title: string }>);
    const submission = submissionByAssignmentId.get(row.id);
    const grade = gradeByAssignmentId.get(row.id);
    const dueAtMs = row.due_at ? new Date(row.due_at).getTime() : null;
    const status: StudentAssignmentItem["status"] = grade
      ? "graded"
      : submission
        ? "submitted"
        : dueAtMs && dueAtMs < now
          ? "overdue"
          : "pending";

    return {
      assignment_id: row.id,
      assignment_title: row.title,
      assignment_details: row.details,
      assignment_max_score: Number(row.max_score),
      assignment_due_at: row.due_at,
      course_id: row.course_id,
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
      submission_id: submission?.id ?? null,
      submitted_at: submission?.submitted_at ?? null,
      submission_content: submission?.content ?? null,
      submission_attachment_url: submission?.attachment_url ?? null,
      grade_score: grade ? Number(grade.score) : null,
      grade_feedback: grade?.feedback ?? null,
      grade_graded_at: grade?.graded_at ?? null,
      status,
    };
  });
}

export async function listTeacherSubmissionQueue(
  authUserId: string,
): Promise<TeacherSubmissionItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: teacher } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!teacher?.id) return [];

  const { data: courses, error: courseError } = await admin
    .from("courses")
    .select("id, code, title")
    .eq("teacher_user_id", teacher.id)
    .limit(500);

  if (courseError) throw new Error(courseError.message);

  const courseById = new Map(
    (courses ?? []).map((row) => [row.id, { code: row.code, title: row.title }]),
  );
  const courseIds = [...courseById.keys()];
  if (courseIds.length === 0) return [];

  const { data: assignments, error: assignmentError } = await admin
    .from("assignments")
    .select("id, title, max_score, due_at, course_id")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (assignmentError) throw new Error(assignmentError.message);

  const assignmentById = new Map(
    (assignments ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        max_score: Number(row.max_score),
        due_at: row.due_at,
        course_id: row.course_id,
      },
    ]),
  );
  const assignmentIds = [...assignmentById.keys()];
  if (assignmentIds.length === 0) return [];

  const [submissionRows, gradeRows] = await Promise.all([
    admin
      .from("assignment_submissions")
      .select("id, assignment_id, student_id, submitted_at, content, attachment_url")
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false })
      .limit(2000),
    admin
      .from("grades")
      .select(
        "assignment_id, student_id, score, percentage, letter_grade, grade_points, feedback, graded_at",
      )
      .in("assignment_id", assignmentIds)
      .limit(2000),
  ]);

  if (submissionRows.error) throw new Error(submissionRows.error.message);
  if (gradeRows.error) throw new Error(gradeRows.error.message);

  const submissions = submissionRows.data ?? [];
  if (submissions.length === 0) return [];

  const studentIds = [...new Set(submissions.map((row) => row.student_id))];
  const { data: students, error: studentError } = await admin
    .from("students")
    .select(
      "id, student_code, users!students_user_id_fkey(first_name,last_name)",
    )
    .in("id", studentIds)
    .limit(2000);

  if (studentError) throw new Error(studentError.message);

  const studentById = new Map(
    (students ?? []).map((row) => {
      const user = one(
        row.users as MaybeArray<{ first_name: string; last_name: string }>,
      );

      return [
        row.id,
        {
          student_code: row.student_code,
          student_name: user ? `${user.first_name} ${user.last_name}`.trim() : "Unknown Student",
        },
      ];
    }),
  );

  const gradeByAssignmentAndStudent = new Map(
    (gradeRows.data ?? []).map((row) => [
      `${row.assignment_id}:${row.student_id}`,
      {
        score: Number(row.score),
        percentage:
          row.percentage === null || row.percentage === undefined
            ? null
            : Number(row.percentage),
        letter_grade: row.letter_grade,
        grade_points:
          row.grade_points === null || row.grade_points === undefined
            ? null
            : Number(row.grade_points),
        feedback: row.feedback,
        graded_at: row.graded_at,
      },
    ]),
  );

  return submissions.map((row) => {
    const assignment = assignmentById.get(row.assignment_id);
    const student = studentById.get(row.student_id);
    const grade = gradeByAssignmentAndStudent.get(`${row.assignment_id}:${row.student_id}`);
    const course = assignment ? courseById.get(assignment.course_id) : null;

    return {
      submission_id: row.id,
      assignment_id: row.assignment_id,
      assignment_title: assignment?.title ?? "",
      assignment_max_score: assignment?.max_score ?? 0,
      assignment_due_at: assignment?.due_at ?? null,
      submitted_at: row.submitted_at,
      submission_content: row.content,
      submission_attachment_url: row.attachment_url,
      student_id: row.student_id,
      student_code: student?.student_code ?? "",
      student_name: student?.student_name ?? "Unknown Student",
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
      grade_score: grade?.score ?? null,
      grade_percentage: grade?.percentage ?? null,
      grade_letter: grade?.letter_grade ?? null,
      grade_points: grade?.grade_points ?? null,
      grade_feedback: grade?.feedback ?? null,
      grade_graded_at: grade?.graded_at ?? null,
    };
  });
}

export async function listCourseEnrollments(
  courseId: string,
): Promise<CourseEnrollmentItem[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("course_enrollments")
    .select(
      "student_id, students!course_enrollments_student_id_fkey(student_code, users!students_user_id_fkey(first_name,last_name))",
    )
    .eq("course_id", courseId)
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = one(
      row.students as MaybeArray<{
        student_code: string;
        users: MaybeArray<{ first_name: string; last_name: string }>;
      }>,
    );
    const user = one(student?.users ?? null);

    return {
      student_id: row.student_id,
      student_code: student?.student_code ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    };
  });
}

export async function listAllCourseEnrollments(): Promise<
  CourseEnrollmentDirectoryItem[]
> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("course_enrollments")
    .select(
      "course_id, student_id, students!course_enrollments_student_id_fkey(student_code, users!students_user_id_fkey(first_name,last_name))",
    )
    .limit(5000);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const student = one(
        row.students as MaybeArray<{
          student_code: string;
          users: MaybeArray<{ first_name: string; last_name: string }>;
        }>,
      );
      const user = one(student?.users ?? null);

      if (!student || !user) return null;

      return {
        course_id: row.course_id,
        student_id: row.student_id,
        student_code: student.student_code,
        student_name: `${user.first_name} ${user.last_name}`.trim(),
      };
    })
    .filter((row): row is CourseEnrollmentDirectoryItem => !!row);
}

export async function listTeacherTimetable(
  authUserId: string,
): Promise<TimetableEntryItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const entries = await listTimetableEntries();
  return entries
    .filter((entry) => entry.teacher_user_id === user.id && entry.active)
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week || a.period_sort_order - b.period_sort_order,
    );
}

export async function listStudentTimetable(
  authUserId: string,
): Promise<TimetableEntryItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student?.id) return [];

  const { data: enrollments, error } = await admin
    .from("course_enrollments")
    .select("course_id")
    .eq("student_id", student.id)
    .limit(500);

  if (error) throw new Error(error.message);

  const courseIds = new Set((enrollments ?? []).map((row) => row.course_id));
  const entries = await listTimetableEntries();

  return entries
    .filter((entry) => courseIds.has(entry.course_id) && entry.active)
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week || a.period_sort_order - b.period_sort_order,
    );
}

export async function listStudentGradebook(
  authUserId: string,
): Promise<StudentGradeItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student?.id) return [];

  const { data, error } = await admin
    .from("grades")
    .select(
      "id, score, percentage, letter_grade, grade_points, feedback, graded_at, assignments!grades_assignment_id_fkey(title,max_score,courses!assignments_course_id_fkey(code,title))",
    )
    .eq("student_id", student.id)
    .order("graded_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const assignment = one(
      row.assignments as MaybeArray<{
        title: string;
        max_score: number;
        courses: MaybeArray<{ code: string; title: string }>;
      }>,
    );
    const course = one(assignment?.courses ?? null);

    return {
      id: row.id,
      score: Number(row.score),
      percentage:
        row.percentage === null || row.percentage === undefined
          ? null
          : Number(row.percentage),
      letter_grade: row.letter_grade,
      grade_points:
        row.grade_points === null || row.grade_points === undefined
          ? null
          : Number(row.grade_points),
      feedback: row.feedback,
      graded_at: row.graded_at,
      assignment_title: assignment?.title ?? "",
      assignment_max_score: Number(assignment?.max_score ?? 0),
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
    };
  });
}

export async function listStudentAttendance(
  authUserId: string,
): Promise<StudentAttendanceItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student?.id) return [];

  const { data, error } = await admin
    .from("attendance_records")
    .select(
      "id, state, remarks, marked_at, attendance_sessions!attendance_records_attendance_session_id_fkey(session_date,period_label,courses!attendance_sessions_course_id_fkey(code,title))",
    )
    .eq("student_id", student.id)
    .order("marked_at", { ascending: false })
    .limit(120);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const session = one(
      row.attendance_sessions as MaybeArray<{
        session_date: string;
        period_label: string;
        courses: MaybeArray<{ code: string; title: string }>;
      }>,
    );
    const course = one(session?.courses ?? null);

    return {
      id: row.id,
      state: row.state,
      remarks: row.remarks,
      marked_at: row.marked_at,
      session_date: session?.session_date ?? "",
      period_label: session?.period_label ?? "",
      course_code: course?.code ?? "",
      course_title: course?.title ?? "",
    };
  });
}

export async function listGuardianStudents(
  authUserId: string,
): Promise<GuardianStudentViewItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: guardian } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!guardian?.id) return [];

  const { data, error } = await admin
    .from("guardian_student_links")
    .select(
      "relation, students!guardian_student_links_student_id_fkey(id,student_code,users!students_user_id_fkey(first_name,last_name))",
    )
    .eq("guardian_user_id", guardian.id)
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const student = one(
        row.students as MaybeArray<{
          id: string;
          student_code: string;
          users: MaybeArray<{ first_name: string; last_name: string }>;
        }>,
      );
      const user = one(student?.users ?? null);

      if (!student || !user) return null;

      return {
        student_id: student.id,
        student_code: student.student_code,
        student_name: `${user.first_name} ${user.last_name}`.trim(),
        relation: row.relation,
      };
    })
    .filter((row): row is GuardianStudentViewItem => !!row);
}

export async function listGuardianLinks(): Promise<GuardianLinkRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("guardian_student_links")
    .select(
      "relation, users!guardian_student_links_guardian_user_id_fkey(first_name,last_name,email), students!guardian_student_links_student_id_fkey(student_code, users!students_user_id_fkey(first_name,last_name))",
    )
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const guardian = one(
        row.users as MaybeArray<{ first_name: string; last_name: string; email: string }>,
      );
      const student = one(
        row.students as MaybeArray<{
          student_code: string;
          users: MaybeArray<{ first_name: string; last_name: string }>;
        }>,
      );
      const studentUser = one(student?.users ?? null);

      if (!guardian || !student || !studentUser) return null;

      return {
        guardian_name: `${guardian.first_name} ${guardian.last_name}`.trim(),
        guardian_email: guardian.email,
        student_name: `${studentUser.first_name} ${studentUser.last_name}`.trim(),
        student_code: student.student_code,
        relation: row.relation,
      };
    })
    .filter((row): row is GuardianLinkRow => !!row);
}

export async function listGuardianStudentSummaries(
  studentIds: string[],
): Promise<GuardianStudentSummary[]> {
  if (studentIds.length === 0) return [];

  const admin = createSupabaseAdminClient();

  const [gradeRows, attendanceRows] = await Promise.all([
    admin.from("grades").select("student_id"),
    admin.from("attendance_records").select("student_id"),
  ]);

  if (gradeRows.error) throw new Error(gradeRows.error.message);
  if (attendanceRows.error) throw new Error(attendanceRows.error.message);

  const gradeCountMap = new Map<string, number>();
  for (const row of gradeRows.data ?? []) {
    if (!studentIds.includes(row.student_id)) continue;
    gradeCountMap.set(row.student_id, (gradeCountMap.get(row.student_id) ?? 0) + 1);
  }

  const attendanceCountMap = new Map<string, number>();
  for (const row of attendanceRows.data ?? []) {
    if (!studentIds.includes(row.student_id)) continue;
    attendanceCountMap.set(
      row.student_id,
      (attendanceCountMap.get(row.student_id) ?? 0) + 1,
    );
  }

  return studentIds.map((studentId) => ({
    student_id: studentId,
    grade_count: gradeCountMap.get(studentId) ?? 0,
    attendance_count: attendanceCountMap.get(studentId) ?? 0,
  }));
}

export async function listAnnouncements() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    created_at: row.created_at,
  }));
}

export async function listAnnouncementsForRole(
  role: "admin" | "finance" | "teacher" | "student" | "guardian",
): Promise<AnnouncementItem[]> {
  if (role === "admin" || role === "finance") {
    return listAnnouncements();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, title, body, created_at")
    .contains("audience", [role])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    created_at: row.created_at,
  }));
}

export async function getInstitutionReportSnapshot(): Promise<InstitutionReportSnapshot> {
  const admin = createSupabaseAdminClient();

  const [studentsCount, staffCount, courseCount, activeTimetable, grades, attendance] =
    await Promise.all([
      admin.from("students").select("id", { count: "exact", head: true }),
      admin.from("staff_profiles").select("id", { count: "exact", head: true }),
      admin.from("courses").select("id", { count: "exact", head: true }),
      admin
        .from("timetable_entries")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      admin.from("grades").select("score"),
      admin.from("attendance_records").select("state"),
    ]);

  const scoreRows = grades.data ?? [];
  const averageScore =
    scoreRows.length > 0
      ? scoreRows.reduce((sum, row) => sum + Number(row.score), 0) /
        scoreRows.length
      : 0;

  const attendanceCountMap = new Map<string, number>();
  for (const row of attendance.data ?? []) {
    const state = String(row.state);
    attendanceCountMap.set(state, (attendanceCountMap.get(state) ?? 0) + 1);
  }

  return {
    student_count: studentsCount.count ?? 0,
    staff_count: staffCount.count ?? 0,
    course_count: courseCount.count ?? 0,
    active_timetable_slots: activeTimetable.count ?? 0,
    average_score: Number(averageScore.toFixed(2)),
    attendance_distribution: [...attendanceCountMap.entries()].map(
      ([state, count]) => ({
        state,
        count,
      }),
    ),
  };
}

export async function getCoursePerformanceReport(): Promise<CoursePerformanceItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("grades")
    .select(
      "score, assignments!grades_assignment_id_fkey(courses!assignments_course_id_fkey(code,title))",
    )
    .limit(5000);

  if (error) throw new Error(error.message);

  const courseMap = new Map<
    string,
    { course_code: string; course_title: string; assessments: number; total_score: number }
  >();

  for (const row of data ?? []) {
    const assignment = one(
      row.assignments as MaybeArray<{
        courses: MaybeArray<{ code: string; title: string }>;
      }>,
    );
    const course = one(assignment?.courses ?? null);
    if (!course?.code) continue;

    const current = courseMap.get(course.code) ?? {
      course_code: course.code,
      course_title: course.title,
      assessments: 0,
      total_score: 0,
    };

    current.assessments += 1;
    current.total_score += Number(row.score);
    courseMap.set(course.code, current);
  }

  return [...courseMap.values()]
    .map((item) => ({
      course_code: item.course_code,
      course_title: item.course_title,
      assessments: item.assessments,
      average_score:
        item.assessments > 0
          ? Number((item.total_score / item.assessments).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.average_score - a.average_score);
}

export async function getPayrollCycleSummaryReport(): Promise<PayrollCycleSummaryItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payroll_entries")
    .select(
      "gross_amount, deductions, net_amount, payroll_cycles!payroll_entries_payroll_cycle_id_fkey(cycle_code,period_start,period_end)",
    )
    .limit(5000);

  if (error) throw new Error(error.message);

  const cycleMap = new Map<
    string,
    {
      cycle_code: string;
      period_start: string;
      period_end: string;
      total_gross: number;
      total_deductions: number;
      total_net: number;
      entries: number;
    }
  >();

  for (const row of data ?? []) {
    const cycle = one(
      row.payroll_cycles as MaybeArray<{
        cycle_code: string;
        period_start: string;
        period_end: string;
      }>,
    );
    if (!cycle?.cycle_code) continue;

    const current = cycleMap.get(cycle.cycle_code) ?? {
      cycle_code: cycle.cycle_code,
      period_start: cycle.period_start,
      period_end: cycle.period_end,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      entries: 0,
    };

    current.entries += 1;
    current.total_gross += Number(row.gross_amount);
    current.total_deductions += Number(row.deductions);
    current.total_net += Number(row.net_amount);
    cycleMap.set(cycle.cycle_code, current);
  }

  return [...cycleMap.values()].sort((a, b) =>
    a.period_start < b.period_start ? 1 : -1,
  );
}

export async function listFeePlans(): Promise<FeePlanItem[]> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();
  const { data, error } = await admin
    .from("fee_plans")
    .select("id, plan_code, title, grade_level, amount, recurrence, active")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    plan_code: row.plan_code,
    title: row.title,
    grade_level: row.grade_level,
    amount: Number(row.amount),
    recurrence: row.recurrence,
    active: row.active,
  }));
}

export async function listFeeInvoices(): Promise<FeeInvoiceItem[]> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();
  const [invoiceRows, paymentRows] = await Promise.all([
    admin
      .from("fee_invoices")
      .select(
        "id, invoice_code, title, student_id, fee_plan_id, amount_due, due_date, status, notes, created_at, students!fee_invoices_student_id_fkey(student_code, users!students_user_id_fkey(first_name,last_name)), fee_plans!fee_invoices_fee_plan_id_fkey(plan_code)",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(2000),
    admin
      .from("fee_payments")
      .select("invoice_id, amount_paid")
      .eq("organization_id", organizationId)
      .limit(10000),
  ]);

  if (invoiceRows.error) throw new Error(invoiceRows.error.message);
  if (paymentRows.error) throw new Error(paymentRows.error.message);

  const paidByInvoice = new Map<string, number>();
  for (const payment of paymentRows.data ?? []) {
    const current = paidByInvoice.get(payment.invoice_id) ?? 0;
    paidByInvoice.set(payment.invoice_id, current + Number(payment.amount_paid));
  }

  return (invoiceRows.data ?? []).map((row) => {
    const student = one(
      row.students as MaybeArray<{
        student_code: string;
        users: MaybeArray<{ first_name: string; last_name: string }>;
      }>,
    );
    const studentUser = one(student?.users ?? null);
    const plan = one(row.fee_plans as MaybeArray<{ plan_code: string }>);
    const totalPaid = Number((paidByInvoice.get(row.id) ?? 0).toFixed(2));
    const amountDue = Number(row.amount_due);
    const status = resolveFeeInvoiceStatus({
      amountDue,
      totalPaid,
      dueDate: row.due_date,
      requestedStatus: row.status,
    });

    return {
      id: row.id,
      invoice_code: row.invoice_code,
      title: row.title,
      student_id: row.student_id,
      student_code: student?.student_code ?? "",
      student_name: studentUser
        ? `${studentUser.first_name} ${studentUser.last_name}`.trim()
        : "Unknown Student",
      fee_plan_id: row.fee_plan_id,
      fee_plan_code: plan?.plan_code ?? "",
      amount_due: amountDue,
      total_paid: totalPaid,
      balance: getFeeInvoiceBalance(amountDue, totalPaid),
      due_date: row.due_date,
      status,
      notes: row.notes,
      created_at: row.created_at,
    };
  });
}

export async function listFeePayments(): Promise<FeePaymentItem[]> {
  const admin = createSupabaseAdminClient();
  const organizationId = await getViewerOrganizationId();
  const { data, error } = await admin
    .from("fee_payments")
    .select(
      "id, invoice_id, student_id, amount_paid, payment_date, method, reference_no, created_at, fee_invoices!fee_payments_invoice_id_fkey(invoice_code), students!fee_payments_student_id_fkey(users!students_user_id_fkey(first_name,last_name))",
    )
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const invoice = one(row.fee_invoices as MaybeArray<{ invoice_code: string }>);
    const student = one(
      row.students as MaybeArray<{
        users: MaybeArray<{ first_name: string; last_name: string }>;
      }>,
    );
    const studentUser = one(student?.users ?? null);

    return {
      id: row.id,
      invoice_id: row.invoice_id,
      invoice_code: invoice?.invoice_code ?? "",
      student_id: row.student_id,
      student_name: studentUser
        ? `${studentUser.first_name} ${studentUser.last_name}`.trim()
        : "Unknown Student",
      amount_paid: Number(row.amount_paid),
      payment_date: row.payment_date,
      method: row.method,
      reference_no: row.reference_no,
      created_at: row.created_at,
    };
  });
}

export async function getFeeInvoiceDocument(
  invoiceId: string,
  organizationId: string,
): Promise<FeeInvoiceDocumentItem | null> {
  const admin = createSupabaseAdminClient();

  const [invoiceRow, paymentRows, feeSettingsRow, organizationRow] = await Promise.all([
    admin
      .from("fee_invoices")
      .select(
        "id, invoice_code, title, student_id, fee_plan_id, amount_due, due_date, status, notes, created_at, students!fee_invoices_student_id_fkey(student_code, grade_level, users!students_user_id_fkey(first_name,last_name)), fee_plans!fee_invoices_fee_plan_id_fkey(plan_code)",
      )
      .eq("organization_id", organizationId)
      .eq("id", invoiceId)
      .maybeSingle(),
    admin
      .from("fee_payments")
      .select("id, amount_paid, payment_date, method, reference_no, created_at")
      .eq("organization_id", organizationId)
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: false }),
    admin
      .from("organization_fee_settings")
      .select("currency_code, receipt_prefix")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("name, contact_email")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (invoiceRow.error) throw new Error(invoiceRow.error.message);
  if (paymentRows.error) throw new Error(paymentRows.error.message);
  if (feeSettingsRow.error && !isMissingRelationError(feeSettingsRow.error)) {
    throw new Error(feeSettingsRow.error.message);
  }
  if (organizationRow.error) throw new Error(organizationRow.error.message);

  if (!invoiceRow.data) {
    return null;
  }

  const student = one(
    invoiceRow.data.students as MaybeArray<{
      student_code: string;
      grade_level: string;
      users: MaybeArray<{ first_name: string; last_name: string }>;
    }>,
  );
  const studentUser = one(student?.users ?? null);
  const plan = one(invoiceRow.data.fee_plans as MaybeArray<{ plan_code: string }>);
  const feeSettings =
    feeSettingsRow.data ??
    createDefaultOrganizationFeeSettings(organizationId);
  const currencyCode = feeSettings.currency_code;
  const receiptPrefix = feeSettings.receipt_prefix;
  const payments = (paymentRows.data ?? []).map((payment) => ({
    id: payment.id,
    amount_paid: Number(payment.amount_paid),
    payment_date: payment.payment_date,
    method: payment.method,
    reference_no: payment.reference_no,
    created_at: payment.created_at,
    receipt_code: `${receiptPrefix}-${payment.payment_date.replaceAll("-", "")}-${payment.id
      .slice(0, 6)
      .toUpperCase()}`,
  }));
  const totalPaid = Number(
    payments.reduce((sum, payment) => sum + payment.amount_paid, 0).toFixed(2),
  );
  const amountDue = Number(invoiceRow.data.amount_due);

  return {
    id: invoiceRow.data.id,
    invoice_code: invoiceRow.data.invoice_code,
    title: invoiceRow.data.title,
    student_id: invoiceRow.data.student_id,
    student_code: student?.student_code ?? "",
    student_name: studentUser
      ? `${studentUser.first_name} ${studentUser.last_name}`.trim()
      : "Unknown Student",
    student_grade_level: student?.grade_level ?? "",
    fee_plan_code: plan?.plan_code ?? "",
    amount_due: amountDue,
    total_paid: totalPaid,
    balance: getFeeInvoiceBalance(amountDue, totalPaid),
    due_date: invoiceRow.data.due_date,
    status: resolveFeeInvoiceStatus({
      amountDue,
      totalPaid,
      dueDate: invoiceRow.data.due_date,
      requestedStatus: invoiceRow.data.status,
    }),
    notes: invoiceRow.data.notes,
    created_at: invoiceRow.data.created_at,
    organization_name: organizationRow.data?.name ?? "School",
    organization_contact_email: organizationRow.data?.contact_email ?? null,
    currency_code: currencyCode,
    receipt_prefix: receiptPrefix,
    payments,
  };
}

export async function listStudentFeeLedger(
  authUserId: string,
): Promise<StudentFeeInvoiceItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!user?.id) return [];

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student?.id) return [];

  const [invoiceRows, paymentRows] = await Promise.all([
    admin
      .from("fee_invoices")
      .select("id, invoice_code, title, amount_due, due_date, status, notes")
      .eq("student_id", student.id)
      .order("due_date", { ascending: true })
      .limit(2000),
    admin
      .from("fee_payments")
      .select("invoice_id, amount_paid")
      .eq("student_id", student.id)
      .limit(5000),
  ]);

  if (invoiceRows.error) throw new Error(invoiceRows.error.message);
  if (paymentRows.error) throw new Error(paymentRows.error.message);

  const paidByInvoice = new Map<string, number>();
  for (const payment of paymentRows.data ?? []) {
    const current = paidByInvoice.get(payment.invoice_id) ?? 0;
    paidByInvoice.set(payment.invoice_id, current + Number(payment.amount_paid));
  }

  return (invoiceRows.data ?? []).map((row) => {
    const totalPaid = Number((paidByInvoice.get(row.id) ?? 0).toFixed(2));
    const amountDue = Number(row.amount_due);

    return {
      id: row.id,
      invoice_code: row.invoice_code,
      title: row.title,
      amount_due: amountDue,
      total_paid: totalPaid,
      balance: Number((amountDue - totalPaid).toFixed(2)),
      due_date: row.due_date,
      status: row.status,
      notes: row.notes,
    };
  });
}

export async function getOrganizationFeeSettings(
  organizationId: string,
): Promise<OrganizationFeeSettingsItem> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_fee_settings")
    .select(
      "id, organization_id, currency_code, allow_partial_payments, late_fee_grace_days, late_fee_flat_amount, receipt_prefix",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return createDefaultOrganizationFeeSettings(organizationId);
    }

    throw new Error(error.message);
  }

  if (!data) {
    return createDefaultOrganizationFeeSettings(organizationId);
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    currency_code: data.currency_code,
    allow_partial_payments: data.allow_partial_payments,
    late_fee_grace_days: data.late_fee_grace_days,
    late_fee_flat_amount: Number(data.late_fee_flat_amount),
    receipt_prefix: data.receipt_prefix,
  };
}

export async function listOrganizationPaymentMethods(
  organizationId: string,
): Promise<OrganizationPaymentMethodItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_payment_methods")
    .select(
      "id, organization_id, method_code, label, instructions, enabled, account_details, sort_order",
    )
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return createDefaultOrganizationPaymentMethods(organizationId);
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    method_code: row.method_code,
    label: row.label,
    instructions: row.instructions,
    enabled: row.enabled,
    account_details: (row.account_details as Record<string, unknown>) ?? {},
    sort_order: row.sort_order,
  }));
}

export async function listOrganizationGradingPolicies(
  organizationId: string,
): Promise<OrganizationGradingPolicyItem[]> {
  const admin = createSupabaseAdminClient();
  const policyRows = await admin
    .from("organization_grading_policies")
    .select(
      "id, organization_id, policy_name, pass_mark, decimal_precision, is_default, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (policyRows.error) {
    if (isMissingRelationError(policyRows.error)) {
      return [];
    }

    throw new Error(policyRows.error.message);
  }

  const policyIds = (policyRows.data ?? []).map((row) => row.id);
  const bandRows =
    policyIds.length === 0
      ? { data: [], error: null }
      : await admin
          .from("grading_scale_bands")
          .select(
            "id, grading_policy_id, band_label, min_percentage, max_percentage, grade_points, remarks, sort_order",
          )
          .in("grading_policy_id", policyIds)
          .limit(500);

  if (bandRows.error) {
    if (isMissingRelationError(bandRows.error)) {
      return (policyRows.data ?? []).map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        policy_name: row.policy_name,
        pass_mark: Number(row.pass_mark),
        decimal_precision: row.decimal_precision,
        is_default: row.is_default,
        created_at: row.created_at,
        bands: [],
      }));
    }

    throw new Error(bandRows.error.message);
  }

  const bandsByPolicyId = new Map<string, OrganizationGradingBandItem[]>();
  for (const row of bandRows.data ?? []) {
    const current = bandsByPolicyId.get(row.grading_policy_id) ?? [];
    current.push({
      id: row.id,
      grading_policy_id: row.grading_policy_id,
      band_label: row.band_label,
      min_percentage: Number(row.min_percentage),
      max_percentage: Number(row.max_percentage),
      grade_points:
        row.grade_points === null || row.grade_points === undefined
          ? null
          : Number(row.grade_points),
      remarks: row.remarks,
      sort_order: row.sort_order,
    });
    bandsByPolicyId.set(row.grading_policy_id, current);
  }

  return (policyRows.data ?? []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    policy_name: row.policy_name,
    pass_mark: Number(row.pass_mark),
    decimal_precision: row.decimal_precision,
    is_default: row.is_default,
    created_at: row.created_at,
    bands: (bandsByPolicyId.get(row.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
}

export async function getDefaultOrganizationGradingPolicy(
  organizationId: string,
): Promise<OrganizationGradingPolicyItem | null> {
  const policies = await listOrganizationGradingPolicies(organizationId);
  return policies.find((policy) => policy.is_default) ?? policies[0] ?? null;
}

export async function getFeeCollectionSummaryReport(): Promise<FeeCollectionSummaryItem[]> {
  const invoices = await listFeeInvoices();
  const monthMap = new Map<
    string,
    {
      month: string;
      invoices: number;
      billed_amount: number;
      collected_amount: number;
      outstanding_amount: number;
    }
  >();

  for (const invoice of invoices) {
    const month = invoice.due_date.slice(0, 7);
    const current = monthMap.get(month) ?? {
      month,
      invoices: 0,
      billed_amount: 0,
      collected_amount: 0,
      outstanding_amount: 0,
    };

    current.invoices += 1;
    current.billed_amount += invoice.amount_due;
    current.collected_amount += invoice.total_paid;
    current.outstanding_amount += invoice.balance;
    monthMap.set(month, current);
  }

  return [...monthMap.values()]
    .map((row) => ({
      month: row.month,
      invoices: row.invoices,
      billed_amount: Number(row.billed_amount.toFixed(2)),
      collected_amount: Number(row.collected_amount.toFixed(2)),
      outstanding_amount: Number(row.outstanding_amount.toFixed(2)),
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export async function listAuditLogs(limit = 100): Promise<AuditLogItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select(
      "id, action, entity, entity_id, metadata, created_at, users!audit_logs_actor_user_id_fkey(first_name,last_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const actor = one(
      row.users as MaybeArray<{ first_name: string; last_name: string }>,
    );

    return {
      id: row.id,
      action: row.action,
      entity: row.entity,
      entity_id: row.entity_id,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at,
      actor_name: actor ? `${actor.first_name} ${actor.last_name}`.trim() : "System",
    };
  });
}

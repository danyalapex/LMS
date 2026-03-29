"use server";

import { revalidatePath } from "next/cache";
import { requireIdentity, requireRole, type UserRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getOrganizationId() {
  const identity = await requireIdentity();
  if (identity.organizationId) {
    return identity.organizationId;
  }

  throw new Error("Missing organization context for current user");
}

async function createBaseUser(params: {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}) {
  const admin = createSupabaseAdminClient();
  const organizationId = await getOrganizationId();

  const { data: inserted, error } = await admin
    .from("users")
    .insert({
      organization_id: organizationId,
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error(error?.message ?? "User insert failed");

  const { error: roleError } = await admin.from("user_role_assignments").insert({
    user_id: inserted.id,
    role: params.role,
  });

  if (roleError) throw new Error(roleError.message);

  return inserted.id;
}

async function logAuditEvent(params: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const organizationId = await getOrganizationId();

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: params.actorUserId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function createStudentAction(formData: FormData) {
  await requireRole(["admin"]);

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const studentCode = String(formData.get("student_code") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const admissionDate = String(formData.get("admission_date") ?? "").trim();

  if (!firstName || !lastName || !email || !studentCode || !gradeLevel || !admissionDate) {
    throw new Error("Missing student input values");
  }

  const userId = await createBaseUser({
    firstName,
    lastName,
    email,
    role: "student",
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("students").insert({
    user_id: userId,
    student_code: studentCode,
    grade_level: gradeLevel,
    admission_date: admissionDate,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/students");
}

export async function createStaffAction(formData: FormData) {
  await requireRole(["admin"]);

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const employeeCode = String(formData.get("employee_code") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const hireDate = String(formData.get("hire_date") ?? "").trim();
  const monthlySalary = Number(formData.get("monthly_salary") ?? "0");
  const roleRaw = String(formData.get("role") ?? "teacher").trim();
  const role: UserRole = roleRaw === "finance" ? "finance" : "teacher";

  if (
    !firstName ||
    !lastName ||
    !email ||
    !employeeCode ||
    !department ||
    !designation ||
    !hireDate ||
    !monthlySalary
  ) {
    throw new Error("Missing staff input values");
  }

  const userId = await createBaseUser({
    firstName,
    lastName,
    email,
    role,
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("staff_profiles").insert({
    user_id: userId,
    employee_code: employeeCode,
    department,
    designation,
    hire_date: hireDate,
    monthly_salary: monthlySalary,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/staff");
}

export async function createCourseAction(formData: FormData) {
  await requireRole(["admin"]);

  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const teacherUserId = String(formData.get("teacher_user_id") ?? "").trim();

  if (!code || !title || !gradeLevel) {
    throw new Error("Missing course values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();

  const payload: Record<string, unknown> = {
    organization_id: organizationId,
    code,
    title,
    grade_level: gradeLevel,
  };

  if (teacherUserId) {
    payload.teacher_user_id = teacherUserId;
  }

  const { error } = await admin.from("courses").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/teacher");
}

export async function createPayrollCycleAction(formData: FormData) {
  await requireRole(["admin", "finance"]);

  const cycleCode = String(formData.get("cycle_code") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();

  if (!cycleCode || !periodStart || !periodEnd) {
    throw new Error("Missing payroll cycle inputs");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("payroll_cycles").insert({
    organization_id: organizationId,
    cycle_code: cycleCode,
    period_start: periodStart,
    period_end: periodEnd,
    status: "draft",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/payroll");
}

export async function createPayrollEntryAction(formData: FormData) {
  await requireRole(["admin", "finance"]);

  const payrollCycleId = String(formData.get("payroll_cycle_id") ?? "").trim();
  const staffProfileId = String(formData.get("staff_profile_id") ?? "").trim();
  const grossAmount = Number(formData.get("gross_amount") ?? "0");
  const deductions = Number(formData.get("deductions") ?? "0");

  if (!payrollCycleId || !staffProfileId || !grossAmount) {
    throw new Error("Missing payroll entry values");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("payroll_entries").insert({
    payroll_cycle_id: payrollCycleId,
    staff_profile_id: staffProfileId,
    gross_amount: grossAmount,
    deductions,
    status: "pending_approval",
  });

  if (error) throw new Error(error.message);

  const identity = await requireIdentity();
  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "payroll_entry_created",
    entity: "payroll_entries",
    metadata: {
      payroll_cycle_id: payrollCycleId,
      staff_profile_id: staffProfileId,
      gross_amount: grossAmount,
      deductions,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/payroll");
}

export async function createFeePlanAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const planCode = String(formData.get("plan_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const amount = Number(formData.get("amount") ?? "0");
  const recurrence = String(formData.get("recurrence") ?? "monthly").trim();

  if (!planCode || !title || !gradeLevel || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Missing fee plan values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();

  const { data: created, error } = await admin
    .from("fee_plans")
    .insert({
      organization_id: organizationId,
      plan_code: planCode,
      title,
      grade_level: gradeLevel,
      amount,
      recurrence: recurrence || "monthly",
      active: true,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Fee plan creation failed");

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_plan_created",
    entity: "fee_plans",
    entityId: created.id,
    metadata: {
      plan_code: planCode,
      grade_level: gradeLevel,
      amount,
      recurrence,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
}

export async function createFeeInvoiceAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const studentId = String(formData.get("student_id") ?? "").trim();
  const feePlanIdRaw = String(formData.get("fee_plan_id") ?? "").trim();
  const invoiceCode = String(formData.get("invoice_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amountDue = Number(formData.get("amount_due") ?? "0");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!studentId || !invoiceCode || !title || Number.isNaN(amountDue) || amountDue <= 0 || !dueDate) {
    throw new Error("Missing fee invoice values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const feePlanId = feePlanIdRaw || null;

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(studentError?.message ?? "Student profile not found");
  }

  const { data: created, error } = await admin
    .from("fee_invoices")
    .insert({
      organization_id: organizationId,
      student_id: studentId,
      fee_plan_id: feePlanId,
      invoice_code: invoiceCode,
      title,
      amount_due: amountDue,
      due_date: dueDate,
      status: "issued",
      notes: notes || null,
      created_by: identity.appUserId,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Fee invoice creation failed");

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_invoice_created",
    entity: "fee_invoices",
    entityId: created.id,
    metadata: {
      student_id: studentId,
      fee_plan_id: feePlanId,
      invoice_code: invoiceCode,
      amount_due: amountDue,
      due_date: dueDate,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function recordFeePaymentAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const amountPaid = Number(formData.get("amount_paid") ?? "0");
  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  const method = String(formData.get("method") ?? "cash").trim();
  const referenceNo = String(formData.get("reference_no") ?? "").trim();

  if (!invoiceId || Number.isNaN(amountPaid) || amountPaid <= 0) {
    throw new Error("Missing payment values");
  }

  const admin = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await admin
    .from("fee_invoices")
    .select("id, student_id, amount_due, due_date")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    throw new Error(invoiceError?.message ?? "Invoice not found");
  }

  const { error } = await admin.from("fee_payments").insert({
    organization_id: await getOrganizationId(),
    invoice_id: invoice.id,
    student_id: invoice.student_id,
    amount_paid: amountPaid,
    payment_date: paymentDate || new Date().toISOString().slice(0, 10),
    method: method || "cash",
    reference_no: referenceNo || null,
    recorded_by: identity.appUserId,
  });

  if (error) throw new Error(error.message);

  const { data: paymentRows, error: paymentError } = await admin
    .from("fee_payments")
    .select("amount_paid")
    .eq("invoice_id", invoice.id);

  if (paymentError) throw new Error(paymentError.message);

  const totalPaid = (paymentRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount_paid),
    0,
  );
  const amountDue = Number(invoice.amount_due);

  let nextStatus: "issued" | "partially_paid" | "paid" | "overdue" = "issued";
  if (totalPaid >= amountDue) {
    nextStatus = "paid";
  } else if (totalPaid > 0) {
    nextStatus = "partially_paid";
  } else if (invoice.due_date < new Date().toISOString().slice(0, 10)) {
    nextStatus = "overdue";
  }

  const { error: statusError } = await admin
    .from("fee_invoices")
    .update({ status: nextStatus })
    .eq("id", invoice.id);

  if (statusError) throw new Error(statusError.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_payment_recorded",
    entity: "fee_payments",
    metadata: {
      invoice_id: invoice.id,
      student_id: invoice.student_id,
      amount_paid: amountPaid,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      method: method || "cash",
      invoice_status: nextStatus,
      invoice_total_paid: Number(totalPaid.toFixed(2)),
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function createAssignmentAction(formData: FormData) {
  const role = await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const courseId = String(formData.get("course_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const maxScore = Number(formData.get("max_score") ?? "0");
  const dueAt = String(formData.get("due_at") ?? "").trim();

  if (!courseId || !title || !maxScore) {
    throw new Error("Missing assignment fields");
  }

  const admin = createSupabaseAdminClient();
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, teacher_user_id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(courseError?.message ?? "Course not found");
  }

  if (role === "teacher" && course.teacher_user_id !== identity.appUserId) {
    throw new Error("You can only create assignments for your own courses");
  }

  const { data: created, error } = await admin
    .from("assignments")
    .insert({
      course_id: courseId,
      title,
      details,
      max_score: maxScore,
      due_at: dueAt || null,
      created_by: identity.appUserId,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Assignment creation failed");

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "assignment_created",
    entity: "assignments",
    entityId: created.id,
    metadata: {
      course_id: courseId,
      title,
      max_score: maxScore,
      due_at: dueAt || null,
    },
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/grades");
  revalidatePath("/teacher/submissions");
  revalidatePath("/student");
  revalidatePath("/student/assignments");
}

export async function submitAssignmentAction(formData: FormData) {
  await requireRole(["student"]);
  const identity = await requireIdentity();

  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const attachmentUrl = String(formData.get("attachment_url") ?? "").trim();

  if (!assignmentId) {
    throw new Error("Assignment is required");
  }

  if (!content && !attachmentUrl) {
    throw new Error("Provide submission content or attachment URL");
  }

  const admin = createSupabaseAdminClient();
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id")
    .eq("user_id", identity.appUserId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(studentError?.message ?? "Student profile not found");
  }

  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .select("id, title, due_at, course_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    throw new Error(assignmentError?.message ?? "Assignment not found");
  }

  const { data: enrollment, error: enrollmentError } = await admin
    .from("course_enrollments")
    .select("id")
    .eq("course_id", assignment.course_id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    throw new Error("You are not enrolled in this assignment course");
  }

  const submittedAt = new Date().toISOString();
  const { error } = await admin.from("assignment_submissions").upsert(
    {
      assignment_id: assignmentId,
      student_id: student.id,
      submitted_at: submittedAt,
      content: content || null,
      attachment_url: attachmentUrl || null,
    },
    { onConflict: "assignment_id,student_id" },
  );

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "assignment_submitted",
    entity: "assignment_submissions",
    metadata: {
      assignment_id: assignmentId,
      assignment_title: assignment.title,
      student_id: student.id,
      due_at: assignment.due_at,
      submitted_at: submittedAt,
    },
  });

  revalidatePath("/student");
  revalidatePath("/student/assignments");
  revalidatePath("/teacher/submissions");
}

export async function recordGradeAction(formData: FormData) {
  const role = await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const score = Number(formData.get("score") ?? "0");
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!assignmentId || !studentId || Number.isNaN(score)) {
    throw new Error("Missing grade values");
  }

  const admin = createSupabaseAdminClient();
  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .select("id, max_score, title, course_id, courses!assignments_course_id_fkey(teacher_user_id)")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    throw new Error(assignmentError?.message ?? "Assignment not found");
  }

  const course = Array.isArray(assignment.courses)
    ? assignment.courses[0]
    : assignment.courses;

  if (role === "teacher" && course?.teacher_user_id !== identity.appUserId) {
    throw new Error("You can only grade assignments for your own courses");
  }

  const maxScore = Number(assignment.max_score);
  if (score < 0 || score > maxScore) {
    throw new Error(`Score must be between 0 and ${maxScore}`);
  }

  const { data: enrollment, error: enrollmentError } = await admin
    .from("course_enrollments")
    .select("id")
    .eq("course_id", assignment.course_id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    throw new Error("Student is not enrolled in this course");
  }

  const gradedAt = new Date().toISOString();
  const { error } = await admin.from("grades").upsert(
    {
      assignment_id: assignmentId,
      student_id: studentId,
      score,
      feedback: feedback || null,
      graded_by: identity.appUserId,
      graded_at: gradedAt,
    },
    { onConflict: "assignment_id,student_id" },
  );

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "grade_recorded",
    entity: "grades",
    metadata: {
      assignment_id: assignmentId,
      assignment_title: assignment.title,
      student_id: studentId,
      score,
      max_score: maxScore,
    },
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/grades");
  revalidatePath("/teacher/submissions");
  revalidatePath("/student");
  revalidatePath("/student/grades");
  revalidatePath("/student/assignments");
}

export async function markAttendanceAction(formData: FormData) {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const courseId = String(formData.get("course_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  const periodLabel = String(formData.get("period_label") ?? "").trim();
  const state = String(formData.get("state") ?? "present").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!courseId || !studentId || !sessionDate || !periodLabel) {
    throw new Error("Missing attendance values");
  }

  const admin = createSupabaseAdminClient();

  const { data: session, error: sessionError } = await admin
    .from("attendance_sessions")
    .upsert(
      {
        course_id: courseId,
        session_date: sessionDate,
        period_label: periodLabel,
        teacher_user_id: identity.appUserId,
      },
      { onConflict: "course_id,session_date,period_label" },
    )
    .select("id")
    .single();

  if (sessionError || !session?.id) {
    throw new Error(sessionError?.message ?? "Failed to create attendance session");
  }

  const { error } = await admin.from("attendance_records").upsert(
    {
      attendance_session_id: session.id,
      student_id: studentId,
      state,
      remarks: remarks || null,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "attendance_session_id,student_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/teacher/attendance");
}

export async function createAnnouncementAction(formData: FormData) {
  await requireRole(["admin", "teacher", "finance"]);
  const identity = await requireIdentity();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audienceRaw = String(formData.get("audience") ?? "student,teacher").trim();

  if (!title || !body) {
    throw new Error("Missing announcement fields");
  }

  const audience = audienceRaw
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is UserRole => ["admin", "teacher", "student", "guardian", "finance"].includes(role));

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("announcements").insert({
    organization_id: organizationId,
    title,
    body,
    audience,
    created_by: identity.appUserId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

export async function assignTeacherToCourseAction(formData: FormData) {
  await requireRole(["admin"]);

  const courseId = String(formData.get("course_id") ?? "").trim();
  const teacherUserId = String(formData.get("teacher_user_id") ?? "").trim();

  if (!courseId) {
    throw new Error("Course is required");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("courses")
    .update({
      teacher_user_id: teacherUserId || null,
    })
    .eq("id", courseId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher");
}

export async function enrollStudentInCourseAction(formData: FormData) {
  await requireRole(["admin"]);

  const courseId = String(formData.get("course_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();

  if (!courseId || !studentId) {
    throw new Error("Course and student are required");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("course_enrollments").upsert(
    {
      course_id: courseId,
      student_id: studentId,
      enrolled_on: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "course_id,student_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/grades");
}

export async function linkGuardianStudentAction(formData: FormData) {
  await requireRole(["admin"]);

  const guardianEmail = String(formData.get("guardian_email") ?? "")
    .trim()
    .toLowerCase();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const relation = String(formData.get("relation") ?? "Guardian").trim();

  if (!guardianEmail || !studentId) {
    throw new Error("Guardian email and student are required");
  }

  const admin = createSupabaseAdminClient();
  const { data: guardian, error: guardianError } = await admin
    .from("users")
    .select("id")
    .eq("email", guardianEmail)
    .maybeSingle();

  if (guardianError || !guardian?.id) {
    throw new Error("Guardian profile not found. Create guardian account first.");
  }

  const { error } = await admin.from("guardian_student_links").upsert(
    {
      guardian_user_id: guardian.id,
      student_id: studentId,
      relation,
    },
    { onConflict: "guardian_user_id,student_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/guardians");
  revalidatePath("/guardian");
}

export async function createTimetablePeriodAction(formData: FormData) {
  await requireRole(["admin"]);

  const periodCode = String(formData.get("period_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? "1");

  if (!periodCode || !title || !startTime || !endTime) {
    throw new Error("Missing timetable period values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("timetable_periods").insert({
    organization_id: organizationId,
    period_code: periodCode,
    title,
    start_time: startTime,
    end_time: endTime,
    sort_order: Number.isNaN(sortOrder) ? 1 : sortOrder,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/student/timetable");
}

export async function createTimetableEntryAction(formData: FormData) {
  await requireRole(["admin"]);

  const courseId = String(formData.get("course_id") ?? "").trim();
  const periodId = String(formData.get("period_id") ?? "").trim();
  const dayOfWeek = Number(formData.get("day_of_week") ?? "1");
  const roomLabel = String(formData.get("room_label") ?? "").trim();
  const teacherUserId = String(formData.get("teacher_user_id") ?? "").trim();

  if (
    !courseId ||
    !periodId ||
    Number.isNaN(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7
  ) {
    throw new Error("Missing timetable entry values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("timetable_entries").upsert(
    {
      organization_id: organizationId,
      course_id: courseId,
      period_id: periodId,
      day_of_week: dayOfWeek,
      room_label: roomLabel || null,
      teacher_user_id: teacherUserId || null,
      active: true,
    },
    { onConflict: "course_id,period_id,day_of_week" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/student/timetable");
}

export async function updatePayrollEntryStatusAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const entryId = String(formData.get("entry_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();

  if (!entryId) {
    throw new Error("Payroll entry id is required");
  }

  if (!["pending_approval", "approved", "rejected", "paid"].includes(nextStatus)) {
    throw new Error("Invalid payroll status transition target");
  }

  const admin = createSupabaseAdminClient();
  const { data: entry, error: entryError } = await admin
    .from("payroll_entries")
    .select("id,status")
    .eq("id", entryId)
    .maybeSingle();

  if (entryError || !entry) {
    throw new Error(entryError?.message ?? "Payroll entry not found");
  }

  const allowedTransitions: Record<string, string[]> = {
    draft: ["pending_approval", "rejected"],
    pending_approval: ["approved", "rejected"],
    approved: ["paid", "rejected"],
    rejected: ["pending_approval"],
    paid: [],
  };

  if (!allowedTransitions[entry.status]?.includes(nextStatus)) {
    throw new Error(`Transition from ${entry.status} to ${nextStatus} is not allowed`);
  }

  const { error } = await admin
    .from("payroll_entries")
    .update({
      status: nextStatus,
      processed_by: identity.appUserId,
      processed_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "payroll_status_changed",
    entity: "payroll_entries",
    entityId: entryId,
    metadata: {
      from: entry.status,
      to: nextStatus,
    },
  });

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/workflows");
  revalidatePath("/admin/reports");
}

export async function updatePayrollCycleStatusAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const cycleId = String(formData.get("cycle_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();

  if (!cycleId) {
    throw new Error("Payroll cycle id is required");
  }

  if (!["draft", "pending_approval", "approved", "paid", "rejected"].includes(nextStatus)) {
    throw new Error("Invalid payroll cycle status");
  }

  const admin = createSupabaseAdminClient();
  const { data: cycle, error: cycleFetchError } = await admin
    .from("payroll_cycles")
    .select("id,status")
    .eq("id", cycleId)
    .maybeSingle();

  if (cycleFetchError || !cycle) {
    throw new Error(cycleFetchError?.message ?? "Payroll cycle not found");
  }

  const { error } = await admin
    .from("payroll_cycles")
    .update({ status: nextStatus })
    .eq("id", cycleId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "payroll_cycle_status_changed",
    entity: "payroll_cycles",
    entityId: cycleId,
    metadata: {
      from: cycle.status,
      to: nextStatus,
    },
  });

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/workflows");
  revalidatePath("/admin/reports");
}

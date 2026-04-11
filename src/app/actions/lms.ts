"use server";

import { revalidatePath } from "next/cache";
import { requireIdentity, requireRole, type UserRole } from "@/lib/auth";
import {
  getFeeInvoiceBalance,
  resolveFeeInvoiceStatus,
  type FeeInvoiceStatus,
} from "@/lib/lms/billing";
import {
  DEFAULT_GRADING_BANDS,
  deriveGradeOutcome,
  type GradingScaleBand,
} from "@/lib/lms/grading";
import {
  DEFAULT_FEE_SETTINGS,
  DEFAULT_PAYMENT_METHOD_TEMPLATES,
  createDefaultEnabledOrganizationPaymentMethods,
  isMissingRelationError,
} from "@/lib/lms/school-rules";
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
  phone?: string | null;
  status?: string;
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
      phone: params.phone ?? null,
      status: params.status ?? "active",
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

type FeePolicy = {
  currencyCode: string;
  allowPartialPayments: boolean;
  lateFeeGraceDays: number;
  lateFeeFlatAmount: number;
  receiptPrefix: string;
};

type ActiveGradingPolicy = {
  id: string | null;
  policyName: string;
  passMark: number;
  decimalPrecision: number;
  bands: GradingScaleBand[];
};

const SCHOOL_RULES_MIGRATION_MESSAGE =
  "School billing and grading settings need the latest database migration. Run the latest Supabase migrations and try again.";

async function ensureOrganizationOperationalDefaults(params: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  organizationId: string;
}) {
  const { admin, organizationId } = params;

  const feeSettingsResult = await admin.from("organization_fee_settings").upsert(
    {
      organization_id: organizationId,
      ...DEFAULT_FEE_SETTINGS,
    },
    { onConflict: "organization_id" },
  );

  if (feeSettingsResult.error && !isMissingRelationError(feeSettingsResult.error)) {
    throw new Error(feeSettingsResult.error.message);
  }

  const paymentMethodsResult = await admin.from("organization_payment_methods").upsert(
    DEFAULT_PAYMENT_METHOD_TEMPLATES.map((method) => ({
      organization_id: organizationId,
      method_code: method.method_code,
      label: method.label,
      instructions: method.instructions,
      enabled: true,
      sort_order: method.sort_order,
    })),
    { onConflict: "organization_id,method_code" },
  );

  if (
    paymentMethodsResult.error &&
    !isMissingRelationError(paymentMethodsResult.error)
  ) {
    throw new Error(paymentMethodsResult.error.message);
  }

  const { data: policy, error: policyLookupError } = await admin
    .from("organization_grading_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();

  if (policyLookupError) {
    if (isMissingRelationError(policyLookupError)) {
      return;
    }

    throw new Error(policyLookupError.message);
  }

  if (!policy?.id) {
    const { data: createdPolicy, error: policyError } = await admin
      .from("organization_grading_policies")
      .insert({
        organization_id: organizationId,
        policy_name: "Default percentage scale",
        pass_mark: 50,
        decimal_precision: 2,
        is_default: true,
      })
      .select("id")
      .single();

    if (policyError) {
      if (isMissingRelationError(policyError)) {
        return;
      }

      throw new Error(policyError.message);
    }

    if (!createdPolicy?.id) {
      throw new Error("Failed to seed grading policy");
    }

    const { error: bandError } = await admin.from("grading_scale_bands").insert(
      DEFAULT_GRADING_BANDS.map((band) => ({
        grading_policy_id: createdPolicy.id,
        band_label: band.band_label,
        min_percentage: band.min_percentage,
        max_percentage: band.max_percentage,
        grade_points: band.grade_points,
        remarks: band.remarks,
        sort_order: band.sort_order,
      })),
    );

    if (bandError && !isMissingRelationError(bandError)) {
      throw new Error(bandError.message);
    }
  }
}

async function getOrganizationFeePolicy(organizationId: string): Promise<FeePolicy> {
  const admin = createSupabaseAdminClient();
  await ensureOrganizationOperationalDefaults({ admin, organizationId });

  const { data, error } = await admin
    .from("organization_fee_settings")
    .select(
      "currency_code, allow_partial_payments, late_fee_grace_days, late_fee_flat_amount, receipt_prefix",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        currencyCode: DEFAULT_FEE_SETTINGS.currency_code,
        allowPartialPayments: DEFAULT_FEE_SETTINGS.allow_partial_payments,
        lateFeeGraceDays: DEFAULT_FEE_SETTINGS.late_fee_grace_days,
        lateFeeFlatAmount: Number(DEFAULT_FEE_SETTINGS.late_fee_flat_amount),
        receiptPrefix: DEFAULT_FEE_SETTINGS.receipt_prefix,
      };
    }

    throw new Error(error.message);
  }

  return {
    currencyCode: data?.currency_code ?? DEFAULT_FEE_SETTINGS.currency_code,
    allowPartialPayments:
      data?.allow_partial_payments ?? DEFAULT_FEE_SETTINGS.allow_partial_payments,
    lateFeeGraceDays:
      data?.late_fee_grace_days ?? DEFAULT_FEE_SETTINGS.late_fee_grace_days,
    lateFeeFlatAmount: Number(
      data?.late_fee_flat_amount ?? DEFAULT_FEE_SETTINGS.late_fee_flat_amount,
    ),
    receiptPrefix: data?.receipt_prefix ?? DEFAULT_FEE_SETTINGS.receipt_prefix,
  };
}

async function listEnabledOrganizationPaymentMethods(organizationId: string) {
  const admin = createSupabaseAdminClient();
  await ensureOrganizationOperationalDefaults({ admin, organizationId });

  const { data, error } = await admin
    .from("organization_payment_methods")
    .select("method_code, label")
    .eq("organization_id", organizationId)
    .eq("enabled", true);

  if (error) {
    if (isMissingRelationError(error)) {
      return createDefaultEnabledOrganizationPaymentMethods();
    }

    throw new Error(error.message);
  }

  return data ?? [];
}

async function getActiveOrganizationGradingPolicy(
  organizationId: string,
): Promise<ActiveGradingPolicy> {
  const admin = createSupabaseAdminClient();
  await ensureOrganizationOperationalDefaults({ admin, organizationId });

  const { data: policy, error: policyError } = await admin
    .from("organization_grading_policies")
    .select("id, policy_name, pass_mark, decimal_precision")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (policyError) {
    if (isMissingRelationError(policyError)) {
      return {
        id: null,
        policyName: "Default percentage scale",
        passMark: 50,
        decimalPrecision: 2,
        bands: DEFAULT_GRADING_BANDS,
      };
    }

    throw new Error(policyError.message);
  }

  if (!policy?.id) {
    return {
      id: null,
      policyName: "Default percentage scale",
      passMark: 50,
      decimalPrecision: 2,
      bands: DEFAULT_GRADING_BANDS,
    };
  }

  const { data: bands, error: bandError } = await admin
    .from("grading_scale_bands")
    .select(
      "band_label, min_percentage, max_percentage, grade_points, remarks, sort_order",
    )
    .eq("grading_policy_id", policy.id)
    .order("sort_order", { ascending: true });

  if (bandError) {
    if (isMissingRelationError(bandError)) {
      return {
        id: policy.id,
        policyName: policy.policy_name,
        passMark: Number(policy.pass_mark),
        decimalPrecision: policy.decimal_precision,
        bands: DEFAULT_GRADING_BANDS,
      };
    }

    throw new Error(bandError.message);
  }

  return {
    id: policy.id,
    policyName: policy.policy_name,
    passMark: Number(policy.pass_mark),
    decimalPrecision: policy.decimal_precision,
    bands:
      (bands ?? []).map((band) => ({
        band_label: band.band_label,
        min_percentage: Number(band.min_percentage),
        max_percentage: Number(band.max_percentage),
        grade_points:
          band.grade_points === null || band.grade_points === undefined
            ? null
            : Number(band.grade_points),
        remarks: band.remarks,
        sort_order: band.sort_order,
      })) || DEFAULT_GRADING_BANDS,
  };
}

function getOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getStaffRole(value: string): UserRole {
  return value === "finance" ? "finance" : "teacher";
}

function parseBooleanValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "true" || raw === "on" || raw === "1";
}

function parseGradingBands(formData: FormData): GradingScaleBand[] {
  const labels = formData.getAll("band_label").map((value) => String(value).trim());
  const mins = formData
    .getAll("band_min_percentage")
    .map((value) => Number(String(value).trim()));
  const maxes = formData
    .getAll("band_max_percentage")
    .map((value) => Number(String(value).trim()));
  const points = formData
    .getAll("band_grade_points")
    .map((value) => Number(String(value).trim()));
  const remarks = formData
    .getAll("band_remarks")
    .map((value) => String(value).trim() || null);

  const bands: GradingScaleBand[] = [];
  for (let index = 0; index < labels.length; index += 1) {
    if (!labels[index]) continue;

    const minPercentage = mins[index];
    const maxPercentage = maxes[index];
    const gradePoints = points[index];

    if (Number.isNaN(minPercentage) || Number.isNaN(maxPercentage)) {
      throw new Error("Each grading band needs valid min and max percentages");
    }

    bands.push({
      band_label: labels[index],
      min_percentage: minPercentage,
      max_percentage: maxPercentage,
      grade_points: Number.isNaN(gradePoints) ? null : gradePoints,
      remarks: remarks[index] ?? null,
      sort_order: index + 1,
    });
  }

  if (bands.length === 0) {
    throw new Error("At least one grading band is required");
  }

  return bands.sort((a, b) => b.max_percentage - a.max_percentage);
}

async function ensureTeacherUser(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  if (!userId) return;

  const { data, error } = await admin
    .from("user_role_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "teacher")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Assigned teacher must have a teacher role");
  }
}

async function ensureStudentBelongsToOrganization(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  studentId: string,
  organizationId: string,
) {
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(studentError?.message ?? "Student profile not found");
  }

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id")
    .eq("id", student.user_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (userError || !user) {
    throw new Error(userError?.message ?? "Student does not belong to this school");
  }

  return student;
}

async function ensureFeePlanBelongsToOrganization(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  feePlanId: string | null,
  organizationId: string,
) {
  if (!feePlanId) {
    return null;
  }

  const { data: plan, error } = await admin
    .from("fee_plans")
    .select("id, plan_code")
    .eq("id", feePlanId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !plan) {
    throw new Error(error?.message ?? "Fee plan not found for this school");
  }

  return plan;
}

async function getFeeInvoiceSnapshot(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invoiceId: string,
  organizationId: string,
) {
  const { data: invoice, error } = await admin
    .from("fee_invoices")
    .select("id, student_id, amount_due, due_date, status")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !invoice) {
    throw new Error(error?.message ?? "Invoice not found");
  }

  return {
    id: invoice.id,
    studentId: invoice.student_id,
    amountDue: Number(invoice.amount_due),
    dueDate: invoice.due_date,
    status: invoice.status as FeeInvoiceStatus,
  };
}

async function getFeeInvoiceTotalPaid(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invoiceId: string,
) {
  const { data, error } = await admin
    .from("fee_payments")
    .select("amount_paid")
    .eq("invoice_id", invoiceId);

  if (error) throw new Error(error.message);

  return Number(
    (data ?? []).reduce((sum, row) => sum + Number(row.amount_paid), 0).toFixed(2),
  );
}

async function syncFeeInvoiceStatus(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invoiceId: string,
  organizationId: string,
  requestedStatus?: FeeInvoiceStatus,
) {
  const invoice = await getFeeInvoiceSnapshot(admin, invoiceId, organizationId);
  const totalPaid = await getFeeInvoiceTotalPaid(admin, invoiceId);
  const nextStatus = resolveFeeInvoiceStatus({
    amountDue: invoice.amountDue,
    totalPaid,
    dueDate: invoice.dueDate,
    requestedStatus: requestedStatus ?? invoice.status,
  });

  const { error } = await admin
    .from("fee_invoices")
    .update({ status: nextStatus })
    .eq("id", invoiceId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  return {
    ...invoice,
    totalPaid,
    balance: getFeeInvoiceBalance(invoice.amountDue, totalPaid),
    nextStatus,
  };
}

export async function createStudentAction(formData: FormData) {
  await requireRole(["admin"]);

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = getOptionalText(formData, "phone");
  const status = String(formData.get("status") ?? "active").trim() || "active";
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
    phone,
    role: "student",
    status,
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
  const phone = getOptionalText(formData, "phone");
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const employeeCode = String(formData.get("employee_code") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const hireDate = String(formData.get("hire_date") ?? "").trim();
  const monthlySalary = Number(formData.get("monthly_salary") ?? "0");
  const roleRaw = String(formData.get("role") ?? "teacher").trim();
  const role = getStaffRole(roleRaw);

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
    phone,
    role,
    status,
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
  const creditHours = Number(formData.get("credit_hours") ?? "1");

  if (!code || !title || !gradeLevel) {
    throw new Error("Missing course values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  await ensureTeacherUser(admin, teacherUserId);

  const payload: Record<string, unknown> = {
    organization_id: organizationId,
    code,
    title,
    grade_level: gradeLevel,
    credit_hours: Number.isNaN(creditHours) || creditHours <= 0 ? 1 : creditHours,
  };

  if (teacherUserId) {
    payload.teacher_user_id = teacherUserId;
  }

  const { error } = await admin.from("courses").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher");
}

export async function updateStudentAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const studentId = String(formData.get("student_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = getOptionalText(formData, "phone");
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const studentCode = String(formData.get("student_code") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const admissionDate = String(formData.get("admission_date") ?? "").trim();

  if (
    !studentId ||
    !userId ||
    !firstName ||
    !lastName ||
    !email ||
    !studentCode ||
    !gradeLevel ||
    !admissionDate
  ) {
    throw new Error("Missing student update values");
  }

  const admin = createSupabaseAdminClient();

  const { error: userError } = await admin
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (userError) throw new Error(userError.message);

  const { error: studentError } = await admin
    .from("students")
    .update({
      student_code: studentCode,
      grade_level: gradeLevel,
      admission_date: admissionDate,
    })
    .eq("id", studentId);

  if (studentError) throw new Error(studentError.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "student_updated",
    entity: "students",
    entityId: studentId,
    metadata: {
      user_id: userId,
      grade_level: gradeLevel,
      status,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/students");
}

export async function deleteStudentAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!studentId) {
    throw new Error("Student id is required");
  }

  const admin = createSupabaseAdminClient();
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, user_id, student_code")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(studentError?.message ?? "Student not found");
  }

  const { error } = await admin.from("users").delete().eq("id", student.user_id);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "student_deleted",
    entity: "students",
    entityId: studentId,
    metadata: {
      student_code: student.student_code,
      deleted_user_id: student.user_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/guardians");
  revalidatePath("/admin/fees");
}

export async function updateStaffAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const staffProfileId = String(formData.get("staff_profile_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = getOptionalText(formData, "phone");
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const employeeCode = String(formData.get("employee_code") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const hireDate = String(formData.get("hire_date") ?? "").trim();
  const monthlySalary = Number(formData.get("monthly_salary") ?? "0");
  const role = getStaffRole(String(formData.get("role") ?? "teacher").trim());

  if (
    !staffProfileId ||
    !userId ||
    !firstName ||
    !lastName ||
    !email ||
    !employeeCode ||
    !department ||
    !designation ||
    !hireDate ||
    !monthlySalary
  ) {
    throw new Error("Missing staff update values");
  }

  const admin = createSupabaseAdminClient();

  const { error: userError } = await admin
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (userError) throw new Error(userError.message);

  const { error: profileError } = await admin
    .from("staff_profiles")
    .update({
      employee_code: employeeCode,
      department,
      designation,
      hire_date: hireDate,
      monthly_salary: monthlySalary,
    })
    .eq("id", staffProfileId);

  if (profileError) throw new Error(profileError.message);

  const { error: roleDeleteError } = await admin
    .from("user_role_assignments")
    .delete()
    .eq("user_id", userId)
    .in("role", ["teacher", "finance"]);

  if (roleDeleteError) throw new Error(roleDeleteError.message);

  const { error: roleInsertError } = await admin
    .from("user_role_assignments")
    .upsert(
      {
        user_id: userId,
        role,
      },
      { onConflict: "user_id,role" },
    );

  if (roleInsertError) throw new Error(roleInsertError.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "staff_updated",
    entity: "staff_profiles",
    entityId: staffProfileId,
    metadata: {
      user_id: userId,
      department,
      designation,
      role,
      status,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher");
}

export async function deleteStaffAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const staffProfileId = String(formData.get("staff_profile_id") ?? "").trim();
  if (!staffProfileId) {
    throw new Error("Staff profile id is required");
  }

  const admin = createSupabaseAdminClient();
  const { data: staff, error: staffError } = await admin
    .from("staff_profiles")
    .select("id, user_id, employee_code")
    .eq("id", staffProfileId)
    .maybeSingle();

  if (staffError || !staff) {
    throw new Error(staffError?.message ?? "Staff profile not found");
  }

  if (staff.user_id === identity.appUserId) {
    throw new Error("You cannot delete your own staff account");
  }

  const { error } = await admin.from("users").delete().eq("id", staff.user_id);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "staff_deleted",
    entity: "staff_profiles",
    entityId: staffProfileId,
    metadata: {
      employee_code: staff.employee_code,
      deleted_user_id: staff.user_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher");
}

export async function updateCourseAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const courseId = String(formData.get("course_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const teacherUserId = String(formData.get("teacher_user_id") ?? "").trim();
  const creditHours = Number(formData.get("credit_hours") ?? "1");

  if (!courseId || !code || !title || !gradeLevel) {
    throw new Error("Missing course update values");
  }

  const admin = createSupabaseAdminClient();
  await ensureTeacherUser(admin, teacherUserId);

  const { error } = await admin
    .from("courses")
    .update({
      code,
      title,
      grade_level: gradeLevel,
      teacher_user_id: teacherUserId || null,
      credit_hours: Number.isNaN(creditHours) || creditHours <= 0 ? 1 : creditHours,
    })
    .eq("id", courseId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "course_updated",
    entity: "courses",
    entityId: courseId,
    metadata: {
      code,
      grade_level: gradeLevel,
      teacher_user_id: teacherUserId || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/timetable");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

export async function deleteCourseAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();

  const courseId = String(formData.get("course_id") ?? "").trim();
  if (!courseId) {
    throw new Error("Course id is required");
  }

  const admin = createSupabaseAdminClient();
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, code, title")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(courseError?.message ?? "Course not found");
  }

  const { error } = await admin.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "course_deleted",
    entity: "courses",
    entityId: courseId,
    metadata: {
      code: course.code,
      title: course.title,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/timetable");
  revalidatePath("/teacher");
  revalidatePath("/student");
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

export async function updateFeePlanAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const planId = String(formData.get("plan_id") ?? "").trim();
  const planCode = String(formData.get("plan_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const gradeLevel = String(formData.get("grade_level") ?? "").trim();
  const amount = Number(formData.get("amount") ?? "0");
  const recurrence = String(formData.get("recurrence") ?? "monthly").trim();
  const active = parseBooleanValue(formData, "active");

  if (!planId || !planCode || !title || !gradeLevel || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Missing fee plan update values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("fee_plans")
    .update({
      plan_code: planCode,
      title,
      grade_level: gradeLevel,
      amount,
      recurrence: recurrence || "monthly",
      active,
    })
    .eq("id", planId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_plan_updated",
    entity: "fee_plans",
    entityId: planId,
    metadata: {
      plan_code: planCode,
      grade_level: gradeLevel,
      recurrence,
      active,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
}

export async function deleteFeePlanAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const planId = String(formData.get("plan_id") ?? "").trim();
  if (!planId) {
    throw new Error("Fee plan id is required");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const { data: plan, error: planError } = await admin
    .from("fee_plans")
    .select("id, plan_code, title")
    .eq("id", planId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Fee plan not found");
  }

  const { error } = await admin
    .from("fee_plans")
    .delete()
    .eq("id", planId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_plan_deleted",
    entity: "fee_plans",
    entityId: planId,
    metadata: {
      plan_code: plan.plan_code,
      title: plan.title,
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

  await ensureStudentBelongsToOrganization(admin, studentId, organizationId);
  await ensureFeePlanBelongsToOrganization(admin, feePlanId, organizationId);

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

export async function updateFeeInvoiceAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const feePlanIdRaw = String(formData.get("fee_plan_id") ?? "").trim();
  const invoiceCode = String(formData.get("invoice_code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amountDue = Number(formData.get("amount_due") ?? "0");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const workflowStatus = String(formData.get("workflow_status") ?? "issued").trim();

  if (
    !invoiceId ||
    !studentId ||
    !invoiceCode ||
    !title ||
    Number.isNaN(amountDue) ||
    amountDue <= 0 ||
    !dueDate
  ) {
    throw new Error("Missing fee invoice update values");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const feePlanId = feePlanIdRaw || null;

  await ensureStudentBelongsToOrganization(admin, studentId, organizationId);
  await ensureFeePlanBelongsToOrganization(admin, feePlanId, organizationId);

  const existingInvoice = await getFeeInvoiceSnapshot(admin, invoiceId, organizationId);
  const totalPaid = await getFeeInvoiceTotalPaid(admin, invoiceId);

  if (amountDue < totalPaid) {
    throw new Error(
      `Amount due cannot be lower than the ${totalPaid.toFixed(2)} already collected on this invoice.`,
    );
  }

  if (workflowStatus === "cancelled" && totalPaid > 0) {
    throw new Error("Remove recorded payments before cancelling an invoice.");
  }

  if (workflowStatus === "draft" && totalPaid > 0) {
    throw new Error("Draft invoices cannot keep recorded payments.");
  }

  const requestedStatus: FeeInvoiceStatus =
    workflowStatus === "cancelled"
      ? "cancelled"
      : workflowStatus === "draft"
        ? "draft"
        : "issued";

  const { error } = await admin
    .from("fee_invoices")
    .update({
      student_id: studentId,
      fee_plan_id: feePlanId,
      invoice_code: invoiceCode,
      title,
      amount_due: amountDue,
      due_date: dueDate,
      notes: notes || null,
      status: requestedStatus,
    })
    .eq("id", invoiceId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  const syncedInvoice = await syncFeeInvoiceStatus(
    admin,
    invoiceId,
    organizationId,
    requestedStatus,
  );

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_invoice_updated",
    entity: "fee_invoices",
    entityId: invoiceId,
    metadata: {
      previous_student_id: existingInvoice.studentId,
      student_id: studentId,
      fee_plan_id: feePlanId,
      invoice_code: invoiceCode,
      amount_due: amountDue,
      status: syncedInvoice.nextStatus,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function deleteFeeInvoiceAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  if (!invoiceId) {
    throw new Error("Invoice id is required");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await admin
    .from("fee_invoices")
    .select("id, invoice_code, title")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    throw new Error(invoiceError?.message ?? "Invoice not found");
  }

  const { error } = await admin
    .from("fee_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_invoice_deleted",
    entity: "fee_invoices",
    entityId: invoiceId,
    metadata: {
      invoice_code: invoice.invoice_code,
      title: invoice.title,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function recordFeePaymentAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();
  const organizationId = await getOrganizationId();

  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const amountPaid = Number(formData.get("amount_paid") ?? "0");
  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  const method = String(formData.get("method") ?? "cash").trim();
  const referenceNo = String(formData.get("reference_no") ?? "").trim();

  if (!invoiceId || Number.isNaN(amountPaid) || amountPaid <= 0) {
    throw new Error("Missing payment values");
  }

  const admin = createSupabaseAdminClient();
  const invoice = await getFeeInvoiceSnapshot(admin, invoiceId, organizationId);

  if (invoice.status === "cancelled") {
    throw new Error("Cancelled invoices cannot receive new payments.");
  }

  if (invoice.status === "draft") {
    throw new Error("Draft invoices must be issued before recording payments.");
  }

  const [feePolicy, enabledMethods] = await Promise.all([
    getOrganizationFeePolicy(organizationId),
    listEnabledOrganizationPaymentMethods(organizationId),
  ]);

  if (!enabledMethods.some((item) => item.method_code === method)) {
    throw new Error("This payment method is not enabled for the school");
  }

  const alreadyPaid = await getFeeInvoiceTotalPaid(admin, invoice.id);
  const remainingBalance = getFeeInvoiceBalance(invoice.amountDue, alreadyPaid);

  if (!feePolicy.allowPartialPayments && Number(amountPaid.toFixed(2)) !== Number(remainingBalance.toFixed(2))) {
    throw new Error(
      `Partial payments are disabled for this school. Record exactly ${remainingBalance.toFixed(2)} to close the invoice.`,
    );
  }

  if (amountPaid > remainingBalance) {
    throw new Error(
      `Payment is higher than the remaining balance. Record ${remainingBalance.toFixed(2)} or less.`,
    );
  }

  const { error } = await admin.from("fee_payments").insert({
    organization_id: organizationId,
    invoice_id: invoice.id,
    student_id: invoice.studentId,
    amount_paid: amountPaid,
    payment_date: paymentDate || new Date().toISOString().slice(0, 10),
    method: method || "cash",
    reference_no: referenceNo || null,
    recorded_by: identity.appUserId,
  });

  if (error) throw new Error(error.message);
  const syncedInvoice = await syncFeeInvoiceStatus(admin, invoice.id, organizationId);

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_payment_recorded",
    entity: "fee_payments",
    metadata: {
      invoice_id: invoice.id,
      student_id: invoice.studentId,
      amount_paid: amountPaid,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      method: method || "cash",
      invoice_status: syncedInvoice.nextStatus,
      invoice_total_paid: syncedInvoice.totalPaid,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function deleteFeePaymentAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const paymentId = String(formData.get("payment_id") ?? "").trim();
  if (!paymentId) {
    throw new Error("Payment id is required");
  }

  const organizationId = await getOrganizationId();
  const admin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("fee_payments")
    .select("id, invoice_id, amount_paid, method, reference_no")
    .eq("id", paymentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? "Payment not found");
  }

  const { error } = await admin
    .from("fee_payments")
    .delete()
    .eq("id", paymentId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  const syncedInvoice = await syncFeeInvoiceStatus(
    admin,
    payment.invoice_id,
    organizationId,
  );

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "fee_payment_deleted",
    entity: "fee_payments",
    entityId: paymentId,
    metadata: {
      invoice_id: payment.invoice_id,
      amount_paid: Number(payment.amount_paid),
      method: payment.method,
      reference_no: payment.reference_no,
      invoice_status: syncedInvoice.nextStatus,
    },
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/reports");
  revalidatePath("/student/fees");
}

export async function saveFeeSettingsAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();
  const organizationId = await getOrganizationId();

  const currencyCode = String(formData.get("currency_code") ?? "PKR").trim().toUpperCase();
  const allowPartialPayments = parseBooleanValue(formData, "allow_partial_payments");
  const lateFeeGraceDays = Number(formData.get("late_fee_grace_days") ?? "0");
  const lateFeeFlatAmount = Number(formData.get("late_fee_flat_amount") ?? "0");
  const receiptPrefix = String(formData.get("receipt_prefix") ?? "RCPT").trim().toUpperCase();

  if (!currencyCode || currencyCode.length !== 3) {
    throw new Error("Currency code must be a 3-letter code like PKR or USD");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("organization_fee_settings").upsert(
    {
      organization_id: organizationId,
      currency_code: currencyCode,
      allow_partial_payments: allowPartialPayments,
      late_fee_grace_days: Number.isNaN(lateFeeGraceDays) ? 0 : lateFeeGraceDays,
      late_fee_flat_amount: Number.isNaN(lateFeeFlatAmount) ? 0 : lateFeeFlatAmount,
      receipt_prefix: receiptPrefix || "RCPT",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(error.message);
  }

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "organization_fee_settings_saved",
    entity: "organization_fee_settings",
    metadata: {
      currency_code: currencyCode,
      allow_partial_payments: allowPartialPayments,
      late_fee_grace_days: lateFeeGraceDays,
      late_fee_flat_amount: lateFeeFlatAmount,
      receipt_prefix: receiptPrefix || "RCPT",
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/fees");
  revalidatePath("/student/fees");
}

export async function savePaymentMethodAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();
  const organizationId = await getOrganizationId();

  const methodId = String(formData.get("method_id") ?? "").trim();
  const methodCodeRaw = String(formData.get("method_code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const instructions = getOptionalText(formData, "instructions");
  const enabled = parseBooleanValue(formData, "enabled");
  const sortOrder = Number(formData.get("sort_order") ?? "1");

  const methodCode = methodCodeRaw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!methodCode || !label) {
    throw new Error("Payment method code and label are required");
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    organization_id: organizationId,
    method_code: methodCode,
    label,
    instructions,
    enabled,
    sort_order: Number.isNaN(sortOrder) ? 1 : sortOrder,
  };

  const response = methodId
    ? await admin.from("organization_payment_methods").update(payload).eq("id", methodId)
    : await admin
        .from("organization_payment_methods")
        .upsert(payload, { onConflict: "organization_id,method_code" });

  if (response.error) {
    if (isMissingRelationError(response.error)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(response.error.message);
  }

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "organization_payment_method_saved",
    entity: "organization_payment_methods",
    entityId: methodId || null,
    metadata: {
      method_code: methodCode,
      enabled,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/fees");
}

export async function deletePaymentMethodAction(formData: FormData) {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();
  const organizationId = await getOrganizationId();

  const methodId = String(formData.get("method_id") ?? "").trim();
  if (!methodId) {
    throw new Error("Payment method id is required");
  }

  const admin = createSupabaseAdminClient();
  const { data: enabledMethods, error: countError } = await admin
    .from("organization_payment_methods")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("enabled", true);

  if (countError) {
    if (isMissingRelationError(countError)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(countError.message);
  }

  const { data: currentMethod, error: currentMethodError } = await admin
    .from("organization_payment_methods")
    .select("id, method_code, enabled")
    .eq("id", methodId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (currentMethodError) {
    if (isMissingRelationError(currentMethodError)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(currentMethodError.message);
  }

  if (!currentMethod) {
    throw new Error("Payment method not found");
  }

  if (currentMethod.enabled && (enabledMethods ?? []).length <= 1) {
    throw new Error("Keep at least one enabled payment method for the school");
  }

  const { error } = await admin
    .from("organization_payment_methods")
    .delete()
    .eq("id", methodId)
    .eq("organization_id", organizationId);

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(error.message);
  }

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "organization_payment_method_deleted",
    entity: "organization_payment_methods",
    entityId: methodId,
    metadata: {
      method_code: currentMethod.method_code,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/fees");
}

export async function saveDefaultGradingPolicyAction(formData: FormData) {
  await requireRole(["admin"]);
  const identity = await requireIdentity();
  const organizationId = await getOrganizationId();

  const policyName = String(formData.get("policy_name") ?? "").trim();
  const passMark = Number(formData.get("pass_mark") ?? "50");
  const decimalPrecision = Number(formData.get("decimal_precision") ?? "2");
  const bands = parseGradingBands(formData);

  if (!policyName) {
    throw new Error("Policy name is required");
  }

  if (Number.isNaN(passMark) || passMark < 0 || passMark > 100) {
    throw new Error("Pass mark must be between 0 and 100");
  }

  if (Number.isNaN(decimalPrecision) || decimalPrecision < 0 || decimalPrecision > 4) {
    throw new Error("Decimal precision must be between 0 and 4");
  }

  for (const band of bands) {
    if (
      band.min_percentage < 0 ||
      band.max_percentage > 100 ||
      band.min_percentage > band.max_percentage
    ) {
      throw new Error("Each grading band must stay between 0 and 100");
    }
  }

  const admin = createSupabaseAdminClient();
  const { error: clearDefaultError } = await admin
    .from("organization_grading_policies")
    .update({ is_default: false })
    .eq("organization_id", organizationId)
    .eq("is_default", true);

  if (clearDefaultError) {
    if (isMissingRelationError(clearDefaultError)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(clearDefaultError.message);
  }

  const { data: createdPolicy, error: policyError } = await admin
    .from("organization_grading_policies")
    .insert({
      organization_id: organizationId,
      policy_name: policyName,
      pass_mark: passMark,
      decimal_precision: decimalPrecision,
      is_default: true,
      created_by: identity.appUserId,
    })
    .select("id")
    .single();

  if (policyError) {
    if (isMissingRelationError(policyError)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(policyError.message);
  }

  if (!createdPolicy?.id) {
    throw new Error("Failed to create grading policy");
  }

  const { error: bandError } = await admin.from("grading_scale_bands").insert(
    bands.map((band, index) => ({
      grading_policy_id: createdPolicy.id,
      band_label: band.band_label,
      min_percentage: band.min_percentage,
      max_percentage: band.max_percentage,
      grade_points: band.grade_points,
      remarks: band.remarks,
      sort_order: index + 1,
    })),
  );

  if (bandError) {
    if (isMissingRelationError(bandError)) {
      throw new Error(SCHOOL_RULES_MIGRATION_MESSAGE);
    }

    throw new Error(bandError.message);
  }

  await logAuditEvent({
    actorUserId: identity.appUserId,
    action: "organization_grading_policy_saved",
    entity: "organization_grading_policies",
    entityId: createdPolicy.id,
    metadata: {
      policy_name: policyName,
      pass_mark: passMark,
      band_count: bands.length,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/teacher/grades");
  revalidatePath("/teacher/submissions");
  revalidatePath("/student/grades");
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
    .select(
      "id, max_score, title, course_id, courses!assignments_course_id_fkey(teacher_user_id, organization_id)",
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    throw new Error(assignmentError?.message ?? "Assignment not found");
  }

  const assignmentCourse = (
    Array.isArray(assignment.courses) ? assignment.courses[0] : assignment.courses
  ) as { teacher_user_id?: string | null; organization_id?: string | null } | null;

  if (role === "teacher" && assignmentCourse?.teacher_user_id !== identity.appUserId) {
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

  const gradingPolicy = await getActiveOrganizationGradingPolicy(
    assignmentCourse?.organization_id ?? (await getOrganizationId()),
  );
  const gradeOutcome = deriveGradeOutcome({
    score,
    maxScore,
    passMark: gradingPolicy.passMark,
    decimalPrecision: gradingPolicy.decimalPrecision,
    bands: gradingPolicy.bands.length > 0 ? gradingPolicy.bands : DEFAULT_GRADING_BANDS,
  });

  const gradedAt = new Date().toISOString();
  const { error } = await admin.from("grades").upsert(
    {
      assignment_id: assignmentId,
      student_id: studentId,
      score,
      percentage: gradeOutcome.percentage,
      letter_grade: gradeOutcome.letterGrade,
      grade_points: gradeOutcome.gradePoints,
      grading_policy_id: gradingPolicy.id,
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
      percentage: gradeOutcome.percentage,
      letter_grade: gradeOutcome.letterGrade,
      grade_points: gradeOutcome.gradePoints,
      grading_policy_name: gradingPolicy.policyName,
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

export async function removeStudentEnrollmentAction(formData: FormData) {
  await requireRole(["admin"]);

  const courseId = String(formData.get("course_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();

  if (!courseId || !studentId) {
    throw new Error("Course and student are required");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("course_enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/courses");
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/grades");
  revalidatePath("/student/timetable");
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

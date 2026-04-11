"use server";

import { revalidatePath } from "next/cache";
import { requireIdentity, requireRole } from "@/lib/auth";
import { DEFAULT_GRADING_BANDS } from "@/lib/lms/grading";
import { SUBSCRIPTION_POLICIES } from "@/lib/platform/subscription-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PlanSeed = {
  code: string;
  name: string;
  monthly_price_pkr: number;
  description: string;
  features: string[];
  includes_personal_branding: boolean;
};

const PLAN_SEEDS: PlanSeed[] = SUBSCRIPTION_POLICIES.map((policy) => ({
  code: policy.code,
  name: policy.name,
  monthly_price_pkr: policy.monthlyPricePkr,
  description: policy.description,
  features: policy.features,
  includes_personal_branding: policy.includesPersonalBranding,
}));

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SCHOOL_PAYMENT_METHOD_SEEDS = [
  {
    method_code: "cash",
    label: "Cash",
    instructions: "Record cash collected at front desk or finance office.",
    sort_order: 1,
  },
  {
    method_code: "bank_transfer",
    label: "Bank transfer",
    instructions: "Collect transfer slip or bank reference before approval.",
    sort_order: 2,
  },
  {
    method_code: "card",
    label: "Card",
    instructions: "Use for POS or school office card collections.",
    sort_order: 3,
  },
  {
    method_code: "online",
    label: "Online payment",
    instructions: "Use for gateway or wallet-based school collections.",
    sort_order: 4,
  },
] as const;

function normalizeOrganizationCode(input: string, fallbackName: string): string {
  const source = (input || fallbackName).trim().toUpperCase();
  const sanitized = source.replace(/[^A-Z0-9]/g, "");
  return sanitized.slice(0, 12) || "SCHOOL";
}

async function ensureUniqueOrganizationCode(baseCode: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate =
      attempt === 0 ? baseCode : `${baseCode.slice(0, 9)}${String(attempt).padStart(3, "0")}`;

    const { data, error } = await admin
      .from("organizations")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.id) return candidate;
  }

  throw new Error("Unable to generate unique school code");
}

async function upsertSubscriptionPlans() {
  const admin = createSupabaseAdminClient();
  const payload = PLAN_SEEDS.map((plan) => ({
    ...plan,
    active: true,
  }));

  const { error } = await admin
    .from("subscription_plans")
    .upsert(payload, { onConflict: "code" });

  if (error) throw new Error(error.message);
}

async function createAuditLog(params: {
  organizationId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  await admin.from("audit_logs").insert({
    organization_id: params.organizationId,
    actor_user_id: params.actorUserId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}

async function seedSchoolOperationalDefaults(params: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  organizationId: string;
}) {
  const { admin, organizationId } = params;

  await admin.from("organization_fee_settings").upsert(
    {
      organization_id: organizationId,
      currency_code: "PKR",
      allow_partial_payments: true,
      late_fee_grace_days: 0,
      late_fee_flat_amount: 0,
      receipt_prefix: "RCPT",
    },
    { onConflict: "organization_id" },
  );

  await admin.from("organization_payment_methods").upsert(
    SCHOOL_PAYMENT_METHOD_SEEDS.map((method) => ({
      organization_id: organizationId,
      method_code: method.method_code,
      label: method.label,
      instructions: method.instructions,
      enabled: true,
      sort_order: method.sort_order,
    })),
    { onConflict: "organization_id,method_code" },
  );

  const { data: existingDefaultPolicy } = await admin
    .from("organization_grading_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();

  if (!existingDefaultPolicy?.id) {
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

    if (policyError || !createdPolicy?.id) {
      throw new Error(policyError?.message ?? "Failed to create school grading policy");
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

    if (bandError) throw new Error(bandError.message);
  }
}

export async function bootstrapPlatformPlansAction() {
  await requireRole(["platform_admin"]);
  await upsertSubscriptionPlans();
  revalidatePath("/platform");
}

export async function createSchoolAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();

  const schoolName = String(formData.get("school_name") ?? "").trim();
  const schoolCodeRaw = String(formData.get("school_code") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  const timezone = String(formData.get("timezone") ?? "Asia/Karachi").trim();
  const adminFirstName = String(formData.get("admin_first_name") ?? "").trim();
  const adminLastName = String(formData.get("admin_last_name") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim().toLowerCase();
  const adminPassword = String(formData.get("admin_password") ?? "").trim();
  const planCode = String(formData.get("plan_code") ?? "BASIC_3K").trim();
  const subscriptionStatus = String(formData.get("subscription_status") ?? "trial").trim();

  if (!schoolName || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
    throw new Error("School and admin credentials are required");
  }
  if (adminPassword.length < 8) {
    throw new Error("Admin password must be at least 8 characters");
  }
  if (!["trial", "active", "past_due", "cancelled", "suspended"].includes(subscriptionStatus)) {
    throw new Error("Invalid subscription status");
  }

  const admin = createSupabaseAdminClient();

  const codeBase = normalizeOrganizationCode(schoolCodeRaw, schoolName);
  const schoolCode = await ensureUniqueOrganizationCode(codeBase);

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, monthly_price_pkr, includes_personal_branding")
    .eq("code", planCode)
    .eq("active", true)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Selected plan is not available");
  }

  const orgStatus = subscriptionStatus === "suspended"
    ? "suspended"
    : subscriptionStatus === "trial"
      ? "trial"
      : "active";

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      code: schoolCode,
      name: schoolName,
      contact_email: contactEmail || adminEmail,
      status: orgStatus,
      timezone,
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    throw new Error(organizationError?.message ?? "Failed to create school organization");
  }

  await seedSchoolOperationalDefaults({
    admin,
    organizationId: organization.id,
  });

  const { error: brandingError } = await admin.from("organization_branding").insert({
    organization_id: organization.id,
    brand_name: schoolName,
  });

  if (brandingError) {
    throw new Error(brandingError.message);
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("organization_subscriptions")
    .insert({
      organization_id: organization.id,
      plan_id: plan.id,
      status: subscriptionStatus,
      amount_pkr: Number(plan.monthly_price_pkr),
      starts_on: new Date().toISOString().slice(0, 10),
      seats: 500,
      custom_branding_enabled: plan.includes_personal_branding,
    })
    .select("id")
    .single();

  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message ?? "Failed to assign subscription");
  }

  const fullName = `${adminFirstName} ${adminLastName}`.trim();
  const authUserResult = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authUserResult.error || !authUserResult.data.user?.id) {
    throw new Error(authUserResult.error?.message ?? "Failed to create school admin login");
  }

  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .insert({
      organization_id: organization.id,
      auth_user_id: authUserResult.data.user.id,
      first_name: adminFirstName,
      last_name: adminLastName,
      email: adminEmail,
      status: "active",
    })
    .select("id")
    .single();

  if (appUserError || !appUser) {
    throw new Error(appUserError?.message ?? "Failed to create school admin profile");
  }

  const { error: roleError } = await admin.from("user_role_assignments").insert({
    user_id: appUser.id,
    role: "admin",
  });

  if (roleError) {
    throw new Error(roleError.message);
  }

  await createAuditLog({
    organizationId: organization.id,
    actorUserId: actor.appUserId,
    action: "platform_school_onboarded",
    entity: "organizations",
    entityId: organization.id,
    metadata: {
      school_code: schoolCode,
      school_admin_email: adminEmail,
      subscription_id: subscription.id,
      subscription_status: subscriptionStatus,
      plan_code: planCode,
    },
  });

  revalidatePath("/platform");
}

export async function updateSchoolStatusAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();
  const admin = createSupabaseAdminClient();

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!organizationId || !["active", "suspended", "trial"].includes(status)) {
    throw new Error("Invalid school status update payload");
  }

  const { error } = await admin
    .from("organizations")
    .update({ status })
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  if (status === "suspended") {
    await admin
      .from("organization_subscriptions")
      .update({ status: "suspended" })
      .eq("organization_id", organizationId)
      .in("status", ["active", "trial", "past_due"]);
  }

  await createAuditLog({
    organizationId,
    actorUserId: actor.appUserId,
    action: "platform_school_status_updated",
    entity: "organizations",
    entityId: organizationId,
    metadata: { status },
  });

  revalidatePath("/platform");
}

export async function assignSchoolSubscriptionAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();
  const admin = createSupabaseAdminClient();

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const planCode = String(formData.get("plan_code") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const seats = Number(formData.get("seats") ?? "500");

  if (!organizationId || !planCode) {
    throw new Error("School and plan are required");
  }

  if (!["trial", "active", "past_due", "cancelled", "suspended"].includes(status)) {
    throw new Error("Invalid subscription status");
  }

  if (Number.isNaN(seats) || seats <= 0) {
    throw new Error("Seats must be a positive number");
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, monthly_price_pkr, includes_personal_branding")
    .eq("code", planCode)
    .eq("active", true)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Plan not found");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: closeError } = await admin
    .from("organization_subscriptions")
    .update({
      status: "cancelled",
      ends_on: today,
    })
    .eq("organization_id", organizationId)
    .in("status", ["active", "trial", "past_due", "suspended"]);

  if (closeError) throw new Error(closeError.message);

  const { data: created, error: createError } = await admin
    .from("organization_subscriptions")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      status,
      amount_pkr: Number(plan.monthly_price_pkr),
      starts_on: today,
      seats,
      custom_branding_enabled: plan.includes_personal_branding,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to update subscription");
  }

  const nextOrgStatus = status === "suspended"
    ? "suspended"
    : status === "trial"
      ? "trial"
      : "active";

  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({ status: nextOrgStatus })
    .eq("id", organizationId);

  if (orgUpdateError) throw new Error(orgUpdateError.message);

  await createAuditLog({
    organizationId,
    actorUserId: actor.appUserId,
    action: "platform_school_subscription_changed",
    entity: "organization_subscriptions",
    entityId: created.id,
    metadata: {
      plan_code: planCode,
      status,
      seats,
      amount_pkr: Number(plan.monthly_price_pkr),
    },
  });

  revalidatePath("/platform");
}

export async function saveSchoolBrandingAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();
  const admin = createSupabaseAdminClient();

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const brandName = String(formData.get("brand_name") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const primaryColor = String(formData.get("primary_color") ?? "").trim();
  const secondaryColor = String(formData.get("secondary_color") ?? "").trim();
  const accentColor = String(formData.get("accent_color") ?? "").trim();

  if (!organizationId || !brandName) {
    throw new Error("School and brand name are required");
  }

  for (const color of [primaryColor, secondaryColor, accentColor]) {
    if (!HEX_COLOR_REGEX.test(color)) {
      throw new Error("Colors must be valid hex values (example: #4f46e5)");
    }
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("organization_subscriptions")
    .select("custom_branding_enabled")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trial", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw new Error(subscriptionError.message);
  if (!subscription?.custom_branding_enabled) {
    throw new Error(
      "Custom branding is only available on Elite plan. Upgrade subscription first.",
    );
  }

  const { error } = await admin.from("organization_branding").upsert(
    {
      organization_id: organizationId,
      brand_name: brandName,
      logo_url: logoUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId,
    actorUserId: actor.appUserId,
    action: "platform_school_branding_updated",
    entity: "organization_branding",
    metadata: {
      brand_name: brandName,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
    },
  });

  revalidatePath("/platform");
}

export async function recordPlatformPaymentAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();
  const admin = createSupabaseAdminClient();

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const amountPkr = Number(formData.get("amount_pkr") ?? "0");
  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  const method = String(formData.get("method") ?? "bank_transfer").trim();
  const referenceNo = String(formData.get("reference_no") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!organizationId || Number.isNaN(amountPkr) || amountPkr <= 0) {
    throw new Error("Valid school and amount are required");
  }

  const { data: activeSubscription, error: subscriptionError } = await admin
    .from("organization_subscriptions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw new Error(subscriptionError.message);

  const { data: payment, error } = await admin
    .from("platform_payments")
    .insert({
      organization_id: organizationId,
      subscription_id: activeSubscription?.id ?? null,
      amount_pkr: amountPkr,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      method: method || "bank_transfer",
      reference_no: referenceNo || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !payment) {
    throw new Error(error?.message ?? "Failed to record payment");
  }

  if (activeSubscription?.id && activeSubscription.status === "past_due") {
    await admin
      .from("organization_subscriptions")
      .update({ status: "active" })
      .eq("id", activeSubscription.id);
    await admin
      .from("organizations")
      .update({ status: "active" })
      .eq("id", organizationId);
  }

  await createAuditLog({
    organizationId,
    actorUserId: actor.appUserId,
    action: "platform_payment_recorded",
    entity: "platform_payments",
    entityId: payment.id,
    metadata: {
      amount_pkr: amountPkr,
      method,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
    },
  });

  revalidatePath("/platform");
}

export async function processSubscriptionRequestAction(formData: FormData) {
  await requireRole(["platform_admin"]);
  const actor = await requireIdentity();
  const admin = createSupabaseAdminClient();

  const auditLogId = String(formData.get("audit_log_id") ?? "").trim();
  const approve = String(formData.get("approve") ?? "true").trim() === "true";

  if (!auditLogId) throw new Error("audit_log_id is required");

  const { data: logRow, error: logError } = await admin
    .from("audit_logs")
    .select("id, organization_id, metadata")
    .eq("id", auditLogId)
    .maybeSingle();

  if (logError || !logRow) throw new Error(logError?.message ?? "Audit log not found");

  const metadata = (logRow.metadata as Record<string, unknown>) ?? {};
  const requestedPlan = String(metadata.requested_plan ?? "").trim();
  const requestedStatus = String(metadata.requested_status ?? "active").trim();
  const seats = Number(metadata.requested_seats ?? 500);

  if (!requestedPlan) {
    throw new Error("Requested plan not found in audit log metadata");
  }

  if (!approve) {
    // insert audit log for rejection
    await createAuditLog({
      organizationId: logRow.organization_id,
      actorUserId: actor.appUserId,
      action: "subscription_request_rejected",
      entity: "audit_logs",
      entityId: auditLogId,
      metadata: { requested_plan: requestedPlan },
    });
    revalidatePath("/platform");
    return;
  }

  // Find plan
  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, monthly_price_pkr, includes_personal_branding")
    .eq("code", requestedPlan)
    .eq("active", true)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Plan not found");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: closeError } = await admin
    .from("organization_subscriptions")
    .update({ status: "cancelled", ends_on: today })
    .eq("organization_id", logRow.organization_id)
    .in("status", ["active", "trial", "past_due", "suspended"]);

  if (closeError) throw new Error(closeError.message);

  const { data: created, error: createError } = await admin
    .from("organization_subscriptions")
    .insert({
      organization_id: logRow.organization_id,
      plan_id: plan.id,
      status: requestedStatus,
      amount_pkr: Number(plan.monthly_price_pkr),
      starts_on: today,
      seats: Number.isNaN(seats) ? 500 : seats,
      custom_branding_enabled: plan.includes_personal_branding,
    })
    .select("id")
    .single();

  if (createError || !created) throw new Error(createError?.message ?? "Failed to create subscription");

  const nextOrgStatus = requestedStatus === "suspended" ? "suspended" : requestedStatus === "trial" ? "trial" : "active";

  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({ status: nextOrgStatus })
    .eq("id", logRow.organization_id);

  if (orgUpdateError) throw new Error(orgUpdateError.message);

  await createAuditLog({
    organizationId: logRow.organization_id,
    actorUserId: actor.appUserId,
    action: "platform_school_subscription_changed",
    entity: "organization_subscriptions",
    entityId: created.id,
    metadata: { plan_code: requestedPlan, status: requestedStatus, seats: Number.isNaN(seats) ? 500 : seats },
  });

  revalidatePath("/platform");
}

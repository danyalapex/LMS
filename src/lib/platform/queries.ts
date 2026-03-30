import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MaybeArray<T> = T | T[] | null;

function one<T>(value: MaybeArray<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const LIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trial", "past_due"]);

export type PlatformOverview = {
  schoolCount: number;
  activeSchoolCount: number;
  suspendedSchoolCount: number;
  trialSchoolCount: number;
  activeSubscriptionCount: number;
  totalMonthlyRecurringPkr: number;
  totalIncomePkr: number;
  incomeThisMonthPkr: number;
  totalUsers: number;
};

export type SubscriptionPlanItem = {
  id: string;
  code: string;
  name: string;
  monthly_price_pkr: number;
  description: string | null;
  features: string[];
  includes_personal_branding: boolean;
  active: boolean;
};

export type SchoolSubscriptionItem = {
  id: string;
  status: string;
  amount_pkr: number;
  starts_on: string;
  ends_on: string | null;
  seats: number;
  custom_branding_enabled: boolean;
  plan_code: string;
  plan_name: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  next_billing_date?: string | null;
};

export type PlatformSchoolItem = {
  id: string;
  code: string;
  name: string;
  contact_email: string | null;
  status: string;
  timezone: string;
  created_at: string;
  user_count: number;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  current_subscription: SchoolSubscriptionItem | null;
};

export type PlatformPaymentItem = {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_code: string;
  amount_pkr: number;
  payment_date: string;
  method: string;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  subscription_status: string | null;
  subscription_plan_code: string | null;
  subscription_plan_name: string | null;
};

export async function listSubscriptionPlans(): Promise<SubscriptionPlanItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscription_plans")
    .select(
      "id, code, name, monthly_price_pkr, description, features, includes_personal_branding, active",
    )
    .order("monthly_price_pkr", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    monthly_price_pkr: Number(row.monthly_price_pkr),
    description: row.description,
    features: Array.isArray(row.features)
      ? row.features.map((item) => String(item))
      : [],
    includes_personal_branding: row.includes_personal_branding,
    active: row.active,
  }));
}

export async function listPlatformSchools(): Promise<PlatformSchoolItem[]> {
  const admin = createSupabaseAdminClient();
  // Fetch organizations, branding and users in parallel. The subscriptions
  // query may include new Stripe-related columns which might not exist yet in
  // some DB instances (staging/prod without migration). Try the extended
  // select first, and fall back to a base select if the extended query fails.
  const [organizationsRes, brandingRes, usersRes] = await Promise.all([
    admin
      .from("organizations")
      .select("id, code, name, contact_email, status, timezone, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("organization_branding")
      .select(
        "organization_id, brand_name, logo_url, primary_color, secondary_color, accent_color",
      )
      .limit(1000),
    admin.from("users").select("organization_id").limit(50000),
  ]);

  if (organizationsRes.error) throw new Error(organizationsRes.error.message);
  if (brandingRes.error) throw new Error(brandingRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);

  // Attempt subscriptions query with Stripe fields first.
  const subscriptionsExtendedSelect =
    "id, organization_id, status, amount_pkr, starts_on, ends_on, seats, custom_branding_enabled, stripe_customer_id, stripe_subscription_id, stripe_price_id, next_billing_date, created_at, subscription_plans!organization_subscriptions_plan_id_fkey(code,name)";

  const subscriptionsBaseSelect =
    "id, organization_id, status, amount_pkr, starts_on, ends_on, seats, custom_branding_enabled, created_at, subscription_plans!organization_subscriptions_plan_id_fkey(code,name)";

  let subscriptionsRes = await admin
    .from("organization_subscriptions")
    .select(subscriptionsExtendedSelect)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (subscriptionsRes.error) {
    // If extended select fails (likely missing columns), try the base select
    // without the Stripe-related fields so the platform can continue to
    // operate until the migration is applied.
    const fallback = await admin
      .from("organization_subscriptions")
      .select(subscriptionsBaseSelect)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (fallback.error) {
      throw new Error(fallback.error.message);
    }

    subscriptionsRes = fallback;
  }

  const userCountByOrg = new Map<string, number>();
  for (const row of usersRes.data ?? []) {
    userCountByOrg.set(
      row.organization_id,
      (userCountByOrg.get(row.organization_id) ?? 0) + 1,
    );
  }

  const subscriptionByOrg = new Map<string, SchoolSubscriptionItem>();
  for (const row of subscriptionsRes.data ?? []) {
    if (subscriptionByOrg.has(row.organization_id)) continue;
    const plan = one(
      row.subscription_plans as MaybeArray<{ code: string; name: string }>,
    );

    subscriptionByOrg.set(row.organization_id, {
      id: row.id,
      status: row.status,
      amount_pkr: Number(row.amount_pkr),
      starts_on: row.starts_on,
      ends_on: row.ends_on,
      seats: row.seats,
      custom_branding_enabled: row.custom_branding_enabled,
      plan_code: plan?.code ?? "UNKNOWN",
      plan_name: plan?.name ?? "Unknown Plan",
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      stripe_price_id: row.stripe_price_id ?? null,
      next_billing_date: row.next_billing_date ?? null,
    });
  }

  const brandingByOrg = new Map<
    string,
    {
      brand_name: string;
      logo_url: string | null;
      primary_color: string;
      secondary_color: string;
      accent_color: string;
    }
  >();

  for (const row of brandingRes.data ?? []) {
    brandingByOrg.set(row.organization_id, {
      brand_name: row.brand_name,
      logo_url: row.logo_url,
      primary_color: row.primary_color,
      secondary_color: row.secondary_color,
      accent_color: row.accent_color,
    });
  }

  return (organizationsRes.data ?? []).map((org) => {
    const branding = brandingByOrg.get(org.id);

    return {
      id: org.id,
      code: org.code ?? "UNSET",
      name: org.name,
      contact_email: org.contact_email,
      status: org.status,
      timezone: org.timezone,
      created_at: org.created_at,
      user_count: userCountByOrg.get(org.id) ?? 0,
      brand_name: branding?.brand_name ?? org.name,
      logo_url: branding?.logo_url ?? null,
      primary_color: branding?.primary_color ?? "#4f46e5",
      secondary_color: branding?.secondary_color ?? "#0f172a",
      accent_color: branding?.accent_color ?? "#16a34a",
      current_subscription: subscriptionByOrg.get(org.id) ?? null,
    };
  });
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const schools = await listPlatformSchools();
  const admin = createSupabaseAdminClient();
  const paymentRows = await admin
    .from("platform_payments")
    .select("amount_pkr, payment_date")
    .limit(100000);

  if (paymentRows.error) throw new Error(paymentRows.error.message);

  const nowMonth = new Date().toISOString().slice(0, 7);
  const totalIncomePkr = (paymentRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_pkr),
    0,
  );

  const incomeThisMonthPkr = (paymentRows.data ?? [])
    .filter((row) => row.payment_date.slice(0, 7) === nowMonth)
    .reduce((sum, row) => sum + Number(row.amount_pkr), 0);

  const totalMonthlyRecurringPkr = schools.reduce((sum, school) => {
    const subscription = school.current_subscription;
    if (!subscription) return sum;
    if (!LIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) return sum;
    return sum + subscription.amount_pkr;
  }, 0);

  const activeSubscriptionCount = schools.filter((school) => {
    const subscription = school.current_subscription;
    if (!subscription) return false;
    return LIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  }).length;

  const totalUsers = schools.reduce((sum, school) => sum + school.user_count, 0);

  return {
    schoolCount: schools.length,
    activeSchoolCount: schools.filter((school) => school.status === "active").length,
    suspendedSchoolCount: schools.filter((school) => school.status === "suspended")
      .length,
    trialSchoolCount: schools.filter((school) => school.status === "trial").length,
    activeSubscriptionCount,
    totalMonthlyRecurringPkr: Number(totalMonthlyRecurringPkr.toFixed(2)),
    totalIncomePkr: Number(totalIncomePkr.toFixed(2)),
    incomeThisMonthPkr: Number(incomeThisMonthPkr.toFixed(2)),
    totalUsers,
  };
}

export async function listPlatformPayments(
  limit = 40,
): Promise<PlatformPaymentItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_payments")
    .select(
      "id, organization_id, subscription_id, amount_pkr, payment_date, method, reference_no, notes, created_at, organizations!platform_payments_organization_id_fkey(name,code), organization_subscriptions!platform_payments_subscription_id_fkey(status, subscription_plans!organization_subscriptions_plan_id_fkey(code,name))",
    )
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const organization = one(
      row.organizations as MaybeArray<{ name: string; code: string | null }>,
    );
    const subscription = one(
      row.organization_subscriptions as MaybeArray<{
        status: string;
        subscription_plans: MaybeArray<{ code: string; name: string }>;
      }>,
    );
    const plan = one(subscription?.subscription_plans ?? null);

    return {
      id: row.id,
      organization_id: row.organization_id,
      organization_name: organization?.name ?? "Unknown School",
      organization_code: organization?.code ?? "UNSET",
      amount_pkr: Number(row.amount_pkr),
      payment_date: row.payment_date,
      method: row.method,
      reference_no: row.reference_no,
      notes: row.notes,
      created_at: row.created_at,
      subscription_status: subscription?.status ?? null,
      subscription_plan_code: plan?.code ?? null,
      subscription_plan_name: plan?.name ?? null,
    };
  });
}

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import Link from "next/link";
import {
  SUBSCRIPTION_POLICIES,
  getSubscriptionPosture,
} from "@/lib/platform/subscription-policy";

function formatPkr(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function safeEqual(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    const len = Math.max(ab.length, bb.length);
    const aBuf = Buffer.alloc(len);
    const bBuf = Buffer.alloc(len);
    ab.copy(aBuf);
    bb.copy(bBuf);
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function toneClasses(
  tone: "neutral" | "good" | "warn" | "critical",
) {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function planToneClasses(tone: "slate" | "blue" | "amber") {
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50/80";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/80";
  }

  return "border-slate-200 bg-slate-50/90";
}

export default async function ArkaliManagementPage() {
  const secretKey = process.env.ARKALI_ACCESS_KEY ?? "";
  const hdrs = await headers();
  const cks = await cookies();

  const headerKey = hdrs.get("x-arkali-key") ?? null;
  const cookieKey = cks.get("arkali_key")?.value ?? null;
  const hasBypass =
    secretKey &&
    (safeEqual(secretKey, headerKey) || safeEqual(secretKey, cookieKey));

  if (!hasBypass) {
    try {
      const { requireRole } = await import("@/lib/auth");
      await requireRole(["platform_admin"]);
    } catch (err) {
      console.error("Auth check failed:", err);
      return (
        <div className="min-h-screen bg-slate-100 px-6 py-8">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">
              Arkali Executive Console
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Access validation failed
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Authentication for the executive platform console could not be verified.
              Review the platform admin session or Arkali access key configuration and
              try again.
            </p>
          </div>
        </div>
      );
    }
  }

  let overview: any = null;
  let schools: any[] = [];
  let payments: any[] = [];

  try {
    const {
      getPlatformOverview,
      listPlatformPayments,
      listPlatformSchools,
    } = await import("@/lib/platform/queries");

    [overview, schools, payments] = await Promise.all([
      getPlatformOverview(),
      listPlatformSchools(),
      listPlatformPayments(16),
    ]);
  } catch (err) {
    console.error("Failed to load Arkali management data:", err);

    return (
      <div className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Arkali Executive Console
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Platform data is temporarily unavailable
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            The console could not complete its platform data load. Check Supabase
            service credentials and deployment environment variables, then refresh the
            console.
          </p>
        </div>
      </div>
    );
  }

  const managedSchools = schools.map((school) => {
    const posture = getSubscriptionPosture({
      planCode: school.current_subscription?.plan_code ?? null,
      status: school.current_subscription?.status ?? null,
      seats: school.current_subscription?.seats ?? null,
      userCount: school.user_count,
      nextBillingDate: school.current_subscription?.next_billing_date ?? null,
      endsOn: school.current_subscription?.ends_on ?? null,
    });

    return {
      ...school,
      posture,
    };
  });

  const renewalWatch = [...managedSchools]
    .filter(
      (school) =>
        school.posture.renewalTone === "warn" ||
        school.posture.renewalTone === "critical" ||
        school.posture.accessTone === "critical",
    )
    .sort((a, b) => {
      const aDays = a.posture.daysUntilRenewal ?? Number.POSITIVE_INFINITY;
      const bDays = b.posture.daysUntilRenewal ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    })
    .slice(0, 6);

  const eliteAccounts = managedSchools.filter(
    (school) => school.posture.policy.code === "ELITE_12K",
  );
  const eliteBrandingEnabled = eliteAccounts.filter(
    (school) => school.current_subscription?.custom_branding_enabled,
  ).length;
  const capacityWatchCount = managedSchools.filter(
    (school) =>
      school.posture.capacityTone === "warn" ||
      school.posture.capacityTone === "critical",
  ).length;
  const pastDueMrr = managedSchools
    .filter((school) => school.current_subscription?.status === "past_due")
    .reduce(
      (sum, school) => sum + Number(school.current_subscription?.amount_pkr ?? 0),
      0,
    );
  const averageContractValue =
    overview.activeSubscriptionCount > 0
      ? Math.round(overview.totalMonthlyRecurringPkr / overview.activeSubscriptionCount)
      : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.5fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                Arkali Executive Console
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white">
                Subscription governance, account posture, and portfolio health in one command center.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                This console is now focused on commercial control: which institutions are
                healthy, which contracts are under pressure, where Elite access is active,
                and where Arkali operations should intervene next.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Monthly recurring revenue
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {formatPkr(overview.totalMonthlyRecurringPkr)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Active contract value under management.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Active subscriptions
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {overview.activeSubscriptionCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {overview.trialSchoolCount} trial institutions still in conversion.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Renewal and capacity watch
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {renewalWatch.length + capacityWatchCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Accounts currently needing commercial attention.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Executive summary
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm font-medium text-slate-300">
                    Average contract value
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatPkr(averageContractValue)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm font-medium text-slate-300">
                    Elite accounts with branding enabled
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {eliteBrandingEnabled} / {eliteAccounts.length}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm font-medium text-slate-300">
                    Past-due recurring value
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">
                    {formatPkr(pastDueMrr)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/platform"
                  className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Open Platform Hub
                </Link>
                <Link
                  href="/platform/organization"
                  className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open organization portfolio
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Commercial watchlist
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Accounts that need intervention
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {renewalWatch.length} priority items
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {renewalWatch.length === 0 ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                  The current portfolio does not have any imminent renewal or access-risk accounts.
                </div>
              ) : (
                renewalWatch.map((school) => (
                  <div
                    key={school.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {school.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {school.posture.policy.name} contract, {school.user_count} active users,
                          {school.current_subscription?.seats ?? school.posture.policy.defaultSeats} contracted seats.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                            school.posture.accessTone,
                          )}`}
                        >
                          {school.posture.accessLabel}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                            school.posture.renewalTone,
                          )}`}
                        >
                          {school.posture.renewalLabel}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                            school.posture.capacityTone,
                          )}`}
                        >
                          {school.posture.capacityLabel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[18px] bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Renewal
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatDate(school.posture.renewalDate)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {school.posture.renewalSummary}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Access posture
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {school.posture.accessLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {school.posture.accessSummary}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Capacity
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {school.posture.utilizationPct !== null
                            ? `${school.posture.utilizationPct}% utilised`
                            : "No utilisation data"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {school.posture.capacitySummary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Portfolio signals
              </p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Total schools</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {overview.schoolCount}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {overview.activeSchoolCount} active, {overview.suspendedSchoolCount} suspended.
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Platform users</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {overview.totalUsers}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tenant footprint currently under Arkali operations.
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Income this month</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {formatPkr(overview.incomeThisMonthPkr)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Collected platform revenue in the current month.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Recent collections
              </p>
              <div className="mt-5 space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {payment.organization_name}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {payment.subscription_plan_name ?? "Contract"} · {payment.method}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatPkr(payment.amount_pkr)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Posted on {formatDate(payment.payment_date)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Plan governance
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Professional commercial packaging for Foundation, Professional, and Elite.
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Access model
            </span>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            {SUBSCRIPTION_POLICIES.map((policy) => (
              <article
                key={policy.code}
                className={`rounded-[26px] border p-5 ${planToneClasses(policy.tone)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {policy.code}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {policy.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Monthly</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {formatPkr(policy.monthlyPricePkr)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {policy.executiveSummary}
                </p>

                <div className="mt-5 grid gap-3">
                  {policy.capabilities.map((capability) => (
                    <div
                      key={capability.label}
                      className="flex items-start justify-between gap-4 rounded-[18px] bg-white/70 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-slate-600">
                        {capability.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {capability.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[20px] border border-slate-200 bg-white/75 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Governance posture
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {policy.accessGovernance}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    Default contracted seats: {policy.defaultSeats}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Managed accounts
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Contract, billing, and access posture across every school.
              </h2>
            </div>
            <div className="flex gap-3 text-sm text-slate-600">
              <span>{eliteAccounts.length} Elite accounts</span>
              <span>{capacityWatchCount} accounts on capacity watch</span>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Institution</th>
                  <th className="px-4 py-3 font-semibold">Contract tier</th>
                  <th className="px-4 py-3 font-semibold">Access</th>
                  <th className="px-4 py-3 font-semibold">Capacity</th>
                  <th className="px-4 py-3 font-semibold">Renewal</th>
                  <th className="px-4 py-3 font-semibold">Branding</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {managedSchools.map((school) => (
                  <tr
                    key={school.id}
                    className="border-b border-slate-100 align-top transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{school.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        {school.code} · {school.contact_email ?? "No contact email"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {school.posture.policy.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatPkr(school.current_subscription?.amount_pkr ?? 0)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                          school.posture.accessTone,
                        )}`}
                      >
                        {school.posture.accessLabel}
                      </span>
                      <p className="mt-2 text-sm text-slate-600">
                        {school.posture.accessSummary}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {school.user_count} /{" "}
                        {school.current_subscription?.seats ??
                          school.posture.policy.defaultSeats}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {school.posture.utilizationPct !== null
                          ? `${school.posture.utilizationPct}% utilised`
                          : "No utilisation policy"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                          school.posture.renewalTone,
                        )}`}
                      >
                        {school.posture.renewalLabel}
                      </span>
                      <p className="mt-2 text-sm text-slate-600">
                        {formatDate(school.posture.renewalDate)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {school.current_subscription?.custom_branding_enabled
                          ? "Custom branding active"
                          : "Standard Arkali presentation"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {school.brand_name}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/platform/organization/${school.id}`}
                        className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                      >
                        Open account
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

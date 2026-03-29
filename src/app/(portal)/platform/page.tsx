import {
  assignSchoolSubscriptionAction,
  bootstrapPlatformPlansAction,
  createSchoolAction,
  recordPlatformPaymentAction,
  saveSchoolBrandingAction,
  updateSchoolStatusAction,
} from "@/app/actions/platform";
import {
  PremiumButton,
  PremiumCard,
  PremiumInput,
  PremiumStatCard,
  PremiumSectionTitle,
  PremiumGrid,
  PremiumBadge,
  PremiumAlert,
} from "@/components/ui/premium-components";
import { requireRole } from "@/lib/auth";
import {
  getPlatformOverview,
  listPlatformPayments,
  listPlatformSchools,
  listSubscriptionPlans,
} from "@/lib/platform/queries";

function formatPkr(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PlatformPage() {
  await requireRole(["platform_admin"]);

  const [overview, plans, schools, payments] = await Promise.all([
    getPlatformOverview(),
    listSubscriptionPlans(),
    listPlatformSchools(),
    listPlatformPayments(30),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Platform Administration
        </h1>
        <p className="mt-2 text-slate-600">Manage schools, subscriptions, and platform revenue</p>
      </div>

      {/* Premium Stats Section */}
      <section>
        <PremiumSectionTitle title="Dashboard Overview" />
        <PremiumGrid cols={{ sm: 1, md: 2, lg: 5 }} gap="lg" className="mt-6">
          <PremiumStatCard
            icon="🏫"
            label="Schools"
            value={overview.schoolCount}
            trend="neutral"
            trendLabel={`${overview.activeSchoolCount} active, ${overview.suspendedSchoolCount} suspended`}
          />
          <PremiumStatCard
            icon="✅"
            label="Live Subscriptions"
            value={overview.activeSubscriptionCount}
            trend="up"
            trendLabel={`${overview.trialSchoolCount} in trial`}
          />
          <PremiumStatCard
            icon="💰"
            label="Monthly Revenue (MRR)"
            value={formatPkr(overview.totalMonthlyRecurringPkr)}
            trend="up"
            trendLabel="Recurring revenue"
          />
          <PremiumStatCard
            icon="💵"
            label="Total Income"
            value={formatPkr(overview.totalIncomePkr)}
            trend="neutral"
            trendLabel={`${formatPkr(overview.incomeThisMonthPkr)} this month`}
          />
          <PremiumStatCard
            icon="👥"
            label="Platform Users"
            value={overview.totalUsers}
            trend="up"
            trendLabel="Across all tenants"
          />
        </PremiumGrid>
      </section>

      {/* Subscription Plans & Onboarding */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Subscription Plans */}
        <PremiumCard>
          <div className="flex items-center justify-between">
            <PremiumSectionTitle>Subscription Plans (PKR)</PremiumSectionTitle>
            <form action={bootstrapPlatformPlansAction}>
              <PremiumButton size="sm" variant="outline" type="submit">
                🔄 Sync Plans
              </PremiumButton>
            </form>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <PremiumCard key={plan.id} className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.code}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-blue-600">
                      {formatPkr(plan.monthly_price_pkr).split('.')[0]}
                    </span>
                    <span className="text-sm text-slate-600">/mo</span>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 text-green-600">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <p className="text-xs text-slate-500">+{plan.features.length - 3} more features</p>
                    )}
                  </ul>

                  {plan.includes_personal_branding && (
                    <div className="mt-3">
                      <PremiumBadge variant="success">Custom Branding</PremiumBadge>
                    </div>
                  )}
                </div>
              </PremiumCard>
            ))}
          </div>
        </PremiumCard>

        {/* Quick Onboard School */}
        <PremiumCard className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <PremiumSectionTitle>Quick Onboard School</PremiumSectionTitle>
          <form action={createSchoolAction} className="mt-6 space-y-4">
            <PremiumInput
              name="school_name"
              placeholder="School name"
              icon="🏫"
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <PremiumInput
                name="school_code"
                placeholder="School code"
                icon="📍"
              />
              <PremiumInput
                name="contact_email"
                type="email"
                placeholder="Contact email"
                icon="✉️"
                required
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <PremiumInput
                name="timezone"
                defaultValue="Asia/Karachi"
                icon="🕐"
              />
              <select
                name="plan_code"
                defaultValue={plans[0]?.code ?? "BASIC_3K"}
                className="rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.code}>
                    {plan.name} ({formatPkr(plan.monthly_price_pkr)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                name="subscription_status"
                defaultValue="trial"
                className="rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
              </select>
              <PremiumInput
                name="admin_email"
                type="email"
                placeholder="Admin email"
                icon="👤"
                required
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <PremiumInput
                name="admin_first_name"
                placeholder="First name"
                icon="📝"
                required
              />
              <PremiumInput
                name="admin_last_name"
                placeholder="Last name"
                icon="📝"
                required
              />
            </div>
            <PremiumInput
              name="admin_password"
              type="password"
              minLength={8}
              placeholder="Admin password (min 8 chars)"
              icon="🔐"
              required
            />
            <PremiumButton type="submit" className="w-full">
              ✨ Create School + Admin Access
            </PremiumButton>
          </form>
        </PremiumCard>
      </section>

      {/* Subscription Management & Revenue */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Subscription & Branding Control */}
        <PremiumCard className="border-2 border-purple-200">
          <PremiumSectionTitle>Subscription & Access</PremiumSectionTitle>

          {/* Subscription Assignment */}
          <form action={assignSchoolSubscriptionAction} className="mt-6 space-y-4 border-b border-slate-200 pb-6">
            <select
              name="organization_id"
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              required
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                name="plan_code"
                className="rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                required
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.code}>
                    {plan.name} - {formatPkr(plan.monthly_price_pkr)}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue="active"
                className="rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <PremiumInput
              name="seats"
              type="number"
              min={1}
              defaultValue={500}
              placeholder="User seats"
              icon="👥"
            />
            <PremiumButton type="submit" variant="primary" className="w-full">
              Update Subscription
            </PremiumButton>
          </form>

          {/* Branding Control */}
          <form action={saveSchoolBrandingAction} className="mt-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Elite Custom Branding</h3>
            <select
              name="organization_id"
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              required
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <PremiumInput
              name="brand_name"
              placeholder="Brand display name"
              icon="🎨"
              required
            />
            <PremiumInput
              name="logo_url"
              placeholder="Logo URL"
              icon="🖼️"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-600">Primary Color</label>
                <input
                  type="color"
                  name="primary_color"
                  defaultValue="#2563eb"
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border-2 border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Secondary Color</label>
                <input
                  type="color"
                  name="secondary_color"
                  defaultValue="#1e293b"
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border-2 border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Accent Color</label>
                <input
                  type="color"
                  name="accent_color"
                  defaultValue="#16a34a"
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border-2 border-slate-200"
                  required
                />
              </div>
            </div>
            <PremiumButton type="submit" variant="secondary" className="w-full">
              💾 Save Branding
            </PremiumButton>
          </form>
        </PremiumCard>

        {/* Revenue & Collections */}
        <PremiumCard className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <PremiumSectionTitle>Revenue & Collections</PremiumSectionTitle>

          <form action={recordPlatformPaymentAction} className="mt-6 space-y-4 border-b border-slate-200 pb-6">
            <select
              name="organization_id"
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              required
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <PremiumInput
                name="amount_pkr"
                type="number"
                min={1}
                step="1"
                placeholder="Amount in PKR"
                icon="💵"
                required
              />
              <PremiumInput
                name="payment_date"
                type="date"
                icon="📅"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                name="method"
                defaultValue="bank_transfer"
                className="rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
              <PremiumInput
                name="reference_no"
                placeholder="Reference number"
                icon="📌"
              />
            </div>
            <textarea
              name="notes"
              rows={2}
              placeholder="Payment notes..."
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-base transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            />
            <PremiumButton type="submit" className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
              💰 Record Payment
            </PremiumButton>
          </form>

          {/* Recent Payments */}
          <div className="mt-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Recent Payments</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {payments.slice(0, 8).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg bg-white/60 p-3 border border-amber-200 backdrop-blur-sm"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{payment.organization_name}</p>
                    <p className="text-xs text-slate-500">
                      {payment.payment_date} • {payment.method}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-amber-700">{formatPkr(payment.amount_pkr)}</p>
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>
      </section>

      {/* Schools Management Table */}
      <section>
        <PremiumCard>
          <PremiumSectionTitle>Schools & Access Management</PremiumSectionTitle>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">School</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Subscription</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Users</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">MRR</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school, idx) => (
                  <tr
                    key={school.id}
                    className={`border-b border-slate-200 transition-colors hover:bg-blue-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{school.name}</p>
                        <p className="text-xs text-slate-500">
                          {school.code} • {school.contact_email ?? "No email"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <PremiumBadge
                        variant={
                          school.status === "active"
                            ? "success"
                            : school.status === "trial"
                            ? "info"
                            : "warning"
                        }
                      >
                        {school.status}
                      </PremiumBadge>
                    </td>
                    <td className="px-4 py-4">
                      {school.current_subscription ? (
                        <div>
                          <p className="font-semibold text-slate-900">
                            {school.current_subscription.plan_name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {school.current_subscription.status}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-900">{school.user_count}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-blue-600">
                        {school.current_subscription
                          ? formatPkr(school.current_subscription.amount_pkr)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateSchoolStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="organization_id" value={school.id} />
                        <select
                          name="status"
                          defaultValue={school.status}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="active">Active</option>
                          <option value="trial">Trial</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        <PremiumButton type="submit" size="sm" variant="secondary">
                          Save
                        </PremiumButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      </section>
    </div>
  );
}

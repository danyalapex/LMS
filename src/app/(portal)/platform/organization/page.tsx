import Link from "next/link";
import { BasicSubscriptionCard, PremiumSubscriptionCard } from "@/components/ui/subscription-ui";
import { GlassCard } from "@/components/ui/glassmorphism-components";
import { PremiumButton } from "@/components/ui/premium-components";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface OrganizationWithSub {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  subscription?: {
    id: string;
    status: string;
    amount_pkr: number;
    starts_on: string;
    ends_on: string;
    seats: number;
    next_billing_date: string;
    subscription_plans: { code: string; name: string }[];
  };
}

export default async function OrganizationsListPage() {
    const admin = createSupabaseAdminClient();

    const [{ data: schools }, { data: subs }] = await Promise.all([
      admin
        .from("organizations")
        .select("id,name,code,contact_email,status,created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("organization_subscriptions")
        .select(
          "id,organization_id,status,amount_pkr,starts_on,ends_on,seats,next_billing_date,subscription_plans!organization_subscriptions_plan_id_fkey(id,code,name),stripe_subscription_id,created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    const orgsWithSubs = (schools ?? []).map((school: any) => {
      const subscription = (subs ?? []).find((s: any) => s.organization_id === school.id);
      return { ...school, subscription } as OrganizationWithSub;
    });

    const organizations = orgsWithSubs;

    return (
      <div className="p-8">
        {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Schools & Organizations</h1>
        <p className="text-slate-600 mt-2">Manage your schools, subscriptions, and billing</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <GlassCard className="bg-blue-50 border-blue-200">
          <p className="text-sm text-slate-600">Total Organizations</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{organizations.length}</p>
        </GlassCard>
        <GlassCard className="bg-green-50 border-green-200">
          <p className="text-sm text-slate-600">Active Subscriptions</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {organizations.filter((o) => o.subscription?.status === "active").length}
          </p>
        </GlassCard>
        <GlassCard className="bg-purple-50 border-purple-200">
          <p className="text-sm text-slate-600">Monthly Revenue</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            PKR {organizations
              .filter((o) => o.subscription?.status === "active")
              .reduce((sum, o) => sum + (o.subscription?.amount_pkr || 0), 0)
              .toLocaleString()}
          </p>
        </GlassCard>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <GlassCard className="text-center py-12">
          <p className="text-slate-600 text-lg">No organizations found</p>
          <Link href="/admin/schools">
            <PremiumButton className="mt-4">Create First School</PremiumButton>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => {
            const isPremium = org.subscription?.subscription_plans?.[0]?.code?.includes("premium");
            const daysUntilExpiry = org.subscription
              ? Math.ceil(
                  (new Date(org.subscription.ends_on).getTime() - new Date().getTime()) /
                    (1000 * 3600 * 24)
                )
              : null;
            const isExpiring = daysUntilExpiry ? daysUntilExpiry <= 30 : false;

            return (
              <Link key={org.id} href={`/platform/organization/${org.id}`}>
                {!org.subscription ? (
                  <GlassCard className="cursor-pointer h-full">
                    <p className="font-semibold text-slate-900">{org.name}</p>
                    <p className="text-sm text-slate-600">{org.code}</p>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 font-semibold">⏳ No Active Subscription</p>
                    </div>
                  </GlassCard>
                ) : isPremium ? (
                  <PremiumSubscriptionCard
                    schoolName={org.name}
                    planName={org.subscription.subscription_plans?.[0]?.name || "Premium Plan"}
                    nextBillingDate={org.subscription.next_billing_date}
                    seatsUsed={org.subscription.seats || 0}
                    totalSeats={org.subscription.seats || 100}
                    monthlyRevenue={org.subscription.amount_pkr}
                    isExpiring={isExpiring}
                  />
                ) : (
                  <BasicSubscriptionCard
                    schoolName={org.name}
                    planName={org.subscription.subscription_plans?.[0]?.name || "Basic Plan"}
                    nextBillingDate={org.subscription.next_billing_date}
                    seatsUsed={org.subscription.seats || 0}
                    totalSeats={org.subscription.seats || 50}
                    isExpiring={isExpiring}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Admin Actions */}
      <div className="mt-8 flex gap-4">
        <Link href="/admin/schools">
          <PremiumButton>Manage Schools</PremiumButton>
        </Link>
        <Link href="/platform/arkali-management">
          <PremiumButton variant="secondary">View Analytics</PremiumButton>
        </Link>
      </div>
    </div>
  );
}

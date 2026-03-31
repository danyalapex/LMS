"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BasicSubscriptionCard, PremiumSubscriptionCard } from "@/components/ui/subscription-ui";
import { GlassCard } from "@/components/ui/glassmorphism-components";
import { PremiumButton } from "@/components/ui/premium-components";

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

export default function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/schools");
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const schools = await res.json();

        // Fetch subscriptions
        const subsRes = await fetch("/api/admin/subscriptions");
        const subs = await subsRes.json();

        // Map subscriptions to schools
        const orgsWithSubs: OrganizationWithSub[] = schools.map((school: any) => {
          const subscription = subs.find((s: any) => s.organization_id === school.id);
          return {
            ...school,
            subscription,
          };
        });

        setOrganizations(orgsWithSubs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-slate-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <GlassCard className="bg-red-50 border-red-200">
          <p className="text-red-600">Error: {error}</p>
        </GlassCard>
      </div>
    );
  }

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

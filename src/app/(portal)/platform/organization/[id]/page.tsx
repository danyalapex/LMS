import { PremiumCard, PremiumSectionTitle, PremiumButton } from "@/components/ui/premium-components";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import React from "react";

type Params = { params: { id: string } };

export default async function OrganizationPage({ params }: Params) {
  await requireRole(["platform_admin"]);
  const id = params.id;

  const admin = createSupabaseAdminClient();

  const [{ data: org }, { data: subs }, { data: payments }] = await Promise.all([
    admin.from("organizations").select("id,name,code,contact_email,status,timezone").eq("id", id).maybeSingle(),
    admin
      .from("organization_subscriptions")
      .select("id,status,amount_pkr,starts_on,ends_on,seats,next_billing_date,subscription_plans!organization_subscriptions_plan_id_fkey(code,name),stripe_subscription_id")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("subscription_payments")
      .select("id,amount_pkr,payment_method,status,due_date,paid_date,reference_no,notes,payment_date,created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const organization = org ?? null;
  const subscriptions = subs ?? [];
  const paymentRows = payments ?? [];

  return (
    <div className="p-6 space-y-6">
      <PremiumSectionTitle title={organization?.name ?? "Organization"} subtitle={`Code: ${organization?.code ?? "-"}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PremiumCard>
          <h3 className="text-lg font-semibold">Organization Details</h3>
          <div className="mt-3 text-sm text-slate-700">
            <p><strong>Status:</strong> {organization?.status ?? "-"}</p>
            <p><strong>Contact:</strong> {organization?.contact_email ?? "-"}</p>
            <p><strong>Timezone:</strong> {organization?.timezone ?? "-"}</p>
          </div>
        </PremiumCard>

        <PremiumCard>
          <h3 className="text-lg font-semibold">Recent Payments</h3>
          <div className="mt-3 space-y-2 text-sm">
            {paymentRows.length === 0 ? (
              <p className="text-slate-500">No payments recorded.</p>
            ) : (
              paymentRows.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">PKR {p.amount_pkr}</div>
                    <div className="text-xs text-slate-500">{p.payment_date ?? p.created_at}</div>
                  </div>
                  <div className="text-sm text-slate-600">{p.status}</div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>
      </div>

      <PremiumCard>
        <h3 className="text-lg font-semibold">Subscription History</h3>
        <div className="mt-3 space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-slate-500">No subscription records.</p>
          ) : (
            subscriptions.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{(s.subscription_plans && s.subscription_plans[0]?.name) ?? "Plan"}</div>
                    <div className="text-xs text-slate-500">Status: {s.status} • Seats: {s.seats}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Next billing: {s.next_billing_date ?? s.ends_on ?? "-"}</div>
                    <div className="mt-2">Stripe Sub: {s.stripe_subscription_id ?? "-"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PremiumCard>
    </div>
  );
}

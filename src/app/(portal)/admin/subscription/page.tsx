import { PremiumButton, PremiumCard, PremiumGrid, PremiumSectionTitle, PremiumAlert } from "@/components/ui/premium-components";
import StripePayButton from "@/components/stripe-pay-button";
import { listSubscriptionPlans } from "@/lib/platform/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireIdentity } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import React from "react";
import { getSubscriptionPayments } from "@/app/actions/subscriptions";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  await requireRole(["admin"]);
  const actor = await requireIdentity();

  const plans = await listSubscriptionPlans();

  const admin = createSupabaseAdminClient();
  const { data: currentSub } = await admin
    .from("organization_subscriptions")
    .select("id,status,amount_pkr,starts_on,ends_on,seats,subscription_plans!organization_subscriptions_plan_id_fkey(code,name)")
    .eq("organization_id", actor.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = currentSub?.subscription_plans ? (Array.isArray(currentSub.subscription_plans) ? currentSub.subscription_plans[0] : currentSub.subscription_plans) : null;
  const currentPlanDetails = plans.find((pp) => pp.code === plan?.code) ?? null;
  const payments = await getSubscriptionPayments(actor.organizationId);
  const endsOn = currentSub?.ends_on ?? null;
  const daysRemaining = endsOn ? Math.ceil((new Date(endsOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="p-6">
      <PremiumSectionTitle title="Subscription" subtitle="Manage your school's subscription and request changes." />

      <div className="mb-6">
        <PremiumCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Current Plan</p>
              <h3 className="text-xl font-bold">{plan?.name ?? "None"}</h3>
              <p className="text-sm text-slate-500">Status: {currentSub?.status ?? "none"}</p>
              <p className="text-sm text-slate-500">Monthly: PKR {currentSub?.amount_pkr ?? "-"}</p>
            </div>
            <div>
              <form action={requestSubscriptionChange} method="post">
                <input type="hidden" name="plan_code" value={plan?.code ?? ""} />
                <PremiumButton type="submit" variant="ghost">Request Change</PremiumButton>
              </form>

              {actor.organizationId && plan && (
                <div className="mt-3">
                  <StripePayButton organizationId={actor.organizationId} planCode={plan.code ?? ""}>
                    Pay PKR {currentSub?.amount_pkr ?? currentPlanDetails?.monthly_price_pkr ?? "-"}
                  </StripePayButton>
                </div>
              )}
            </div>
          </div>
        </PremiumCard>
      </div>

      {daysRemaining !== null && daysRemaining <= 7 && (
        <div className="mb-6">
          <PremiumAlert type="warning" message={`Your subscription renews in ${daysRemaining} day(s). Please ensure payment is processed.`} />
        </div>
      )}

      <h4 className="mb-3 text-lg font-semibold">Available Plans</h4>
      <PremiumGrid columns={3} gap={6}>
        {plans.map((p) => (
          <PremiumCard key={p.id} hoverable>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{p.name}</p>
                  <h3 className="text-2xl font-bold">PKR {p.monthly_price_pkr}</h3>
                </div>
                <div>
                  <form action={requestSubscriptionChange} method="post">
                    <input type="hidden" name="plan_code" value={p.code} />
                    <PremiumButton type="submit" variant={p.includes_personal_branding ? "primary" : "secondary"}>Request</PremiumButton>
                  </form>
                </div>
              </div>
              <p className="text-sm text-slate-600">{p.description}</p>
            </div>
          </PremiumCard>
        ))}
      </PremiumGrid>

      <div className="mt-6">
        <h4 className="mb-3 text-lg font-semibold">Recent Payments</h4>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">No recent payments.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => (
              <div key={p.id} className="text-sm text-slate-700">{p.payment_date} — PKR {p.amount_pkr} — {p.status}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function requestSubscriptionChange(formData: FormData) {
  await requireRole(["admin"]);
  const actor = await requireIdentity();
  const planCode = String(formData.get("plan_code") ?? "").trim();
  if (!planCode) throw new Error("Plan code required");

  const admin = createSupabaseAdminClient();
  // Record a subscription request in audit_logs for platform admins to review
  await admin.from("audit_logs").insert({
    organization_id: actor.organizationId,
    actor_user_id: actor.appUserId,
    action: "subscription_request",
    entity: "organization_subscriptions",
    metadata: { requested_plan: planCode },
  });

  revalidatePath("/platform");
}

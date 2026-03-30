import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const buf = await req.arrayBuffer();
  const rawBody = Buffer.from(buf);
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata: any = session.metadata ?? {};
      const subscriptionPaymentId = metadata.subscription_payment_id;
      const organizationId = metadata.organization_id;
      const planCode = metadata.plan_code;

      // amount in smallest currency unit
      const amountTotal = (session.amount_total ?? 0) as number;
      const amountPkr = Math.round((amountTotal ?? 0) / 100);

      if (subscriptionPaymentId) {
        await admin
          .from("subscription_payments")
          .update({ status: "completed", paid_date: new Date().toISOString().slice(0, 10) })
          .eq("id", subscriptionPaymentId);
      }

      // record platform payment for reporting
      await admin.from("platform_payments").insert({
        organization_id: organizationId ?? null,
        subscription_id: null,
        amount_pkr: amountPkr,
        payment_date: new Date().toISOString().slice(0, 10),
        method: "card",
        reference_no: session.payment_intent ?? null,
        notes: `Stripe checkout successful for plan ${planCode}`,
      });

      // If organization had a past_due subscription, try to reactivate
      if (organizationId) {
        const { data: activeSub } = await admin
          .from("organization_subscriptions")
          .select("id, status")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSub?.id && activeSub.status === "past_due") {
          await admin
            .from("organization_subscriptions")
            .update({ status: "active" })
            .eq("id", activeSub.id);

          await admin
            .from("organizations")
            .update({ status: "active" })
            .eq("id", organizationId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? "webhook error" }, { status: 500 });
  }
}

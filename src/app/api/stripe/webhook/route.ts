import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

function toDateStringFromUnix(ts?: number) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

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
    // checkout.session.completed – record payment and associate stripe customer
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata: any = session.metadata ?? {};
      const subscriptionPaymentId = metadata.subscription_payment_id;
      const organizationId = metadata.organization_id;
      const planCode = metadata.plan_code;

      const amountTotal = (session.amount_total ?? 0) as number;
      const amountPkr = Math.round(amountTotal / 100);

      if (subscriptionPaymentId) {
        await admin
          .from("subscription_payments")
          .update({ status: "completed", paid_date: new Date().toISOString().slice(0, 10) })
          .eq("id", subscriptionPaymentId);
      }

      await admin.from("platform_payments").insert({
        organization_id: organizationId ?? null,
        subscription_id: null,
        amount_pkr: amountPkr,
        payment_date: new Date().toISOString().slice(0, 10),
        method: "card",
        reference_no: session.payment_intent ?? null,
        notes: `Stripe checkout successful for plan ${planCode}`,
      });

      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (customerId && organizationId) {
        await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", organizationId);
        await admin.from("organization_subscriptions").update({ stripe_customer_id: customerId }).eq("organization_id", organizationId);
      }

      // Reactivate past_due if necessary
      if (organizationId) {
        const { data: activeSub } = await admin
          .from("organization_subscriptions")
          .select("id, status")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSub?.id && activeSub.status === "past_due") {
          await admin.from("organization_subscriptions").update({ status: "active" }).eq("id", activeSub.id);
          await admin.from("organizations").update({ status: "active" }).eq("id", organizationId);
        }
      }
    }

    // invoice.payment_succeeded – record platform payment and update subscription next billing date
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : null;
      const invoiceSubscription = typeof invoice.subscription === "string" ? invoice.subscription : null;
      const metadata: any = invoice.metadata ?? {};
      let organizationId = metadata.organization_id ?? null;

      if (!organizationId && invoiceSubscription) {
        const { data: subRow } = await admin
          .from("organization_subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", invoiceSubscription)
          .maybeSingle();
        organizationId = subRow?.organization_id ?? organizationId;
      }

      if (!organizationId && invoiceCustomer) {
        const { data: orgRow } = await admin.from("organizations").select("id").eq("stripe_customer_id", invoiceCustomer).maybeSingle();
        organizationId = orgRow?.id ?? organizationId;
      }

      const amountPkr = Math.round(((invoice.total ?? 0) as number) / 100);
      await admin.from("platform_payments").insert({
        organization_id: organizationId ?? null,
        subscription_id: invoiceSubscription ?? null,
        amount_pkr: amountPkr,
        payment_date: new Date().toISOString().slice(0, 10),
        method: "card",
        reference_no: invoice.id,
        notes: `Invoice ${invoice.number ?? invoice.id} paid`,
      });

      if (organizationId) {
        const { data: recentSub } = await admin
          .from("organization_subscriptions")
          .select("id")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const periodEnd = (invoice.lines?.data?.[0]?.period?.end) as number | undefined;
        if (recentSub?.id) {
          await admin
            .from("organization_subscriptions")
            .update({
              stripe_subscription_id: invoiceSubscription ?? null,
              next_billing_date: periodEnd ? toDateStringFromUnix(periodEnd) : null,
              status: "active",
            })
            .eq("id", recentSub.id);
        }
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      const currentPeriodEnd = subscription.current_period_end;
      const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

      let organizationId: string | null = null;
      if (customerId) {
        const { data: orgRow } = await admin.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
        organizationId = orgRow?.id ?? null;
      }
      if (!organizationId) {
        const { data: subRow } = await admin.from("organization_subscriptions").select("organization_id").eq("stripe_subscription_id", subId).maybeSingle();
        organizationId = subRow?.organization_id ?? null;
      }

      if (organizationId) {
        const { data: recentSub } = await admin
          .from("organization_subscriptions")
          .select("id")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentSub?.id) {
          await admin
            .from("organization_subscriptions")
            .update({
              stripe_subscription_id: subId,
              stripe_price_id: priceId,
              next_billing_date: currentPeriodEnd ? toDateStringFromUnix(currentPeriodEnd) : null,
              status: "active",
            })
            .eq("id", recentSub.id);
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const { data: subRow } = await admin.from("organization_subscriptions").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (subRow?.id) {
          await admin.from("organization_subscriptions").update({ status: "past_due" }).eq("id", subRow.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? "webhook error" }, { status: 500 });
  }
}

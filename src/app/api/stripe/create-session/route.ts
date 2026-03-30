import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const body = await req.json();
    const organizationId = String(body.organizationId ?? "").trim();
    const planCode = String(body.planCode ?? "").trim();
    const success_url = String(body.success_url ?? "").trim();
    const cancel_url = String(body.cancel_url ?? "").trim();

    if (!organizationId || !planCode) {
      return NextResponse.json({ error: "organizationId and planCode are required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id, name, monthly_price_pkr")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: planError?.message ?? "Plan not found" }, { status: 404 });
    }

    const amountPkr = Number(plan.monthly_price_pkr || 0);
    if (Number.isNaN(amountPkr) || amountPkr <= 0) {
      return NextResponse.json({ error: "Invalid plan amount" }, { status: 400 });
    }

    // create subscription payment record (pending)
    const { data: paymentRow, error: paymentError } = await admin
      .from("subscription_payments")
      .insert({
        organization_id: organizationId,
        subscription_id: null,
        amount_pkr: amountPkr,
        payment_method: "card",
        due_date: new Date().toISOString().slice(0, 10),
        reference_no: null,
        notes: `Checkout for ${planCode}`,
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError || !paymentRow) {
      return NextResponse.json({ error: paymentError?.message ?? "Failed to create payment record" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successUrl = success_url || `${appUrl}/platform?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancel_url || `${appUrl}/platform`;

    // create stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: `Subscription: ${plan.name}`,
            },
            unit_amount: Math.round(amountPkr * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        subscription_payment_id: String(paymentRow.id),
        organization_id: organizationId,
        plan_code: planCode,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? "server error" }, { status: 500 });
  }
}

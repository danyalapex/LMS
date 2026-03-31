"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const admin = createSupabaseAdminClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await admin
      .from("organization_subscriptions")
      .select(
        "id,organization_id,status,amount_pkr,starts_on,ends_on,seats,next_billing_date,subscription_plans!organization_subscriptions_plan_id_fkey(id,code,name),stripe_subscription_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, amount_pkr, ends_on, seats, next_billing_date } = body;

    const { data, error } = await admin
      .from("organization_subscriptions")
      .update({
        ...(status && { status }),
        ...(amount_pkr !== undefined && { amount_pkr }),
        ...(ends_on && { ends_on }),
        ...(seats && { seats }),
        ...(next_billing_date && { next_billing_date }),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "Subscription updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await admin
      .from("organization_subscriptions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Subscription deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete subscription" },
      { status: 500 }
    );
  }
}

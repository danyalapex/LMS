"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const admin = createSupabaseAdminClient();

// GET subscriptions for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organization_id");

    let query = admin
      .from("organization_subscriptions")
      .select(
        "id,organization_id,status,amount_pkr,starts_on,ends_on,seats,next_billing_date,subscription_plans!organization_subscriptions_plan_id_fkey(id,code,name),stripe_subscription_id,created_at"
      )
      .order("created_at", { ascending: false });

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST create new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      plan_id,
      status = "active",
      amount_pkr,
      starts_on,
      ends_on,
      seats = 1,
    } = body;

    if (!organization_id || !plan_id) {
      return NextResponse.json(
        { error: "organization_id and plan_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("organization_subscriptions")
      .insert({
        organization_id,
        plan_id,
        status,
        amount_pkr,
        starts_on: starts_on || new Date().toISOString().split("T")[0],
        ends_on,
        seats,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "Subscription created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}

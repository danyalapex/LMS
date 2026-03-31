"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const admin = createSupabaseAdminClient();

// GET all subscription plans
export async function GET() {
  try {
    const { data, error } = await admin
      .from("subscription_plans")
      .select("*")
      .order("monthly_price_pkr", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching plans:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

// POST create new subscription plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      monthly_price_pkr,
      description,
      features = [],
      includes_personal_branding = false,
      active = true,
    } = body;

    if (!code || !name || monthly_price_pkr === undefined) {
      return NextResponse.json(
        { error: "Code, name, and monthly_price_pkr are required" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("subscription_plans")
      .insert({
        code,
        name,
        monthly_price_pkr,
        description,
        features,
        includes_personal_branding,
        active,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "Plan created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating plan:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create plan" },
      { status: 500 }
    );
  }
}

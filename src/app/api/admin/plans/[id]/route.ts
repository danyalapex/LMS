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
      .from("subscription_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch plan" },
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
    const {
      code,
      name,
      monthly_price_pkr,
      description,
      features,
      includes_personal_branding,
      active,
    } = body;

    const { data, error } = await admin
      .from("subscription_plans")
      .update({
        ...(code && { code }),
        ...(name && { name }),
        ...(monthly_price_pkr !== undefined && { monthly_price_pkr }),
        ...(description && { description }),
        ...(features && { features }),
        ...(includes_personal_branding !== undefined && {
          includes_personal_branding,
        }),
        ...(active !== undefined && { active }),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "Plan updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update plan" },
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
      .from("subscription_plans")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Plan deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete plan" },
      { status: 500 }
    );
  }
}

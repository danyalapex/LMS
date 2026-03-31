"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const admin = createSupabaseAdminClient();

// GET all schools
export async function GET() {
  try {
    const { data, error } = await admin
      .from("organizations")
      .select("id,name,code,contact_email,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching schools:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

// POST create new school
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, contact_email, status = "active" } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const { data, error } = await admin.from("organizations").insert({
      name,
      code,
      contact_email,
      status,
    }).select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "School created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating school:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create school" },
      { status: 500 }
    );
  }
}

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
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch school" },
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
    const { name, code, contact_email, status } = body;

    const { data, error } = await admin
      .from("organizations")
      .update({ name, code, contact_email, status })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { data: data?.[0], message: "School updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update school" },
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
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "School deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete school" },
      { status: 500 }
    );
  }
}

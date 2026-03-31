"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error("Arkali sign-in error:", error);
      return NextResponse.json(
        { error: "Authentication failed. Please check your credentials." },
        { status: 401 }
      );
    }

    // Check allowlist
    const allowedEmailsRaw = process.env.ARKALI_ALLOWED_EMAILS ?? "";
    const allowedDomainsRaw = process.env.ARKALI_ALLOWED_DOMAINS ?? "";

    const allowedEmails = allowedEmailsRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const allowedDomains = allowedDomainsRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split("@")[1] ?? "";

    let allowed = false;
    if (
      allowedEmails.includes(emailLower) ||
      allowedDomains.includes(emailDomain)
    ) {
      allowed = true;
    }

    // Also check for platform_admin role
    if (!allowed) {
      try {
        const admin = createSupabaseAdminClient();
        const { data: appUser } = await admin
          .from("users")
          .select("id")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

        if (appUser?.id) {
          const { data: roleRow } = await admin
            .from("user_role_assignments")
            .select("role")
            .eq("user_id", appUser.id)
            .eq("role", "platform_admin")
            .maybeSingle();

          if (roleRow) allowed = true;
        }
      } catch (err) {
        console.error("Error checking platform_admin role:", err);
      }
    }

    if (!allowed) {
      // Sign out to prevent session
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "You do not have permission to access the Arkali Management Console.",
        },
        { status: 403 }
      );
    }

    // Successful login - return success
    return NextResponse.json(
      { success: true, message: "Login successful" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Arkali login API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function signInArkaliAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/arkali-login?error=missing_credentials`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    console.error("Arkali sign-in error:", error);
    redirect(`/arkali-login?error=${encodeURIComponent("authentication_failed")}`);
  }

  // Allowlist checks (env vars)
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
  if (allowedEmails.includes(emailLower) || allowedDomains.includes(emailDomain)) {
    allowed = true;
  }

  // Also allow if the user has platform_admin role in our app users table
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
      // ignore errors and treat as not allowed
    }
  }

  if (!allowed) {
    // prevent session from staying active
    await supabase.auth.signOut();
    redirect(`/arkali-login?error=${encodeURIComponent("not_authorized")}`);
  }

  redirect("/platform/arkali-management");
}

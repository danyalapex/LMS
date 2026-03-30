"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUserRole, type UserRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureDefaultOrganization() {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("organizations")
    .insert({
      name: "Arkali Solutions Academy",
      timezone: "Asia/Karachi",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create organization");
  }

  return created.id;
}

async function ensureApplicationUser(params: {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}) {
  const admin = createSupabaseAdminClient();
  const organizationId = await ensureDefaultOrganization();

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", params.authUserId)
    .maybeSingle();

  let userId = existingUser?.id;

  if (!userId) {
    const { data: insertedUser, error: insertError } = await admin
      .from("users")
      .insert({
        organization_id: organizationId,
        auth_user_id: params.authUserId,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
      })
      .select("id")
      .single();

    if (insertError || !insertedUser) {
      throw new Error(insertError?.message ?? "Failed to create user profile");
    }

    userId = insertedUser.id;
  }

  const { error: roleError } = await admin.from("user_role_assignments").upsert(
    {
      user_id: userId,
      role: params.role,
    },
    { onConflict: "user_id,role" },
  );

  if (roleError) {
    throw new Error(roleError.message);
  }
}

function parseName(fullName: string) {
  const clean = fullName.trim();

  if (!clean) {
    return { firstName: "Arkali", lastName: "User" };
  }

  const [firstName, ...rest] = clean.split(" ");

  return {
    firstName,
    lastName: rest.join(" ") || "User",
  };
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirect_to") ?? "").trim();
  const requireRole = String(formData.get("require_role") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "invalid_login")}`);
  }

  // If a role is required for this sign-in flow, verify the app user has it.
  if (requireRole) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: appUser } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (!appUser?.id) {
        // No app profile - sign out and redirect to login with message
        await supabase.auth.signOut();
        redirect(`/login?error=${encodeURIComponent("no_profile_for_user")}`);
      }

      const { data: roleRow } = await admin
        .from("user_role_assignments")
        .select("role")
        .eq("user_id", appUser.id)
        .eq("role", requireRole)
        .maybeSingle();

      if (!roleRow) {
        await supabase.auth.signOut();
        redirect(`/login?error=${encodeURIComponent("not_authorized")}`);
      }
    } catch (err) {
      // If this is a navigation redirect signal from Next, re-throw it so the framework handles it.
      if (typeof err === "object" && err !== null && "digest" in err && typeof (err as any).digest === "string" && (err as any).digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }

      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent("authorization_check_failed")}`);
    }
  }

  revalidatePath("/", "layout");
  function getSafeRedirectUrl(to: string | null | undefined) {
    if (!to) return "/";
    try {
      // Only allow a single-leading-slash relative path and reject protocol-relative
      // or backslash-prefixed values (e.g. "//evil.com" or "/\\evil"). Also reject any
      // value containing a scheme delimiter like '://'.
      if (
        to.length >= 1 &&
        to[0] === "/" &&
        (to.length === 1 || (to[1] !== "/" && to[1] !== "\\")) &&
        !to.includes("://")
      ) {
        return to;
      }
      return "/";
    } catch {
      return "/";
    }
  }

  if (redirectTo) {
    redirect(getSafeRedirectUrl(redirectTo));
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const role = String(formData.get("role") ?? "student");

  if (!["student", "guardian", "both"].includes(role)) {
    redirect("/signup?error=invalid_role_selection");
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const organizationId = await ensureDefaultOrganization();

  let studentAuthId: string | undefined;
  let guardianAuthId: string | undefined;
  let studentUserId: string | undefined;
  let guardianUserId: string | undefined;

  try {
    // Register Student
    if (role === "student" || role === "both") {
      const studentEmail = String(formData.get("student_email") ?? "").trim();
      const studentPassword = String(formData.get("student_password") ?? "").trim();
      const studentFirstName = String(formData.get("student_first_name") ?? "").trim();
      const studentLastName = String(formData.get("student_last_name") ?? "").trim();
      const studentPhone = String(formData.get("student_phone") ?? "").trim() || null;
      const studentDob = String(formData.get("student_dob") ?? "").trim() || null;
      const studentFatherName = String(formData.get("student_father_name") ?? "").trim();
      const studentMotherName = String(formData.get("student_mother_name") ?? "").trim();
      const studentAddress = String(formData.get("student_address") ?? "").trim() || null;
      const studentCity = String(formData.get("student_city") ?? "").trim() || null;
      const studentNationalId = String(formData.get("student_national_id") ?? "").trim() || null;

      if (!studentEmail || !studentPassword || !studentFirstName || !studentLastName) {
        redirect("/signup?role=" + role + "&error=Student information incomplete");
      }

      // Create student auth account
      const { data: studentAuthData, error: studentAuthError } = await supabase.auth.signUp({
        email: studentEmail,
        password: studentPassword,
        options: {
          data: {
            full_name: `${studentFirstName} ${studentLastName}`,
          },
        },
      });

      if (studentAuthError || !studentAuthData.user) {
        redirect(
          `/signup?role=${role}&error=${encodeURIComponent(studentAuthError?.message ?? "Student registration failed")}`,
        );
      }

      studentAuthId = studentAuthData.user.id;

      // Create student user profile
      const { data: studentUserData, error: studentUserError } = await admin
        .from("users")
        .insert({
          organization_id: organizationId,
          auth_user_id: studentAuthId,
          first_name: studentFirstName,
          last_name: studentLastName,
          email: studentEmail,
          phone: studentPhone,
          date_of_birth: studentDob,
        })
        .select("id")
        .single();

      if (studentUserError || !studentUserData) {
        throw new Error(studentUserError?.message ?? "Failed to create student profile");
      }

      studentUserId = studentUserData.id;

      // Create student record
      const { error: studentRecordError } = await admin.from("students").insert({
        user_id: studentUserId,
        student_code: `STU-${Date.now()}`,
        grade_level: "Class 9", // Default, can be updated later
        admission_date: new Date().toISOString().split("T")[0],
        father_name: studentFatherName,
        mother_name: studentMotherName,
      });

      if (studentRecordError) {
        throw new Error(studentRecordError.message);
      }

      // Assign student role
      const { error: studentRoleError } = await admin.from("user_role_assignments").insert({
        user_id: studentUserId,
        role: "student",
      });

      if (studentRoleError) {
        throw new Error(studentRoleError.message);
      }
    }

    // Register Guardian
    if (role === "guardian" || role === "both") {
      const guardianEmail = String(formData.get("guardian_email") ?? "").trim();
      const guardianPassword = String(formData.get("guardian_password") ?? "").trim();
      const guardianFirstName = String(formData.get("guardian_first_name") ?? "").trim();
      const guardianLastName = String(formData.get("guardian_last_name") ?? "").trim();
      const guardianPhone = String(formData.get("guardian_phone") ?? "").trim();
      const guardianDob = String(formData.get("guardian_dob") ?? "").trim() || null;
      const guardianRelation = String(formData.get("guardian_relation") ?? "Guardian").trim();
      const guardianNationalId = String(formData.get("guardian_national_id") ?? "").trim() || null;
      const guardianAddress = String(formData.get("guardian_address") ?? "").trim() || null;
      const guardianCity = String(formData.get("guardian_city") ?? "").trim() || null;
      const guardianOccupation = String(formData.get("guardian_occupation") ?? "").trim() || null;

      if (!guardianEmail || !guardianFirstName || !guardianLastName || !guardianPhone) {
        redirect("/signup?role=" + role + "&error=Guardian information incomplete");
      }

      // For "both" scenario, use auto-generated password
      let finalGuardianPassword = guardianPassword;
      if (role === "both") {
        finalGuardianPassword = `${guardianFirstName}${guardianLastName}${Date.now().toString().slice(-4)}`;
      }

      if (!finalGuardianPassword || finalGuardianPassword.length < 6) {
        redirect("/signup?role=" + role + "&error=Guardian password required and must be 6+ characters");
      }

      // Create guardian auth account
      const { data: guardianAuthData, error: guardianAuthError } = await supabase.auth.signUp({
        email: guardianEmail,
        password: finalGuardianPassword,
        options: {
          data: {
            full_name: `${guardianFirstName} ${guardianLastName}`,
          },
        },
      });

      if (guardianAuthError || !guardianAuthData.user) {
        redirect(
          `/signup?role=${role}&error=${encodeURIComponent(guardianAuthError?.message ?? "Guardian registration failed")}`,
        );
      }

      guardianAuthId = guardianAuthData.user.id;

      // Create guardian user profile
      const { data: guardianUserData, error: guardianUserError } = await admin
        .from("users")
        .insert({
          organization_id: organizationId,
          auth_user_id: guardianAuthId,
          first_name: guardianFirstName,
          last_name: guardianLastName,
          email: guardianEmail,
          phone: guardianPhone,
          date_of_birth: guardianDob,
          national_id: guardianNationalId,
          address: guardianAddress,
          city: guardianCity,
        })
        .select("id")
        .single();

      if (guardianUserError || !guardianUserData) {
        throw new Error(guardianUserError?.message ?? "Failed to create guardian profile");
      }

      guardianUserId = guardianUserData.id;

      // Assign guardian role
      const { error: guardianRoleError } = await admin.from("user_role_assignments").insert({
        user_id: guardianUserId,
        role: "guardian",
      });

      if (guardianRoleError) {
        throw new Error(guardianRoleError.message);
      }

      // Auto-link guardian to student if both are registering
      if (role === "both" && studentUserId) {
        const { data: studentRecord, error: studentFetchError } = await admin
          .from("students")
          .select("id")
          .eq("user_id", studentUserId)
          .single();

        if (studentFetchError || !studentRecord) {
          throw new Error("Failed to link guardian to student");
        }

        const { error: linkError } = await admin
          .from("guardian_student_links_new")
          .insert({
            guardian_user_id: guardianUserId,
            student_id: studentRecord.id,
            relation: guardianRelation,
          });

        if (linkError) {
          throw new Error(linkError.message);
        }
      }
    }

    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed. Please try again.";
    redirect(`/signup?role=${role}&error=${encodeURIComponent(message)}`);
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

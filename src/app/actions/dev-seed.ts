"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * This is a development-only utility to seed test users with authentication
 * Should only be used in development environment
 */
export type SeedResult = {
  email: string;
  status: "success" | "error";
  role?: string;
  password?: string;
  message?: string;
};

export async function seedTestUsersAction(): Promise<SeedResult[]> {
  const admin = createSupabaseAdminClient();

  const testUsers = [
    {
      email: "aliapex59750@gmail.com",
      password: "SuCe)7192",
      firstName: "Arkali",
      lastName: "Owner",
      role: "platform_admin" as const,
    },
    {
      email: "admin@arkali.com",
      password: "Admin@123",
      firstName: "School",
      lastName: "Admin",
      role: "admin" as const,
    },
    {
      email: "finance@arkali.com",
      password: "Finance@123",
      firstName: "Finance",
      lastName: "Officer",
      role: "finance" as const,
    },
    {
      email: "teacher@arkali.com",
      password: "Teacher@123",
      firstName: "Test",
      lastName: "Teacher",
      role: "teacher" as const,
    },
  ];

  const results: SeedResult[] = [];

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError || !authUser.user) {
        results.push({
          email: user.email,
          status: "error",
          message: authError?.message || "Failed to create auth user",
        });
        continue;
      }

      // Create user profile with role
      const { data: dbUser, error: dbError } = await admin
        .from("users")
        .upsert({
          auth_user_id: authUser.user.id,
          organization_id: "11111111-1111-1111-1111-111111111111",
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          status: "active",
        })
        .select("id")
        .single();

      if (dbError || !dbUser) {
        results.push({
          email: user.email,
          status: "error",
          message: dbError?.message ?? "Failed to upsert user profile",
        });
        continue;
      }

      // Assign role
      const { error: roleError } = await admin
        .from("user_role_assignments")
        .upsert({
          user_id: dbUser.id,
          role: user.role,
        }, { onConflict: "user_id,role" });

      if (roleError) {
        results.push({
          email: user.email,
          status: "error",
          message: roleError.message,
        });
        continue;
      }

      results.push({
        email: user.email,
        status: "success",
        password: user.password,
        role: user.role,
      });
    } catch (error) {
      results.push({
        email: user.email,
        status: "error",
        message: String(error),
      });
    }
  }

  return results;
}

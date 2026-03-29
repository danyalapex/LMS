import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getRequestAuthUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function userHasAnyRole(
  authUserId: string,
  roles: string[],
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data: appUser } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!appUser?.id) return false;

  const { data: roleRows } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", appUser.id);

  const assigned = new Set((roleRows ?? []).map((row) => String(row.role)));
  return roles.some((role) => assigned.has(role));
}

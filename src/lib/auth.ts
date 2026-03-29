import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const USER_ROLES = [
  "platform_admin",
  "admin",
  "teacher",
  "student",
  "guardian",
  "finance",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const roleRank: Record<UserRole, number> = {
  platform_admin: 1,
  admin: 2,
  finance: 3,
  teacher: 4,
  student: 5,
  guardian: 6,
};

const roleSet = new Set<string>(USER_ROLES);

export function isUserRole(value: string): value is UserRole {
  return roleSet.has(value);
}

function getHomeRouteForRole(role: UserRole): string {
  if (role === "platform_admin") return "/platform";
  if (role === "admin" || role === "finance") return "/admin";
  if (role === "teacher") return "/teacher";
  if (role === "guardian") return "/guardian";
  return "/student";
}

export function roleLabel(role: UserRole): string {
  if (role === "platform_admin") return "Platform Admin";
  if (role === "admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  if (role === "finance") return "Finance";
  if (role === "guardian") return "Guardian";
  return "Student";
}

export type AppIdentity = {
  authUserId: string;
  appUserId: string;
  organizationId: string;
  fullName: string;
  roles: UserRole[];
  primaryRole: UserRole;
};

function choosePrimaryRole(roles: UserRole[]): UserRole {
  return [...roles].sort((a, b) => roleRank[a] - roleRank[b])[0] ?? "student";
}

export async function getCurrentIdentity(): Promise<AppIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const { data: appUser, error: userError } = await admin
    .from("users")
    .select("id, organization_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (userError || !appUser) {
    return null;
  }

  const { data: roleRows, error: roleError } = await admin
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", appUser.id);

  if (roleError) {
    return null;
  }

  const roles = (roleRows ?? [])
    .map((r) => r.role)
    .filter((role): role is UserRole => isUserRole(role));

  if (roles.length === 0) {
    return null;
  }

  return {
    authUserId: user.id,
    appUserId: appUser.id,
    organizationId: appUser.organization_id,
    fullName: `${appUser.first_name} ${appUser.last_name}`.trim(),
    roles,
    primaryRole: choosePrimaryRole(roles),
  };
}

export async function requireIdentity(): Promise<AppIdentity> {
  const identity = await getCurrentIdentity();

  if (!identity) {
    redirect("/login");
  }

  return identity;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserRole> {
  const identity = await requireIdentity();

  const matched = identity.roles.find((role) => allowedRoles.includes(role));

  if (!matched) {
    redirect(getHomeRouteForRole(identity.primaryRole));
  }

  return matched;
}

export async function getHomeRouteForCurrentUser(): Promise<string> {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return "/login";
  }

  return getHomeRouteForRole(identity.primaryRole);
}

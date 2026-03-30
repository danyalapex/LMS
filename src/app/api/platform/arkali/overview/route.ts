import { NextResponse } from "next/server";
import { getPlatformOverview } from "@/lib/platform/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// This route exposes platform overview data - ensure the caller is authenticated
// and has platform_admin role before returning any admin data.

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error("Error fetching user from session:", userErr);
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: appUser, error: appUserErr } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (appUserErr) {
      console.error("Error fetching app user:", appUserErr);
      return NextResponse.json({ error: "server error" }, { status: 500 });
    }

    if (!appUser) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: roles, error: rolesErr } = await admin
      .from("user_role_assignments")
      .select("role")
      .eq("user_id", appUser.id);

    if (rolesErr) {
      console.error("Error fetching user roles:", rolesErr);
      return NextResponse.json({ error: "server error" }, { status: 500 });
    }

    const hasPlatformAdmin = (roles ?? []).some((r: any) => r.role === "platform_admin");

    if (!hasPlatformAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const overview = await getPlatformOverview();

    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: renewals, error } = await admin
      .from("organization_subscriptions")
      .select(
        "id,organization_id,ends_on,next_billing_date,status,subscription_plans!organization_subscriptions_plan_id_fkey(code,name),organizations!organization_subscriptions_organization_id_fkey(name,code)",
      )
      .gte("next_billing_date", today)
      .lte("next_billing_date", future)
      .order("next_billing_date", { ascending: true })
      .limit(200);

    if (error) throw new Error(error.message);

    return NextResponse.json({ overview, upcomingRenewals: renewals ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? "server error" }, { status: 500 });
  }
}

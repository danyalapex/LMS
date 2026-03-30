import { NextResponse } from "next/server";
import { getPlatformOverview } from "@/lib/platform/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const overview = await getPlatformOverview();
    const admin = createSupabaseAdminClient();

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

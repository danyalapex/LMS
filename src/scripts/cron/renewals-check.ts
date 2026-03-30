import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function run() {
  const admin = createSupabaseAdminClient();
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const futureStr = future.toISOString().slice(0, 10);

  const { data: subs, error } = await admin
    .from("organization_subscriptions")
    .select("id, organization_id, next_billing_date, ends_on, status")
    .gte("next_billing_date", todayStr)
    .lte("next_billing_date", futureStr)
    .in("status", ["active", "trial"])
    .limit(500);

  if (error) {
    console.error("Failed to fetch upcoming renewals:", error);
    process.exit(1);
  }

  for (const s of subs ?? []) {
    const orgId = s.organization_id;
    const { data: users } = await admin.from("users").select("id").eq("organization_id", orgId);
    const userIds = (users ?? []).map((u: any) => u.id);
    if (userIds.length === 0) continue;

    const { data: roleRows } = await admin
      .from("user_role_assignments")
      .select("user_id")
      .eq("role", "admin")
      .in("user_id", userIds);

    const adminUserIds = (roleRows ?? []).map((r: any) => r.user_id);
    const recipients = adminUserIds.length > 0 ? adminUserIds : userIds;

    const notifications = recipients.map((uid: string) => ({
      organization_id: orgId,
      recipient_user_id: uid,
      notification_type: "fee",
      title: "Subscription renewal due soon",
      message: `Your subscription is due within 7 days. Please review billing and renew.`,
      created_by: null,
    }));

    const { error: insertErr } = await admin.from("notifications").insert(notifications);
    if (insertErr) {
      console.error("Failed to insert notifications for org", orgId, insertErr);
    } else {
      console.log("Inserted notifications for org", orgId);
    }
  }

  console.log("Renewals check complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function toLocalDateString(d: Date) {
  // Convert to YYYY-MM-DD in local timezone to avoid UTC midnight shifts
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 10);
}

async function run() {
  const admin = createSupabaseAdminClient();

  const today = new Date();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const todayStr = toLocalDateString(today);
  const futureStr = toLocalDateString(future);

  const limit = 500;
  let offset = 0;
  const subs: any[] = [];

  while (true) {
    const res = await admin
      .from("organization_subscriptions")
      .select("id, organization_id, next_billing_date, status")
      .gte("next_billing_date", todayStr)
      .lte("next_billing_date", futureStr)
      .in("status", ["active", "trial"])
      .range(offset, offset + limit - 1);

    if (res.error) {
      console.error("Failed to fetch upcoming renewals (page):", res.error);
      process.exit(1);
    }

    const page = res.data ?? [];
    subs.push(...page);

    if (page.length < limit) break;

    // warn that we may have more and will continue paging
    console.warn("Renewals query returned a full page; continuing to next page...", { offset, limit });
    offset += limit;
  }

  const windowStartISO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  for (const s of subs) {
    const orgId = s.organization_id;

    const { data: users, error: usersErr } = await admin.from("users").select("id").eq("organization_id", orgId);
    if (usersErr) {
      console.error("Failed to fetch users for org", orgId, usersErr);
      continue;
    }

    const userIds = (users ?? []).map((u: any) => u.id);
    if (userIds.length === 0) continue;

    const { data: roleRows, error: roleErr } = await admin
      .from("user_role_assignments")
      .select("user_id")
      .eq("role", "admin")
      .in("user_id", userIds);

    if (roleErr) {
      console.error("Failed to fetch role rows for org", orgId, roleErr);
      continue;
    }

    const adminUserIds = (roleRows ?? []).map((r: any) => r.user_id);
    const recipients = adminUserIds.length > 0 ? adminUserIds : userIds;

    // Deduplicate by checking for notifications already created for this org/recipients
    const { data: existing, error: existingErr } = await admin
      .from("notifications")
      .select("recipient_user_id")
      .eq("organization_id", orgId)
      .eq("notification_type", "fee")
      .in("recipient_user_id", recipients)
      .gte("created_at", windowStartISO);

    if (existingErr) {
      console.error("Failed to query existing notifications for org", orgId, existingErr);
      continue;
    }

    const existingRecipientSet = new Set((existing ?? []).map((r: any) => r.recipient_user_id));
    const toInsertRecipients = recipients.filter((uid: string) => !existingRecipientSet.has(uid));
    if (toInsertRecipients.length === 0) {
      console.log("No new recipients to notify for org", orgId);
      continue;
    }

    const notifications = toInsertRecipients.map((uid: string) => ({
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
      console.log("Inserted notifications for org", orgId, "recipients:", toInsertRecipients.length);
    }
  }

  console.log("Renewals check complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

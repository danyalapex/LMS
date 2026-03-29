import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;

  if (!session?.user?.id) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");

  if (error) {
    console.error("Failed to get unread notification count:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getRecentNotifications(limit: number = 5) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;

  if (!session?.user?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get recent notifications:", error);
    return [];
  }

  return data ?? [];
}

export async function getNotificationsByType(
  notificationType: string,
  limit: number = 10,
) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;

  if (!session?.user?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("notification_type", notificationType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get notifications by type:", error);
    return [];
  }

  return data ?? [];
}

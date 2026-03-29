"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type NotificationType = "announcement" | "assignment" | "grade" | "attendance" | "exam" | "fee" | "system";
export type NotificationStatus = "sent" | "read" | "archived";

export async function createNotification(params: {
  recipientUserId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdBy?: string;
}) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("notifications").insert({
    organization_id: (await getOrganizationId())!,
    recipient_user_id: params.recipientUserId,
    notification_type: params.notificationType,
    title: params.title,
    message: params.message,
    related_entity: params.relatedEntity,
    related_entity_id: params.relatedEntityId ? (params.relatedEntityId as any) : null,
    created_by: params.createdBy,
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}

export async function getNotifications(params: {
  limit?: number;
  offset?: number;
  status?: NotificationStatus;
}) {
  const supabase = await createSupabaseServerClient();
  const { limit = 20, offset = 0, status } = params;

  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return { notifications: data ?? [], total: count ?? 0 };
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllNotificationsAsRead() {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("status", "sent");

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

export async function archiveNotification(notificationId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ status: "archived" })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Failed to archive notification: ${error.message}`);
  }
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
}

export async function sendBulkNotifications(params: {
  recipientUserIds: string[];
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdBy?: string;
}) {
  const admin = createSupabaseAdminClient();
  const orgId = (await getOrganizationId())!;

  const notifications = params.recipientUserIds.map((userId) => ({
    organization_id: orgId,
    recipient_user_id: userId,
    notification_type: params.notificationType as any,
    title: params.title,
    message: params.message,
    related_entity: params.relatedEntity,
    related_entity_id: params.relatedEntityId ? (params.relatedEntityId as any) : null,
    created_by: params.createdBy,
  }));

  const { error } = await admin.from("notifications").insert(notifications);

  if (error) {
    throw new Error(`Failed to send bulk notifications: ${error.message}`);
  }
}

async function getOrganizationId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return null;
  }

  const { data: user } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", session.user.id)
    .single();

  return user?.organization_id ?? null;
}

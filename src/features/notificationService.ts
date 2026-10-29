
import { supabase } from "../lib/supabase";

export const ADMIN_NOTIFICATION_PAGE_SIZE = 20;

export type AdminNotification = {
  notification_id: string;
  tournament_id: string | null;
  recipient_type: string;
  recipient_id: string;
  source_entity: string | null;
  source_record_id: string | null;
  notification_type: string;
  notification_subject: string;
  notification_body: string;
  notification_priority: string;
  delivery_status: string;
  read_status: string;
  created_datetime: string;
  sent_datetime: string | null;
};

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message || "Notification request failed.");
  }
}

export async function getMyAdminNotifications(
  limit = ADMIN_NOTIFICATION_PAGE_SIZE,
  offset = 0,
): Promise<AdminNotification[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Notification limit must be between 1 and 100.");
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("Notification offset must be non-negative.");
  }

  const { data, error } = await supabase
    .schema("notifications")
    .rpc("get_my_admin_notifications", {
      p_limit: limit,
      p_offset: offset,
    });

  throwIfError(error);

  return (data ?? []) as AdminNotification[];
}

export async function getMyAdminUnreadCount(): Promise<number> {
  const { data, error } = await supabase
    .schema("notifications")
    .rpc("get_my_admin_unread_count");

  throwIfError(error);

  const count = Number(data);

  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("The unread notification count was invalid.");
  }

  return count;
}

export async function markMyAdminNotificationRead(
  notificationId: string,
): Promise<boolean> {
  if (!notificationId.trim()) {
    throw new Error("A notification ID is required.");
  }

  const { data, error } = await supabase
    .schema("notifications")
    .rpc("mark_my_admin_notification_read", {
      p_notification_id: notificationId,
    });

  throwIfError(error);

  return data === true;
}

export async function markAllMyAdminNotificationsRead(): Promise<number> {
  const { data, error } = await supabase
    .schema("notifications")
    .rpc("mark_all_my_admin_notifications_read");

  throwIfError(error);

  const count = Number(data);

  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("The mark-all result was invalid.");
  }

  return count;
}

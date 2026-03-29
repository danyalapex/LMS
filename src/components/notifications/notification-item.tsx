import {
  markNotificationAsRead,
  archiveNotification,
  deleteNotification,
} from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  notification_type: "announcement" | "assignment" | "grade" | "attendance" | "exam" | "fee" | "system";
  title: string;
  message: string;
  status: "sent" | "read" | "archived";
  related_entity?: string;
  related_entity_id?: string;
  read_at?: string;
  created_at: string;
  created_by?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onRead?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

const notificationIcons: Record<string, string> = {
  announcement: "📢",
  assignment: "📝",
  grade: "⭐",
  attendance: "✓",
  exam: "📋",
  fee: "💳",
  system: "⚙️",
};

const notificationColors: Record<string, string> = {
  announcement: "border-blue-200 bg-blue-50",
  assignment: "border-purple-200 bg-purple-50",
  grade: "border-green-200 bg-green-50",
  attendance: "border-amber-200 bg-amber-50",
  exam: "border-red-200 bg-red-50",
  fee: "border-orange-200 bg-orange-50",
  system: "border-slate-200 bg-slate-50",
};

const notificationTextColors: Record<string, string> = {
  announcement: "text-blue-900",
  assignment: "text-purple-900",
  grade: "text-green-900",
  attendance: "text-amber-900",
  exam: "text-red-900",
  fee: "text-orange-900",
  system: "text-slate-900",
};

export function NotificationItem({ notification, onRead, onArchive, onDelete }: NotificationItemProps) {
  const isUnread = notification.status === "sent";
  const icon = notificationIcons[notification.notification_type] || "🔔";
  const colorClass = notificationColors[notification.notification_type];
  const textColorClass = notificationTextColors[notification.notification_type];

  return (
    <div
      className={`border-l-4 rounded-lg p-4 transition-all ${colorClass} ${isUnread ? "ring-2 ring-offset-1 ring-blue-300" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className={`font-semibold line-clamp-1 ${textColorClass}`}>{notification.title}</h3>
              {isUnread && <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
            </div>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notification.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {isUnread && (
            <button
              onClick={onRead}
              className="p-2 hover:bg-white/50 rounded transition-colors"
              title="Mark as read"
            >
              ✓
            </button>
          )}
          {onArchive && (
            <button
              onClick={onArchive}
              className="p-2 hover:bg-white/50 rounded transition-colors"
              title="Archive"
            >
              📁
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-white/50 rounded transition-colors"
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">🔔</p>
        <p className="text-slate-600">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative">
      <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-red-600 to-red-700 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

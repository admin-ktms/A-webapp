
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { useAdminNotifications } from "../../features/useAdminNotifications";
import type { AdminNotification } from "../../features/notificationService";

function formatDate(value: string | null | undefined) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isUnread(notification: AdminNotification) {
  return notification.notification_status?.toLowerCase() !== "read";
}

function getTitle(notification: AdminNotification) {
  return notification.title?.trim() || "Notification";
}

function getMessage(notification: AdminNotification) {
  return notification.message?.trim() || "No message details provided.";
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    actionInProgress,
    refresh,
    markOneRead,
    markAllRead,
  } = useAdminNotifications();

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleMarkOne(notificationId: string) {
    setActionError(null);

    try {
      const changed = await markOneRead(notificationId);

      if (!changed) {
        setActionError(
          "This notification was not changed. It may already be read.",
        );
      }
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to mark notification as read.",
      );
    }
  }

  async function handleMarkAll() {
    setActionError(null);

    try {
      await markAllRead();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to mark notifications as read.",
      );
    }
  }

  const badgeLabel =
    unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-cyan hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cyan px-1 text-[10px] font-bold leading-none text-background">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Admin notifications"
          className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 flex max-h-[min(75vh,38rem)] flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(24rem,calc(100vw-2rem))]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div className="min-w-0">
              <h2 className="font-semibold">Notifications</h2>
              <p className="mt-1 text-xs text-muted">
                {unreadCount} unread
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={refresh}
                disabled={loading || refreshing}
                aria-label="Refresh notifications"
                title="Refresh"
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-cyan disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-text"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          {unreadCount > 0 && (
            <div className="border-b border-border px-4 py-2">
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                disabled={actionInProgress}
                className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-cyan hover:underline disabled:opacity-50"
              >
                <CheckCheck size={15} />
                {actionInProgress ? "Updating…" : "Mark all as read"}
              </button>
            </div>
          )}

          {(error || actionError) && (
            <div
              role="alert"
              className="flex gap-2 border-b border-coral/30 bg-coral/10 p-3 text-xs text-coral"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{actionError ?? error}</span>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-muted">
                Loading notifications…
              </p>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={25} className="mx-auto text-muted" />
                <p className="mt-3 text-sm font-medium">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-muted">
                  New administrative notifications will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => {
                  const unread = isUnread(notification);

                  return (
                    <li
                      key={notification.notification_id}
                      className={[
                        "p-4 transition-colors hover:bg-surface/60",
                        unread ? "bg-cyan/[0.04]" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            unread ? "bg-cyan" : "bg-border",
                          ].join(" ")}
                          aria-hidden="true"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {getTitle(notification)}
                          </p>

                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted">
                            {getMessage(notification)}
                          </p>

                          <p className="mt-2 text-xs text-muted">
                            {formatDate(notification.created_datetime)}
                          </p>

                          {unread && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleMarkOne(
                                  notification.notification_id,
                                )
                              }
                              disabled={actionInProgress}
                              className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-cyan hover:underline disabled:opacity-50"
                            >
                              <Check size={14} />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="border-t border-border px-4 py-3">
            <p className="text-xs leading-5 text-muted">
              Showing the latest {notifications.length} notifications.
            </p>
          </footer>
        </section>
      )}
    </div>
  );
}

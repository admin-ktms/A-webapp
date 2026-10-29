
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../auth/AdminAuthContext";
import {
  ADMIN_NOTIFICATION_PAGE_SIZE,
  getMyAdminNotifications,
  getMyAdminUnreadCount,
  markAllMyAdminNotificationsRead,
  markMyAdminNotificationRead,
  type AdminNotification,
} from "./notificationService";

type NotificationState = {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const INITIAL_STATE: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: true,
  refreshing: false,
  error: null,
};

export function useAdminNotifications() {
  const { status, identity } = useAdminAuth();
  const adminId = identity?.adminId ?? null;

  const [state, setState] =
    useState<NotificationState>(INITIAL_STATE);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);

  const refresh = useCallback(() => {
    setRefreshVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (status !== "authorized" || !adminId) {
      setState({
        notifications: [],
        unreadCount: 0,
        loading: status === "checking",
        refreshing: false,
        error: null,
      });
      return;
    }

    async function load(isInitial: boolean) {
      setState((current) => ({
        ...current,
        loading: isInitial,
        refreshing: !isInitial,
        error: null,
      }));

      try {
        const [notifications, unreadCount] = await Promise.all([
          getMyAdminNotifications(ADMIN_NOTIFICATION_PAGE_SIZE, 0),
          getMyAdminUnreadCount(),
        ]);

        if (cancelled) return;

        setState({
          notifications,
          unreadCount,
          loading: false,
          refreshing: false,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load notifications.",
        }));
      }
    }

    void load(refreshVersion === 0);

    return () => {
      cancelled = true;
    };
  }, [status, adminId, refreshVersion]);

  const markOneRead = useCallback(
    async (notificationId: string) => {
      setActionInProgress(true);

      try {
        const changed =
          await markMyAdminNotificationRead(notificationId);

        if (changed) {
          refresh();
        }

        return changed;
      } finally {
        setActionInProgress(false);
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setActionInProgress(true);

    try {
      const changedCount =
        await markAllMyAdminNotificationsRead();

      refresh();
      return changedCount;
    } finally {
      setActionInProgress(false);
    }
  }, [refresh]);

  return {
    ...state,
    actionInProgress,
    refresh,
    markOneRead,
    markAllRead,
  };
}

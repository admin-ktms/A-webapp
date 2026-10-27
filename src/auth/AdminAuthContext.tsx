
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthStatus =
  | "checking"
  | "unauthenticated"
  | "authorized"
  | "denied"
  | "error";

type AdminIdentity = {
  authUserId: string;
  adminId: string;
};

type ResolverRow = {
  success: boolean;
  reason_code: string | null;
  auth_user_id: string | null;
  account_type: string | null;
  admin_id: string | null;
  link_status: string | null;
  account_status: string | null;
};

type AdminAuthContextValue = {
  session: Session | null;
  status: AuthStatus;
  identity: AdminIdentity | null;
  reasonCode: string | null;
  signOut: () => Promise<void>;
};

const AdminAuthContext =
  createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] =
    useState<AuthStatus>("checking");
  const [identity, setIdentity] =
    useState<AdminIdentity | null>(null);
  const [reasonCode, setReasonCode] =
    useState<string | null>(null);

  // Ignore stale resolver responses after a newer auth event.
  const requestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function resolveAdminIdentity(
      currentSession: Session,
      currentRequestId: number,
    ) {
      try {
        const { data, error } = await supabase
          .schema("identity")
          .rpc("identity_resolver");

        if (error) throw error;
        if (!mounted || currentRequestId !== requestId.current) {
          return;
        }

        const row = (
          Array.isArray(data) ? data[0] : data
        ) as ResolverRow | null;

        const isActiveAdmin =
          row?.success === true &&
          row.auth_user_id === currentSession.user.id &&
          row.account_type === "Admin" &&
          row.link_status === "Active" &&
          row.account_status === "Active" &&
          typeof row.admin_id === "string" &&
          row.admin_id.length > 0;

        if (!isActiveAdmin) {
          setIdentity(null);
          setReasonCode(
            row?.reason_code ?? "ADMIN_ACCESS_DENIED",
          );
          setStatus("denied");
          return;
        }

        setIdentity({
          authUserId: row.auth_user_id!,
          adminId: row.admin_id!,
        });
        setReasonCode(null);
        setStatus("authorized");
      } catch {
        if (!mounted || currentRequestId !== requestId.current) {
          return;
        }

        setIdentity(null);
        setReasonCode("IDENTITY_RESOLUTION_FAILED");
        setStatus("error");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const currentRequestId = ++requestId.current;

      setSession(newSession);
      setIdentity(null);
      setReasonCode(null);

      if (!newSession) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("checking");

      // Avoid awaiting Supabase calls inside the auth callback.
      queueMicrotask(() => {
        void resolveAdminIdentity(newSession, currentRequestId);
      });
    });

    return () => {
      mounted = false;
      requestId.current++;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        status,
        identity,
        reasonCode,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used within AdminAuthProvider.",
    );
  }

  return context;
}

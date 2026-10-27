
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthContext";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, reasonCode, signOut } = useAdminAuth();

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-text">
        <p role="status">Verifying administrative identity…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "denied" || status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-text">
        <section className="w-full max-w-lg rounded-xl border border-border bg-panel p-6">
          <h1 className="text-xl font-bold">
            Administrative access unavailable
          </h1>

          <p className="mt-3 text-sm text-muted">
            KTMS could not verify an active admin identity. Protected
            pages remain inaccessible.
          </p>

          <p className="mt-2 text-xs text-muted">
            Reference: {reasonCode ?? "UNKNOWN"}
          </p>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 min-h-11 rounded-lg bg-cyan px-4 font-semibold text-background"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export default RequireAdmin;

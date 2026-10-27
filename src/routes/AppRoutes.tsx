
import {
  Navigate,
  Route,
  Routes,
  Link,
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import DashboardPage from "../pages/DashboardPage";
import RequireAdmin from "./RequireAdmin";

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <section className="w-full max-w-md rounded-xl border border-border bg-panel p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
          Error 404
        </p>

        <h1 className="mt-3 text-2xl font-bold">
          Page not found
        </h1>

        <p className="mt-3 text-muted">
          The page you requested does not exist.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan px-5 font-semibold text-background hover:opacity-90"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAdmin>
            <DashboardPage />
          </RequireAdmin>
        }
      />

      <Route
        path="/admin"
        element={<Navigate to="/" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}

export default AppRoutes;

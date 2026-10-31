import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";

import AdminShell from "../components/layout/AdminShell";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import TournamentsPage from "../pages/TournamentPages";
import PlayersPage from "../pages/PlayersPage";
import AuditExplorerPage from "../pages/AuditExplorerPage";
import WorkspacePlaceholderPage from "../pages/WorkspacePlaceholderPage";
import RequireAdmin from "./RequireAdmin";
import MatchdaysPage from "../pages/MatchdaysPage";
import RegistrationsPage from "../pages/RegistrationsPage";

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <section className="w-full max-w-md rounded-xl border border-border bg-panel p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
          Error 404
        </p>
        <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
        <p className="mt-3 text-muted">
          The page you requested does not exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan px-5 font-semibold text-background hover:opacity-90"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}

function TournamentOverviewRedirect() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  if (!tournamentId) {
    return <Navigate to="/tournaments" replace />;
  }

  return (
    <Navigate
      to={`/?tournamentId=${encodeURIComponent(tournamentId)}`}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="tournaments" element={<TournamentsPage />} />

        <Route
          path="registrations"
           element={<RegistrationsPage />}
        />

        <Route
          path="matchdays"
          element={<MatchdaysPage />}
        />

        <Route
          path="groups"
          element={
            <WorkspacePlaceholderPage
              title="Tournament groups"
              description="Group structure for the selected tournament. The group table is not implemented yet."
            />
          }
        />

        <Route
          path="fixtures"
          element={
            <WorkspacePlaceholderPage
              title="Fixtures"
              description="Fixtures for the selected tournament. The fixture table and fixture-specific actions are not implemented yet."
            />
          }
        />

        <Route
          path="standings"
          element={
            <WorkspacePlaceholderPage
              title="Standings"
              description="Group and overall standings for the selected tournament. The standings tables are not implemented yet."
            />
          }
        />

        <Route
          path="awards"
          element={
            <WorkspacePlaceholderPage
              title="Tournament awards"
              description="Awards for the selected tournament. Award records and actions are not implemented yet."
            />
          }
        />

        <Route
          path="tournaments/:tournamentId"
          element={<TournamentOverviewRedirect />}
        />

        <Route
          path="disputes"
          element={
            <WorkspacePlaceholderPage
              title="Disputes"
              description="Review contested results and adjudication cases."
            />
          }
        />

        <Route
          path="results"
          element={
            <WorkspacePlaceholderPage
              title="Result queue"
              description="Review pending submissions and disputed results."
            />
          }
        />

        <Route
          path="finance/payments"
          element={
            <WorkspacePlaceholderPage
              title="Payments"
              description="Payment verification and transaction review."
            />
          }
        />

        <Route
          path="finance/payouts"
          element={
            <WorkspacePlaceholderPage
              title="Award payouts"
              description="Award approval and payout operations."
            />
          }
        />

        <Route path="players" element={<PlayersPage />} />

        <Route
          path="support"
          element={
            <WorkspacePlaceholderPage
              title="Support desk"
              description="Support ticket review and case routing."
            />
          }
        />

        <Route
          path="governance/staff"
          element={
            <WorkspacePlaceholderPage
              title="Staff and invitations"
              description="Administrative staff and invitation workflows."
            />
          }
        />

        <Route
          path="governance/audit"
          element={<AuditExplorerPage />}
        />

        <Route path="admin" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;

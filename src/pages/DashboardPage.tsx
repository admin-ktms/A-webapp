
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, RefreshCw, Trophy, ClipboardCheck } from "lucide-react";
import {
  getDashboardData,
  type DashboardData,
} from "../features/dashboardService";

function formatDate(value: string) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(status: string) {
  if (status === "Disputed") {
    return "border-coral/40 bg-coral/10 text-coral";
  }

  return "border-gold/40 bg-gold/10 text-gold";
}

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await getDashboardData();
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();

    // Do not auto-refresh or poll until the first authenticated
    // Data API read has been verified.
  }, [loadDashboard]);

  const summary = data?.summary;

  const cards = [
    {
      label: "Total tournaments",
      value: summary?.totalTournaments,
      detail: "All visible tournaments",
      icon: Trophy,
      iconClass: "text-cyan",
    },
    {
      label: "In progress",
      value: summary?.inProgressTournaments,
      detail: "Group, playoff and knockout stages",
      icon: CalendarDays,
      iconClass: "text-green",
    },
    {
      label: "Active matchdays",
      value: summary?.activeMatchdays,
      detail: "Currently active",
      icon: CalendarDays,
      iconClass: "text-gold",
    },
    {
      label: "Results needing attention",
      value: summary?.resultsNeedingAttention,
      detail: "Current pending or disputed submissions",
      icon: ClipboardCheck,
      iconClass: "text-coral",
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
            Tournament operations
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            An overview of tournament activity and items requiring
            operational attention.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-border bg-panel px-4 text-sm font-medium text-text hover:border-cyan disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <section
          role="alert"
          className="mb-6 flex gap-3 rounded-xl border border-coral/40 bg-coral/10 p-4"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-coral" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-coral">
              Dashboard data could not be loaded
            </h2>
            <p className="mt-1 break-words text-sm text-text">
              {error}
            </p>
            <p className="mt-2 text-sm text-muted">
              Check the authenticated session, Data API schema exposure,
              and the relevant RLS policies. Counts are not being
              replaced with misleading zero values.
            </p>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="mt-3 text-sm font-semibold text-cyan hover:underline"
            >
              Try again
            </button>
          </div>
        </section>
      )}

      <section
        aria-label="Tournament summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-xl border border-border bg-panel p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted">
                  {card.label}
                </p>
                <Icon size={19} className={card.iconClass} />
              </div>

              <p className="mt-4 text-3xl font-bold tabular-nums">
                {loading
                  ? "—"
                  : card.value?.toLocaleString() ?? "—"}
              </p>

              <p className="mt-2 text-xs leading-5 text-muted">
                {card.detail}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-panel">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Results needing attention</h2>
            <p className="mt-1 text-sm text-muted">
              Current submissions awaiting review or carrying a dispute.
            </p>
          </div>

          {!loading && summary && (
            <span className="text-sm text-muted">
              {summary.resultsNeedingAttention} total
            </span>
          )}
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-muted">
            Loading operational data…
          </p>
        ) : error && !data ? (
          <p className="px-5 py-8 text-sm text-muted">
            The results queue is unavailable until the data request succeeds.
          </p>
        ) : !data || data.results.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ClipboardCheck
              size={28}
              className="mx-auto text-green"
            />
            <h3 className="mt-3 font-medium">No results need attention</h3>
            <p className="mt-1 text-sm text-muted">
              No current pending or disputed submissions were returned.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.results.map((item) => (
              <li
                key={item.submissionId}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {item.tournamentName}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Fixture: {item.matchCode}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Submitted: {formatDate(item.submittedAt)}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {data &&
          data.summary.resultsNeedingAttention > data.results.length && (
            <div className="border-t border-border px-5 py-3 text-sm text-muted">
              Showing {data.results.length} of{" "}
              {data.summary.resultsNeedingAttention}.
              The full queue will be available in the tournament operations
              workspace.
            </div>
          )}
      </section>

      <p className="mt-5 text-xs text-muted">
        Dashboard data is read from Supabase. Tournament scheduling,
        fixture generation, progression and result verification remain
        backend responsibilities.
      </p>
    </div>
  );
}

export default DashboardPage;

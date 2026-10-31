
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  RefreshCw,
  Trophy,
  CheckCircle2,
  CalendarClock,
  type LucidIcon,
} tyoe "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  getTournamentMatchdays,
  type MatchdayItem,
} from "../features/matchdayService";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusStyle(status: string): string {
  switch (status) {
    case "Active":
      return "border-green/30 bg-green/10 text-green";

    case "Completed":
      return "border-cyan/30 bg-cyan/10 text-cyan";

    case "Rescheduled":
      return "border-gold/30 bg-gold/10 text-gold";

    case "Scheduled":
    default:
      return "border-border bg-surface text-muted";
  }
}

function Metric({
  label,
  value,
  icon: LucidIcon,
  accent = "text-cyan",
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  accent?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon size={14} className={accent} />
        <span className="text-xs">{label}</span>
      </div>

      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function MatchdayCard({
  matchday,
}: {
  matchday: MatchdayItem;
}) {
  const summary = matchday.fixtureSummary;

  return (
    <article className="rounded-xl border border-border bg-panel p-4 sm:p-5">
      {/* Card heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          

          <h3 className="mt-1 text-lg font-bold">
            {matchday.matchday_name ?? "Matchday"}
          </h3>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
            matchday.matchday_status,
          )}`}
        >
          {matchday.matchday_status}
        </span>
      </div>

      {/* Stage and round */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Trophy size={14} />
          {matchday.stage ?? "Stage unavailable"}
        </span>

        {summary && summary.rounds.length > 0 && (
          <>
            <span>·</span>
            <span>
              {summary.rounds.join(", ")}
            </span>
          </>
        )}
      </div>

      {/* Date and time */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface p-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays size={14} />
            Date
          </div>

          <p className="mt-1 text-sm font-medium">
            {formatDate(matchday.start_datetime)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock3 size={14} />
            Schedule
          </div>

          <p className="mt-1 text-sm font-medium">
            {formatTime(matchday.start_datetime)}
            {" – "}
            {formatTime(matchday.end_datetime)}
          </p>
        </div>
      </div>

      {/* Fixture statistics */}
      <div className="mt-4 border-t border-border pt-4">
        {summary ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Metric
                label="Fixtures"
                value={summary.fixtureCount}
                icon={CalendarDays}
              />

              <Metric
                label="Completed"
                value={summary.completedCount}
                icon={CheckCircle2}
                accent="text-green"
              />

              <Metric
                label="Pending"
                value={summary.pendingCount}
                icon={CalendarClock}
                accent="text-gold"
              />
            </div>

            {summary.rescheduledCount > 0 && (
              <p className="mt-3 text-xs text-gold">
                {summary.rescheduledCount} rescheduled fixture(s)
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">
            Fixture statistics are unavailable for your
            current permissions.
          </p>
        )}
      </div>
    </article>
  );
}

export default function MatchdaysPage() {
  const [searchParams] = useSearchParams();

  const tournamentId = searchParams.get("tournamentId") ?? "";

  const [matchdays, setMatchdays] = useState<MatchdayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMatchdays = useCallback(async () => {
    if (!tournamentId.trim()) {
      setError("The tournament ID is missing from the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getTournamentMatchdays(
        tournamentId,
      );

      setMatchdays(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tournament matchdays.",
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadMatchdays();
  }, [loadMatchdays]);

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
            Tournament operations
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Matchdays
          </h2>

          <p className="mt-2 break-all text-sm text-muted">
            Tournament ID: {tournamentId || "Not selected"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadMatchdays()}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>

      {/* Loading */}
      {loading && (
        <div
          className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-muted"
          aria-live="polite"
        >
          Loading tournament matchdays…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-coral/30 bg-panel p-5">
          <div className="flex items-start gap-3 text-coral">
            <AlertCircle size={20} />

            <div>
              <h3 className="font-semibold">
                Unable to load matchdays
              </h3>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadMatchdays()}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </section>
      )}

      {/* Empty */}
      {!loading && !error && matchdays.length === 0 && (
        <section className="rounded-xl border border-dashed border-border bg-panel p-10 text-center">
          <CalendarDays
            size={30}
            className="mx-auto text-muted"
          />

          <h3 className="mt-4 font-semibold">
            No matchdays found
          </h3>

          <p className="mt-2 text-sm text-muted">
            No matchday records are currently associated
            with this tournament.
          </p>
        </section>
      )}

      {/* Matchday cards */}
      {!loading && !error && matchdays.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {matchdays.length} matchday(s)
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matchdays.map((matchday) => (
              <MatchdayCard
                key={matchday.matchday_id}
                matchday={matchday}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

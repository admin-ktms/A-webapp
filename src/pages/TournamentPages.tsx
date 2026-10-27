
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Trophy,
  Users,
  Swords,
} from "lucide-react";

import {
  getTournamentDirectory,
  type TournamentDirectoryData,
  type TournamentDirectoryItem,
} from "../features/tournaments/tournamentService";

const PAGE_SIZE = 50;

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("suspend") || normalized.includes("cancel")) {
    return "border-coral/40 bg-coral/10 text-coral";
  }

  if (normalized.includes("complete") || normalized.includes("archive")) {
    return "border-green/40 bg-green/10 text-green";
  }

  if (
    normalized.includes("stage") ||
    normalized.includes("open") ||
    normalized.includes("progress")
  ) {
    return "border-cyan/40 bg-cyan/10 text-cyan";
  }

  return "border-border bg-surface text-muted";
}

function formatFee(
  fee: number | string | null,
  currency: string | null,
) {
  if (fee === null || fee === undefined || fee === "") {
    return "Not configured";
  }

  const amount = Number(fee);
  if (!Number.isFinite(amount)) return String(fee);

  return `${currency ? `${currency} ` : ""}${amount.toLocaleString()}`;
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
      <Icon size={18} className="shrink-0 text-cyan" />
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function TournamentCard({
  tournament,
  expanded,
  onToggle,
}: {
  tournament: TournamentDirectoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-panel">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-all text-xs text-muted">
              ID: {tournament.tournament_id}
            </p>

            <h2 className="mt-1 break-words text-lg font-semibold">
              {tournament.tournament_name || "Untitled tournament"}
            </h2>

            <p className="mt-1 text-sm text-muted">
              Type: {tournament.tournament_type_id}
            </p>
          </div>

          <span
            className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(tournament.tournament_status)}`}
          >
            {tournament.tournament_status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryMetric
            icon={Users}
            label="Registration records"
            value={tournament.registrationCount}
          />
          <SummaryMetric
            icon={CalendarDays}
            label="Matchdays"
            value={tournament.matchdayCount}
          />
          <SummaryMetric
            icon={Swords}
            label="Fixtures"
            value={tournament.fixtureCount}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          <p>
            <span className="text-muted">Registration closes: </span>
            {formatDate(tournament.registration_close_datetime)}
          </p>
          <p>
            <span className="text-muted">Starts: </span>
            {formatDate(tournament.tournament_start_date)}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-background/40 p-4 sm:p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Registration opens</dt>
              <dd className="mt-1 text-sm">
                {formatDate(tournament.registration_open_datetime)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Registration closes</dt>
              <dd className="mt-1 text-sm">
                {formatDate(tournament.registration_close_datetime)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Tournament starts</dt>
              <dd className="mt-1 text-sm">
                {formatDate(tournament.tournament_start_date)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Tournament ends</dt>
              <dd className="mt-1 text-sm">
                {formatDate(tournament.tournament_end_date)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Registration fee</dt>
              <dd className="mt-1 text-sm">
                {formatFee(tournament.registration_fee, tournament.currency)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Maximum players</dt>
              <dd className="mt-1 text-sm">
                {tournament.maximum_players == null
                  ? "Not configured"
                  : tournament.maximum_players.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  );
}

function TournamentsPage() {
  const [data, setData] = useState<TournamentDirectoryData | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await getTournamentDirectory(page);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tournaments.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const statuses = useMemo(
    () =>
      [...new Set((data?.tournaments ?? []).map(
        (tournament) => tournament.tournament_status,
      ))].sort(),
    [data],
  );

  const filteredTournaments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.tournaments ?? []).filter((tournament) => {
      const matchesSearch =
        !query ||
        (tournament.tournament_name ?? "").toLowerCase().includes(query) ||
        tournament.tournament_id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        tournament.tournament_status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        tournament.tournament_type_id === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [data, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / PAGE_SIZE),
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
            Tournament operations
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Tournaments
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Monitor tournament status, registration activity and automated
            match operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-panel px-4 text-sm font-medium hover:border-cyan disabled:cursor-not-allowed disabled:opacity-50"
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
              Tournament data could not be loaded
            </h2>
            <p className="mt-1 break-words text-sm">{error}</p>
            <p className="mt-2 text-sm text-muted">
              Counts are not being replaced with zero values when a query fails.
              We will reconcile the relevant Data API and RLS access after
              deployment.
            </p>
            <button
              type="button"
              onClick={() => void load(true)}
              className="mt-3 text-sm font-semibold text-cyan hover:underline"
            >
              Try again
            </button>
          </div>
        </section>
      )}

      <section className="mb-5 rounded-xl border border-border bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_minmax(160px,220px)]">
          <label className="relative block">
            <span className="sr-only">Search tournaments</span>
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or tournament ID"
              className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </label>

          <label className="block">
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Filter by tournament type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
            >
              <option value="all">All types</option>
              {(data?.types ?? []).map((type) => (
                <option
                  key={type.tournament_type_id}
                  value={type.tournament_type_id}
                >
                  {type.tournament_type_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {loading
              ? "Loading tournament records…"
              : `${filteredTournaments.length} shown on this page`}
          </span>
          <span>
            {data ? `${data.total.toLocaleString()} total records` : " "}
          </span>
        </div>
      </section>

      {loading && !data ? (
        <section className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-muted">
          Loading tournament records…
        </section>
      ) : !error && filteredTournaments.length === 0 ? (
        <section className="rounded-xl border border-border bg-panel px-5 py-12 text-center">
          <Trophy size={30} className="mx-auto text-muted" />
          <h2 className="mt-3 font-semibold">No tournaments found</h2>
          <p className="mt-1 text-sm text-muted">
            Try changing the search text or filters.
          </p>
        </section>
      ) : (
        <section aria-label="Tournament directory" className="space-y-4">
          {filteredTournaments.map((tournament) => (
            <TournamentCard
              key={tournament.tournament_id}
              tournament={tournament}
              expanded={expandedId === tournament.tournament_id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === tournament.tournament_id
                    ? null
                    : tournament.tournament_id,
                )
              }
            />
          ))}
        </section>
      )}

      {data && totalPages > 1 && (
        <nav
          aria-label="Tournament pagination"
          className="mt-6 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={page === 0 || loading || refreshing}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="min-h-11 rounded-lg border border-border px-4 text-sm hover:border-cyan disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page + 1 >= totalPages || loading || refreshing}
            onClick={() =>
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
            className="min-h-11 rounded-lg border border-border px-4 text-sm hover:border-cyan disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}

      <p className="mt-5 text-xs leading-5 text-muted">
        Tournament scheduling, fixture generation and lifecycle progression
        remain automated backend responsibilities. This page is for
        monitoring; it does not manually advance tournament stages.
      </p>
    </div>
  );
}

export default TournamentsPage;

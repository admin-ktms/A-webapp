import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import {
  getTournamentOverview,
  type CountSummary,
  type OverviewSection,
  type TournamentDetails,
  type TournamentOverview,
} from "../features/tournamentOverviewService";

function SectionCard<T>({
  title,
  section,
  render,
}: {
  title: string;
  section: OverviewSection<T> | undefined;
  render: (data: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-lg font-semibold">{title}</h2>

      {!section && (
        <p className="mt-3 text-sm text-muted">No section data available.</p>
      )}

      {section?.status === "denied" && (
        <p className="mt-3 text-sm text-coral">
          Access denied for this section.
        </p>
      )}

      {section?.status === "error" && (
        <p className="mt-3 text-sm text-coral">
          Unable to load this section: {section.message}
        </p>
      )}

      {section?.status === "empty" && (
        <p className="mt-3 text-sm text-muted">
          {section.message ?? "No records found."}
        </p>
      )}

      {section?.status === "ready" && section.data !== null && (
        <div className="mt-3">{render(section.data)}</div>
      )}
    </section>
  );
}

function TournamentDetails({ data }: { data: TournamentDetails }) {
  const fields = [
    ["Tournament ID", data.tournament_id],
    ["Type", data.tournament_type_id],
    ["Status", data.tournament_status],
    ["Registration opens", data.registration_open_datetime],
    ["Registration closes", data.registration_close_datetime],
    ["Registration fee", data.registration_fee == null
      ? null
      : `${data.currency} ${data.registration_fee}`],
    ["Maximum players", data.maximum_players],
    ["Start date", data.tournament_start_date],
    ["End date", data.tournament_end_date],
  ] as const;

  return (
    <div>
      <h3 className="text-xl font-semibold">
        {data.tournament_name ?? "Tournament"}
      </h3>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 break-words text-sm">
              {value == null || value === "" ? "—" : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CountDetails({ data }: { data: CountSummary }) {
  return <p className="text-2xl font-semibold">{data.count}</p>;
}

export default function TournamentOverviewPanel({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [overview, setOverview] = useState<TournamentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!tournamentId) {
      setPageError("The tournament ID is missing from the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    try {
      const result = await getTournamentOverview(tournamentId);
      setOverview(result);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The tournament overview could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (loading) {
    return (
      <main className="p-6 text-muted" aria-live="polite">
        Loading tournament overview…
      </main>
    );
  }

    if (pageError) {
      return (
        <section className="space-y-4 rounded-xl border border-coral/40 bg-panel p-5">
          <div className="flex items-start gap-3 text-coral">
            <AlertCircle size={20} />
            <p>{pageError}</p>
          </div>
  
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </section>
      );
    }

  if (!overview) return null;

  return (
    <main className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {overview.tournament.data?.tournament_name ??
                "Selected tournament"}
            </h2>
            <p className="mt-1 break-all text-sm text-muted">
              Tournament ID: {tournamentId}
            </p>
          </div>
  
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4"
          >
            <RefreshCw size={16} />
            Refresh overview
          </button>
        </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Tournament details"
          section={overview.tournament}
          render={(data) => <TournamentDetails data={data} />}
        />
        <SectionCard
          title="Matchdays"
          section={overview.matchdays}
          render={(data) => <CountDetails data={data} />}
        />
        <SectionCard
          title="Registrations"
          section={overview.registrations}
          render={(data) => <CountDetails data={data} />}
        />
        <SectionCard
          title="Fixtures"
          section={overview.fixtures}
          render={(data) => <CountDetails data={data} />}
        />
        <SectionCard
          title="Results"
          section={overview.results}
          render={(data) => <CountDetails data={data} />}
        />
        <SectionCard
          title="Disputes"
          section={overview.disputes}
          render={(data) => <CountDetails data={data} />}
        />
      </div>
    </main>
  );
}


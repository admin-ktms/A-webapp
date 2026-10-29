
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  AUDIT_PAGE_SIZE,
  readAuditPage,
  type AuditFilters,
  type AuditRecord,
} from "../features/auditService";

const EMPTY_FILTERS: AuditFilters = {
  search: "",
  eventReason: "",
  actionSource: "",
  actionStatus: "",
  relatedEntity: "",
  relatedRecordId: "",
  tournamentId: "",
  from: "",
  to: "",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function statusClasses(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
    case "success":
      return "border-green/40 bg-green/10 text-green";
    case "failed":
    case "error":
      return "border-coral/40 bg-coral/10 text-coral";
    default:
      return "border-border bg-surface text-muted";
  }
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: unknown;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className={`mt-1 break-words text-sm ${mono ? "font-mono" : ""}`}>
        {displayValue(value)}
      </dd>
    </div>
  );
}

function JsonEvidence({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-3 text-xs leading-5">
        {value === null || value === undefined
          ? "No value recorded"
          : JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

function AuditDetails({
  record,
  onClose,
}: {
  record: AuditRecord;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-xl border border-border bg-panel shadow-xl sm:rounded-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-panel p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
              Audit record
            </p>
            <h2
              id="audit-detail-title"
              className="mt-1 break-all text-lg font-bold"
            >
              {record.audit_log_id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border hover:border-cyan"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-5">
          <section>
            <h3 className="mb-3 font-semibold">Event information</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Action time" value={formatDate(record.action_time)} />
              <Field label="Action source" value={record.action_source} />
              <Field label="Action status" value={record.action_status} />
              <Field label="Summary" value={record.action_summary} />
              <Field label="Event reason" value={record.reason} />
              <Field label="Event category" value={record.event_category} />
              <Field label="Actor type" value={record.performed_by_type} />
              <Field label="Actor ID" value={record.performed_by_id} mono />
              <Field label="Tournament ID" value={record.tournament_id} mono />
              <Field label="Related entity" value={record.related_entity} />
              <Field label="Related record ID" value={record.related_record_id} mono />
              <Field label="Correlation ID" value={record.correlation_id} mono />
              <Field label="Action datetime" value={formatDate(record.action_datetime)} />
            </dl>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <JsonEvidence title="Previous value" value={record.previous_value} />
            <JsonEvidence title="New value" value={record.new_value} />
          </div>
        </div>

        <footer className="flex justify-end border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:border-cyan"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function AuditExplorerPage() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [authorizationReason, setAuthorizationReason] = useState("");
  const [submittedAuthorizationReason, setSubmittedAuthorizationReason] =
    useState("");
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const updateDraft = <K extends keyof AuditFilters>(
    key: K,
    value: AuditFilters[K],
  ) => setDraftFilters((current) => ({ ...current, [key]: value }));

  const loadRecords = useCallback(async () => {
    if (!submittedAuthorizationReason.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await readAuditPage({
        filters,
        offset: page * AUDIT_PAGE_SIZE,
        authorizationReason: submittedAuthorizationReason,
      });
      setRecords(result.records);
      setHasNextPage(result.hasNextPage);
    } catch (err: unknown) {
      setRecords([]);
      setHasNextPage(false);
      setError(
        err instanceof Error ? err.message : "Unable to load audit records.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, submittedAuthorizationReason, requestVersion]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draftFilters });
    setPage(0);
    setSubmittedAuthorizationReason(authorizationReason.trim());
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
            Governance
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Audit explorer</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Read-only inspection of audit events, actors, and recorded changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRequestVersion((value) => value + 1)}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-panel px-4 text-sm font-medium hover:border-cyan disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-panel p-4">
        <form onSubmit={applyFilters}>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">
              Access justification
            </span>
            <input
              value={authorizationReason}
              onChange={(event) => setAuthorizationReason(event.target.value)}
              placeholder="Why are you accessing audit records?"
              maxLength={500}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
            <span className="mt-1 block text-xs text-muted">
              Sent to the backend authorization evaluator, not used as an event filter.
            </span>
          </label>

          <label className="relative block">
            <span className="sr-only">Search audit records</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={draftFilters.search}
              onChange={(event) => updateDraft("search", event.target.value)}
              placeholder="Search text, IDs, previous values, or new values"
              className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-cyan"
            >
              <Filter size={16} />
              Filter settings
              <ChevronDown size={15} className={filtersOpen ? "rotate-180" : ""} />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-10 rounded-lg bg-cyan px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium hover:border-cyan"
            >
              Clear filters
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Event reason</span>
                <input
                  value={draftFilters.eventReason}
                  onChange={(event) => updateDraft("eventReason", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Action source</span>
                <input
                  value={draftFilters.actionSource}
                  onChange={(event) => updateDraft("actionSource", event.target.value)}
                  placeholder="Exact value"
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Action status</span>
                <select
                  value={draftFilters.actionStatus}
                  onChange={(event) => updateDraft("actionStatus", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                >
                  <option value="">All statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Related entity</span>
                <input
                  value={draftFilters.relatedEntity}
                  onChange={(event) => updateDraft("relatedEntity", event.target.value)}
                  placeholder="Exact value"
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Related record ID</span>
                <input
                  value={draftFilters.relatedRecordId}
                  onChange={(event) => updateDraft("relatedRecordId", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Tournament ID</span>
                <input
                  value={draftFilters.tournamentId}
                  onChange={(event) => updateDraft("tournamentId", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">From</span>
                <input
                  type="datetime-local"
                  value={draftFilters.from}
                  onChange={(event) => updateDraft("from", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">To</span>
                <input
                  type="datetime-local"
                  value={draftFilters.to}
                  onChange={(event) => updateDraft("to", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
                />
              </label>
            </div>
          )}
        </form>
      </section>

      {error && (
        <section role="alert" className="mb-5 flex gap-3 rounded-xl border border-coral/40 bg-coral/10 p-4">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-coral" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-coral">Audit records could not be loaded</h2>
            <p className="mt-1 break-words text-sm">{error}</p>
            <button
              type="button"
              onClick={() => setRequestVersion((value) => value + 1)}
              className="mt-3 text-sm font-semibold text-cyan hover:underline"
            >
              Try again
            </button>
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Loading audit records…
                </td>
              </tr>
            )}
            {!loading && !error && records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  No audit records match these filters.
                </td>
              </tr>
            )}
            {!loading && records.map((record) => (
              <tr key={record.audit_log_id} className="border-t border-border transition-colors hover:bg-surface/60">
                <td className="whitespace-nowrap px-4 py-3">{formatDate(record.action_time)}</td>
                <td className="px-4 py-3">{record.action_source}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(record.action_status)}`}>
                    {record.action_status}
                  </span>
                </td>
                <td className="max-w-sm whitespace-normal px-4 py-3">
                  <p>{record.action_summary}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">{record.audit_log_id}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{record.related_entity ?? "—"}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">{record.related_record_id ?? ""}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{record.performed_by_type}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">{record.performed_by_id ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(record)}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:border-cyan hover:text-cyan"
                  >
                    <Eye size={15} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <nav aria-label="Audit pagination" className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page === 0 || loading}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span className="text-sm text-muted">
          Page {page + 1} · {records.length} record(s)
        </span>
        <button
          type="button"
          disabled={!hasNextPage || loading}
          onClick={() => setPage((current) => current + 1)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </nav>

      <p className="mt-5 text-xs leading-5 text-muted">
        Audit records are displayed read-only. Search and filters narrow the returned
        results; authorization is enforced by the backend.
      </p>

      {selectedRecord && (
        <AuditDetails
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

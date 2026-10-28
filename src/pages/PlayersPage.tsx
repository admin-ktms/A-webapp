
import { useCallback, useEffect, useState } from "react";
import ImageThumbnail from "../components/media/ImageThumbnail";
import ImageViewer from "../components/media/ImageViewer";
import type { ImageViewerImage } from "../components/media/imageViewer.types";
import { getSquadScreenshotUrls } from "../features/squadScreenshotService";
import PlayerOperationsPanel from "../components/players/PlayerOperationsPanel";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  getPlayerDetails,
  getPlayerDirectory,
  PLAYER_PAGE_SIZE,
  type PlayerDetails,
  type PlayerDirectoryItem,
  type PlayerStatus,
} from "../features/playerService";

type StatusFilter = PlayerStatus | "all";

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function statusClasses(status: string) {
  switch (status) {
    case "Active":
      return "border-green/40 bg-green/10 text-green";
    case "Suspended":
      return "border-gold/40 bg-gold/10 text-gold";
    case "Banned":
      return "border-coral/40 bg-coral/10 text-coral";
    default:
      return "border-border bg-surface text-muted";
  }
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm">
        {displayValue(value)}
      </dd>
    </div>
  );
}

function PlayerDetailsModal({
  player,
  onClose,
}: {
  player: PlayerDirectoryItem;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedScreenshots, setSignedScreenshots] = useState<
    Awaited<ReturnType<typeof getSquadScreenshotUrls>>
  >([]);
  const [screenshotsLoading, setScreenshotsLoading] = useState(false);
  const [screenshotsError, setScreenshotsError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadScreenshots = useCallback(async () => {
    setScreenshotsLoading(true);
    setScreenshotsError(null);
  
    try {
      const result = await getSquadScreenshotUrls(player.player_id);
  
      setSignedScreenshots(result);
    } catch (err: unknown) {
      setSignedScreenshots([]);
      setScreenshotsError(
        err instanceof Error
          ? err.message
          : "Unable to load squad screenshots.",
      );
    } finally {
      setScreenshotsLoading(false);
    }
  }, [player.player_id]);

  
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setDetails(null);

      try {
        const result = await getPlayerDetails(player.player_id);

        if (!cancelled) {
          setDetails(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load player details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [player.player_id]);

  useEffect(() => {
    let cancelled = false;
  
    async function load() {
      setScreenshotsLoading(true);
      setScreenshotsError(null);
  
      try {
        const result = await getSquadScreenshotUrls(player.player_id);
  
        if (!cancelled) {
          setSignedScreenshots(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setSignedScreenshots([]);
          setScreenshotsError(
            err instanceof Error
              ? err.message
              : "Unable to load squad screenshots.",
          );
        }
      } finally {
        if (!cancelled) setScreenshotsLoading(false);
      }
    }
  
    void load();
  
    return () => {
      cancelled = true;
    };
  }, [player.player_id]);
  

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !viewerOpen) {
        onClose();
      }
    }
  
    window.addEventListener("keydown", handleKeyDown);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, viewerOpen]);

  
  const profile = details?.player ?? {};
  const squads = details?.squads ?? [];
  const registrations = details?.registrations ?? [];
  const requests = details?.registration_requests ?? [];
  const restrictions = details?.tournament_type_restrictions ?? [];  
  const viewerImages: ImageViewerImage[] = signedScreenshots.map(
    (screenshot, index) => {
      const metadata = squads
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        )
        .flatMap((squad) => {
          const items = Array.isArray(squad.screenshots)
            ? squad.screenshots
            : [];
  
          return items.map((item) => ({
            squadName:
              typeof squad.squad_name === "string"
                ? squad.squad_name
                : "Squad",
            screenshot:
              typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : {},
          }));
        })
        .find(
          (item) =>
            item.screenshot.screenshot_url === screenshot.objectPath,
        );
  
      const slot = metadata?.screenshot.screenshot_slot;
  
      const label = metadata
        ? `${metadata.squadName} — Screenshot ${String(slot ?? index + 1)}`
        : `Squad screenshot ${index + 1}`;
  
      return {
        src: screenshot.signedUrl,
        alt: label,
        label,
      };
    },
  );


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-details-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
              Player record
            </p>
            <h2
              id="player-details-title"
              className="mt-2 break-words text-xl font-bold"
            >
              {player.manager_name}
            </h2>
            <p className="mt-1 break-all text-sm text-muted">
              {player.player_id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close player details"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border hover:border-cyan"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <p className="py-8 text-center text-sm text-muted">
              Loading player details…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex gap-3 rounded-lg border border-coral/40 bg-coral/10 p-4"
            >
              <AlertCircle className="shrink-0 text-coral" size={20} />
              <div>
                <p className="font-semibold text-coral">
                  Player details unavailable
                </p>
                <p className="mt-1 break-words text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && details && (
            <div className="space-y-7">
              <section>
                <h3 className="mb-4 font-semibold">Profile</h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Player ID" value={profile.player_id} />
                  <DetailField label="Manager name" value={profile.manager_name} />
                  <DetailField label="Email" value={profile.email_address} />
                  <DetailField label="WhatsApp" value={profile.whatsapp_number} />
                  <DetailField label="Status" value={profile.player_status} />
                  <DetailField label="Date of birth" value={profile.date_of_birth} />
                  <DetailField
                    label="Registered on"
                    value={formatDate(profile.created_datetime)}
                  />
                  <DetailField
                    label="Suspended until"
                    value={formatDate(profile.suspended_until_datetime)}
                  />
                  <DetailField label="Status reason" value={profile.status_reason} />
                </dl>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Squads</h3>
                  <span className="text-xs text-muted">
                    {squads.length}/3
                  </span>
                </div>

                {squads.length === 0 ? (
                  <p className="text-sm text-muted">No squads recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-surface text-xs text-muted">
                        <tr>
                          <th className="px-3 py-3">Squad ID</th>
                          <th className="px-3 py-3">Squad name</th>
                          <th className="px-3 py-3">Slot</th>
                          <th className="px-3 py-3">Screenshots</th>
                        </tr>
                      </thead>
                      <tbody>
                        {squads.map((item, index) => {
                          const squad =
                            typeof item === "object" && item !== null
                              ? item as Record<string, unknown>
                              : {};

                          const screenshots = Array.isArray(squad.screenshots)
                            ? squad.screenshots
                            : [];

                          return (
                            <tr
                              key={String(squad.squad_id ?? index)}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-3 break-all">
                                {displayValue(squad.squad_id)}
                              </td>
                              <td className="px-3 py-3">
                                {displayValue(squad.squad_name)}
                              </td>
                              <td className="px-3 py-3">
                                {displayValue(squad.squad_slot)}
                              </td>
                              <td className="px-3 py-3">
                                {screenshots.length}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 font-semibold">KT registrations</h3>
                <p className="mb-3 text-xs text-muted">
                  Registration information is currently available for KT only.
                </p>
                {registrations.length === 0 ? (
                  <p className="text-sm text-muted">
                    No registration records returned.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-surface text-xs text-muted">
                        <tr>
                          <th className="px-3 py-3">Registration</th>
                          <th className="px-3 py-3">Tournament</th>
                          <th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((item, index) => {
                          const row =
                            typeof item === "object" && item !== null
                              ? item as Record<string, unknown>
                              : {};

                          return (
                            <tr
                              key={String(row.registration_id ?? index)}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-3 break-all">
                                {displayValue(row.registration_id)}
                              </td>
                              <td className="px-3 py-3 break-all">
                                {displayValue(row.tournament_id)}
                              </td>
                              <td className="px-3 py-3">
                                {displayValue(row.registration_status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 font-semibold">Registration requests</h3>
                <p className="text-sm text-muted">
                  {requests.length} request record(s)
                </p>
              </section>

              <section>
                <h3 className="mb-3 font-semibold">
                  Tournament-type restrictions
                </h3>
                <p className="text-sm text-muted">
                  {restrictions.length} restriction record(s)
                </p>
              </section>
              
              <section className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Squad screenshots</h3>
                    <p className="mt-1 text-sm text-muted">
                      Private screenshots are loaded through the authorized image service.
                    </p>
                  </div>
              
                  <button
                    type="button"
                    onClick={() => void loadScreenshots()}
                    disabled={screenshotsLoading}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm font-medium hover:border-cyan disabled:opacity-50"
                  >
                    {screenshotsLoading ? "Loading…" : "Refresh screenshots"}
                  </button>
                </div>
              
                {screenshotsLoading && signedScreenshots.length === 0 && (
                  <p className="py-6 text-sm text-muted">
                    Loading squad screenshots…
                  </p>
                )}
              
                {screenshotsError && (
                  <div role="alert" className="mt-4 rounded-lg border border-coral/40 bg-coral/10 p-3">
                    <p className="break-words text-sm text-coral">
                      {screenshotsError}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Access restrictions are enforced by the backend. If your role
                      requires tournament context, this screen must be opened with a
                      valid assigned tournament scope.
                    </p>
                  </div>
                )}
              
                {!screenshotsLoading &&
                  !screenshotsError &&
                  signedScreenshots.length === 0 && (
                    <p className="py-6 text-sm text-muted">
                      No squad screenshots are available for this player.
                    </p>
                  )}
              
                {viewerImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {viewerImages.map((image, index) => (
                      <ImageThumbnail
                        key={`${image.src}-${index}`}
                        image={image}
                        onClick={() => {
                          setViewerIndex(index);
                          setViewerOpen(true);
                        }}
                        className="aspect-[4/3] w-full"
                      />
                    ))}
                  </div>
                )}
              
                <ImageViewer
                  images={viewerImages}
                  initialIndex={viewerIndex}
                  isOpen={viewerOpen}
                  onClose={() => setViewerOpen(false)}
                />
              </section>

            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:border-cyan"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function PlayersPage() {
  const [players, setPlayers] = useState<PlayerDirectoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerDirectoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "operations">(
    "overview",
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlayers = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const result = await getPlayerDirectory({
          search,
          status,
          page,
        });

        setPlayers(result.players);
        setTotal(result.total);
      } catch (err: unknown) {
        setPlayers([]);
        setTotal(0);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load player records.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, page],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPlayers();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadPlayers]);

  useEffect(() => {
    setPage(0);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(total / PLAYER_PAGE_SIZE));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
            Tournament operations
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Players</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Global player directory and squad records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPlayers(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-panel px-4 text-sm font-medium hover:border-cyan disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* Players page tabs: directory overview or player operations. */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "overview"
              ? "border-cyan text-cyan"
              : "border-transparent text-muted hover:text-text"
          }`}
          aria-current={activeTab === "overview" ? "page" : undefined}
        >
          View Players
        </button>
      
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "operations"
              ? "border-cyan text-cyan"
              : "border-transparent text-muted hover:text-text"
          }`}
          aria-current={activeTab === "operations" ? "page" : undefined}
        >
          Player Operations
        </button>
      </div>
      
      {activeTab === "overview" ? (
        <>
      
      <section className="mb-5 rounded-xl border border-border bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Search players</span>
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, player ID, email or WhatsApp"
              className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </label>

          <label>
            <span className="sr-only">Filter by player status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Banned">Banned</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Tournament type</span>
            <select
              value="kt"
              disabled
              className="min-h-11 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-sm text-muted opacity-75"
              title="Only KT is implemented at present."
            >
              <option value="kt">Tournament type: KT</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {loading
              ? "Loading player records…"
              : `${players.length} player(s) on this page`}
          </span>
          <span>{total.toLocaleString()} total player(s)</span>
        </div>
      </section>

      {error && (
        <section
          role="alert"
          className="mb-5 flex gap-3 rounded-xl border border-coral/40 bg-coral/10 p-4"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-coral" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-coral">
              Player directory could not be loaded
            </h2>
            <p className="mt-1 break-words text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void loadPlayers(true)}
              className="mt-3 text-sm font-semibold text-cyan hover:underline"
            >
              Try again
            </button>
          </div>
        </section>
      )}

      <section
        aria-label="Player directory"
        className="overflow-x-auto rounded-xl border border-border bg-panel"
      >
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Squads</th>
              <th className="px-4 py-3">KT</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>

          <tbody>
            {loading && players.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Loading player records…
                </td>
              </tr>
            )}

            {!loading && !error && players.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users size={25} className="mx-auto text-muted" />
                  <p className="mt-3 font-medium">No players found</p>
                  <p className="mt-1 text-sm text-muted">
                    Try changing your search or status filter.
                  </p>
                </td>
              </tr>
            )}


            {players.map((player) => (
              <tr
                key={player.player_id}
                className="border-t border-border transition-colors hover:bg-surface/60"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{player.manager_name}</p>
                  <p className="mt-1 break-all text-xs text-muted">
                    {player.player_id}
                  </p>
                </td>
            
                <td className="px-4 py-3 tabular-nums">
                  {player.squad_count}/3
                </td>
            
                <td className="px-4 py-3 tabular-nums">
                  {player.registration_count}
                </td>
            
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(player.player_status)}`}
                  >
                    {player.player_status}
                  </span>
                </td>
            
                <td className="px-4 py-3">
                  {formatDate(player.created_datetime)}
                </td>
            
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(player)}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:border-cyan hover:text-cyan"
                    aria-label={`View details for ${player.manager_name}`}
                  >
                    <Eye size={15} />
                    Player details
                  </button>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </section>

      <nav
        aria-label="Player directory pagination"
        className="mt-5 flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={page === 0 || loading || refreshing}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="text-sm text-muted">
          Page {page + 1} of {totalPages}
        </span>

        <button
          type="button"
          disabled={
            page + 1 >= totalPages || loading || refreshing
          }
          onClick={() =>
            setPage((current) => Math.min(totalPages - 1, current + 1))
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </nav>

      <p className="mt-5 text-xs leading-5 text-muted">
        The directory is global and is not filtered by tournament participation.
        KT registration counts are shown separately. Other tournament types
        remain unavailable until their workflows are implemented.
      </p>

      {selectedPlayer && (
        <PlayerDetailsModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
        </>
      ) : (
        <PlayerOperationsPanel />
      )}
    </div>
  );
}

export default PlayersPage;

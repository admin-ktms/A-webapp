
import { useEffect, useState } from "react";
import {
  banPlayerAccount,
  getTournamentTypes,
  reinstatePlayer,
  restrictPlayerTournamentType,
  suspendPlayerAccount,
  type TournamentType,
} from "../../features/playerOperationsService";
import {
  getPlayerDirectory,
  type PlayerDirectoryItem,
} from "../../features/playerService";

type Operation =
  | "suspend-account"
  | "ban-account"
  | "reinstate-account"
  | "suspend-type"
  | "ban-type"
  | "reinstate-type";

const durations = [
  { label: "24 hours", value: "24 hours" },
  { label: "7 days", value: "7 days" },
  { label: "30 days", value: "30 days" },
];

type PlayerOperationsPanelProps = {
  initialPlayerId?: string;
};

export default function PlayerOperationsPanel({
  initialPlayerId = "",
}: PlayerOperationsPanelProps) {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerDirectoryItem[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [types, setTypes] = useState<TournamentType[]>([]);
  const [tournamentTypeId, setTournamentTypeId] = useState("");
  const [operation, setOperation] = useState<Operation>("suspend-account");
  const [duration, setDuration] = useState("24 hours");
  const [reason, setReason] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTypes() {
      setLoadingTypes(true);

      try {
        const data = await getTournamentTypes();
        if (!cancelled) {
          setTypes(data);
          setTournamentTypeId(data[0]?.tournament_type_id ?? "");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load tournament types.",
          );
        }
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    }

    void loadTypes();

    return () => {
      cancelled = true;
    };
  }, []);

    useEffect(() => {
    if (!initialPlayerId) return;

    let cancelled = false;

    async function loadInitialPlayer() {
      setLoadingPlayers(true);
      setError(null);
      setMessage(null);

      try {
        const data = await getPlayerDirectory({
          search: initialPlayerId,
          page: 0,
        });

        if (cancelled) return;

        const exactPlayer = data.players.find(
          (player) => player.player_id === initialPlayerId,
        );

        if (!exactPlayer) {
          setPlayers([]);
          setPlayerId("");
          setError(
            `Player ${initialPlayerId} could not be found. Search for the player manually.`,
          );
          return;
        }

        setPlayers([exactPlayer]);
        setPlayerId(exactPlayer.player_id);
        setSearch(exactPlayer.player_id);
        setMessage(
          `${exactPlayer.manager_name} has been selected.`,
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the selected player.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPlayers(false);
      }
    }

    void loadInitialPlayer();

    return () => {
      cancelled = true;
    };
  }, [initialPlayerId]);

  async function searchPlayers() {
    setLoadingPlayers(true);
    setError(null);
    setMessage(null);
    setPlayers([]);
    setPlayerId("");

    try {
      const data = await getPlayerDirectory({
        search,
        page: 0,
      });

      setPlayers(data.players);
      if (data.players.length === 1) {
        setPlayerId(data.players[0].player_id);
      }
      if (data.players.length === 0) {
        setMessage("No matching players found.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to search player records.",
      );
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function submitOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResult(null);

    if (!playerId) {
      setError("Search for and select a player first.");
      return;
    }

    if (!reason.trim()) {
      setError("Enter a reason for this operation.");
      return;
    }

    if (
      ["suspend-type", "ban-type", "reinstate-type"].includes(operation) &&
      !tournamentTypeId
    ) {
      setError("Select a tournament type.");
      return;
    }

    const player = players.find((item) => item.player_id === playerId);

    const operationLabel: Record<Operation, string> = {
      "suspend-account": "suspend this player's account",
      "ban-account": "ban this player's account",
      "reinstate-account": "reinstate this player's account",
      "suspend-type": "suspend this player in the selected tournament type",
      "ban-type": "ban this player in the selected tournament type",
      "reinstate-type": "reinstate this player in the selected tournament type",
    };

    const confirmed = window.confirm(
      `Confirm: ${operationLabel[operation]}?\n\nPlayer: ${player?.manager_name ?? playerId}\nReason: ${reason.trim()}`,
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      let response: unknown;

      switch (operation) {
        case "suspend-account":
          response = await suspendPlayerAccount(
            playerId,
            duration,
            reason,
          );
          break;

        case "ban-account":
          response = await banPlayerAccount(playerId, reason);
          break;

        case "reinstate-account":
          response = await reinstatePlayer(
            playerId,
            "GLOBAL",
            reason,
          );
          break;

        case "suspend-type":
          response = await restrictPlayerTournamentType(
            playerId,
            tournamentTypeId,
            "Suspended",
            reason,
            duration,
          );
          break;

        case "ban-type":
          response = await restrictPlayerTournamentType(
            playerId,
            tournamentTypeId,
            "Banned",
            reason,
          );
          break;

        case "reinstate-type":
          response = await reinstatePlayer(
            playerId,
            "TOURNAMENT_TYPE",
            reason,
            tournamentTypeId,
          );
          break;
      }

      setResult(response);
      setMessage("The backend operation returned successfully.");
      setReason("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "The operation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const usesTournamentType = [
    "suspend-type",
    "ban-type",
    "reinstate-type",
  ].includes(operation);

  const usesDuration = [
    "suspend-account",
    "suspend-type",
  ].includes(operation);

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-bold">Player Operations</h2>
        <p className="mt-1 text-sm text-muted">
          Manage account status and tournament-type participation through
          backend operations.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-panel p-4">
        <h3 className="font-semibold">1. Find a player</h3>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchPlayers();
              }
            }}
            placeholder="Name, player ID, email or WhatsApp"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-cyan"
          />

          <button
            type="button"
            onClick={() => void searchPlayers()}
            disabled={loadingPlayers}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:border-cyan disabled:opacity-50"
          >
            {loadingPlayers ? "Searching…" : "Search"}
          </button>
        </div>

        {players.length > 0 && (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Select player
            </span>
            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Choose a player</option>
              {players.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.manager_name} — {player.player_id} (
                  {player.player_status})
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <form
        onSubmit={(event) => void submitOperation(event)}
        className="space-y-4 rounded-xl border border-border bg-panel p-4"
      >
        <h3 className="font-semibold">2. Choose operation</h3>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Operation</span>
          <select
            value={operation}
            onChange={(event) => setOperation(event.target.value as Operation)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="suspend-account">Suspend account temporarily</option>
            <option value="ban-account">Ban account</option>
            <option value="reinstate-account">Reinstate account</option>
            <option value="suspend-type">Suspend in a tournament type</option>
            <option value="ban-type">Ban in a tournament type</option>
            <option value="reinstate-type">Reinstate in a tournament type</option>
          </select>
        </label>

        {usesTournamentType && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Tournament type
            </span>
            <select
              value={tournamentTypeId}
              onChange={(event) => setTournamentTypeId(event.target.value)}
              disabled={loadingTypes}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">
                {loadingTypes ? "Loading types…" : "Choose a tournament type"}
              </option>
              {types.map((type) => (
                <option
                  key={type.tournament_type_id}
                  value={type.tournament_type_id}
                >
                  {type.tournament_type_name} — {type.tournament_type_status}
                </option>
              ))}
            </select>
          </label>
        )}

        {usesDuration && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Duration</span>
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {durations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={3}
            maxLength={2000}
            placeholder="Record the reason for this operation"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-cyan"
          />
        </label>

        {error && (
          <p role="alert" className="break-words text-sm text-coral">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="break-words text-sm text-green">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || loadingTypes}
          className="min-h-11 rounded-lg bg-cyan px-5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {submitting ? "Processing…" : "Confirm operation"}
        </button>

        {result !== null && (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </form>
    </section>
  );
}

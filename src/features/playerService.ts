
import { supabase } from "../lib/supabase";

export const PLAYER_PAGE_SIZE = 50;

export type PlayerStatus = "Active" | "Suspended" | "Banned";

export type PlayerDirectoryItem = {
  player_id: string;
  manager_name: string;
  email_address: string;
  whatsapp_number: string;
  player_status: PlayerStatus;
  created_datetime: string;
  squad_count: number;
  registration_count: number;
};

export type PlayerDirectoryResult = {
  players: PlayerDirectoryItem[];
  total: number;
  limit: number;
  offset: number;
};

export type PlayerDetails = {
  success: boolean;
  code: string;
  player?: Record<string, unknown>;
  squads?: unknown[];
  registrations?: unknown[];
  registration_requests?: unknown[];
  tournament_type_restrictions?: unknown[];
};

type DirectoryRpcResponse = {
  success: boolean;
  code: string;
  total_count?: number;
  limit?: number;
  offset?: number;
  players?: PlayerDirectoryItem[];
};

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function getPlayerDirectory({
  search = "",
  status = "all",
  page = 0,
}: {
  search?: string;
  status?: PlayerStatus | "all";
  page?: number;
} = {}): Promise<PlayerDirectoryResult> {
  const offset = page * PLAYER_PAGE_SIZE;

  const { data, error } = await supabase
    .schema("identity")
    .rpc("admin_list_players", {
      p_search: search.trim() || null,
      p_tournament_id: null,
      p_player_status: status === "all" ? null : status,
      p_limit: PLAYER_PAGE_SIZE,
      p_offset: offset,
    });

  throwIfError(error);

  const result = data as DirectoryRpcResponse | null;

  if (
    !result ||
    result.success !== true ||
    result.code !== "OK" ||
    !Array.isArray(result.players)
  ) {
    throw new Error(
      result?.code === "TOURNAMENT_CONTEXT_REQUIRED"
        ? "Your role requires an assigned tournament context to view player records. Global directory access is not enabled for this role by the current backend."
        : result?.code || "PLAYER_DIRECTORY_UNAVAILABLE",
    );
  }

  return {
    players: result.players,
    total: result.total_count ?? 0,
    limit: result.limit ?? PLAYER_PAGE_SIZE,
    offset: result.offset ?? offset,
  };
}

export async function getPlayerDetails(
  playerId: string,
  tournamentId?: string | null,
): Promise<PlayerDetails> {
  if (!playerId.trim()) {
    throw new Error("A player ID is required.");
  }

  const { data, error } = await supabase
    .schema("identity")
    .rpc("admin_get_player_details", {
      p_player_id: playerId,
      p_tournament_id: tournamentId || null,
    });

  throwIfError(error);

  const result = data as PlayerDetails | null;

  if (
    !result ||
    result.success !== true ||
    result.code !== "OK" ||
    typeof result.player !== "object" ||
    result.player === null ||
    !Array.isArray(result.squads)
  ) {
    throw new Error(
      result?.code || "PLAYER_DETAILS_UNAVAILABLE",
    );
  }

  return result;
}

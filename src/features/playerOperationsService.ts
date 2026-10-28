
import { supabase } from "../lib/supabase";

export type TournamentType = {
  tournament_type_id: string;
  tournament_type_name: string;
  tournament_type_status: string;
};

export type OperationResult = Record<string, unknown>;

function requireResult<T>(data: unknown, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }

  if (data === null || data === undefined) {
    throw new Error("The operation returned no result.");
  }

  return data as T;
}

async function callOperation<T>(
  functionName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase
    .schema("identity")
    .rpc(functionName, args);

  return requireResult<T>(data, error);
}

export async function getTournamentTypes(): Promise<TournamentType[]> {
  const { data, error } = await supabase
    .schema("platform")
    .from("tournament_types")
    .select(
      "tournament_type_id, tournament_type_name, tournament_type_status",
    )
    .order("tournament_type_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TournamentType[];
}

export function suspendPlayerAccount(
  playerId: string,
  duration: string,
  reason: string,
) {
  return callOperation<OperationResult[]>(
    "admin_suspend_player_account",
    {
      p_target_player_id: playerId,
      p_duration: duration,
      p_reason: reason.trim(),
    },
  );
}

export function banPlayerAccount(playerId: string, reason: string) {
  return callOperation<OperationResult[]>(
    "admin_ban_player_account",
    {
      p_target_player_id: playerId,
      p_reason: reason.trim(),
    },
  );
}

export function reinstatePlayer(
  playerId: string,
  scope: "GLOBAL" | "TOURNAMENT_TYPE",
  reason: string,
  tournamentTypeId?: string,
) {
  return callOperation<OperationResult[]>(
    "admin_reinstate_player",
    {
      p_target_player_id: playerId,
      p_scope: scope,
      p_reason: reason.trim(),
      p_tournament_type_id:
        scope === "TOURNAMENT_TYPE" ? tournamentTypeId : null,
    },
  );
}

export function restrictPlayerTournamentType(
  playerId: string,
  tournamentTypeId: string,
  restrictionType: "Suspended" | "Banned",
  reason: string,
  duration?: string,
) {
  return callOperation<OperationResult[]>(
    "admin_restrict_player_tournament_type",
    {
      p_target_player_id: playerId,
      p_tournament_type_id: tournamentTypeId,
      p_restriction_type: restrictionType,
      p_reason: reason.trim(),
      p_duration:
        restrictionType === "Suspended" ? duration : null,
    },
  );
}

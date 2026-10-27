
import { supabase } from "../lib/supabase";

export type TournamentTypeOption = {
  tournament_type_id: string;
  tournament_type_name: string;
  tournament_type_status: string;
};

export type CreatedTournament = {
  tournament_id: string;
  tournament_type_id: string;
  tournament_name: string;
  tournament_status: string;
  registration_open_datetime: string;
  registration_close_datetime: string;
  tournament_start_date: string;
  tournament_end_date: string;
};

export type CreateTournamentInput = {
  tournamentTypeId: string;
  tournamentName: string;
  registrationOpenDatetime: string;
  minimumAge: number;
  registrationFee: number;
  maximumPlayers: number;
};

export async function getTournamentTypeOptions(): Promise<
  TournamentTypeOption[]
> {
  const { data, error } = await supabase
    .schema("platform")
    .from("tournament_types")
    .select(
      "tournament_type_id, tournament_type_name, tournament_type_status",
    )
    .order("tournament_type_name", { ascending: true });

  if (error) {
    throw new Error("Unable to load tournament types.");
  }

  return (data ?? []) as unknown as TournamentTypeOption[];
}

/**
 * datetime-local input is interpreted as a Lagos wall-clock time.
 * Lagos uses UTC+01:00 and does not observe daylight saving time.
 */
function toLagosTimestamp(value: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Enter a valid registration opening date and time.");
  }

  return `${value}:00+01:00`;
}

export async function createTournament(
  input: CreateTournamentInput,
): Promise<CreatedTournament> {
  // Only KT has an implemented creation workflow.
  if (input.tournamentTypeId !== "KT") {
    throw new Error(
      "Creation is not implemented for this tournament type yet.",
    );
  }

  const { data, error } = await supabase
    .schema("kt")
    .rpc("create_kt_tournament", {
      p_tournament_type_id: input.tournamentTypeId,
      p_tournament_name: input.tournamentName.trim(),
      p_registration_open_datetime: toLagosTimestamp(
        input.registrationOpenDatetime,
      ),
      p_minimum_age: input.minimumAge,
      p_registration_fee: input.registrationFee,
      p_maximum_players: input.maximumPlayers,
      // Deliberately omit p_payment_configuration_id.
      // PostgreSQL applies the function's PAY-001 default.
    });

  if (error) {
    const message = error.message ?? "";

    if (message.includes("MINIMUM_AGE_MUST_BE_AT_LEAST_18")) {
      throw new Error("Minimum participant age must be 18 or older.");
    }

    if (message.includes("TOURNAMENT_NAME_REQUIRED")) {
      throw new Error("Enter a tournament name.");
    }

    if (message.includes("REGISTRATION_OPEN_DATETIME_REQUIRED")) {
      throw new Error("Choose when registration opens.");
    }

    if (message.includes("REGISTRATION_FEE_INVALID")) {
      throw new Error("The registration fee must be zero or greater.");
    }

    if (message.includes("MAXIMUM_PLAYERS_INVALID")) {
      throw new Error("Maximum players must be greater than zero.");
    }

    if (
      message.includes("KTMS_AUTHORIZATION_DENIED") ||
      error.code === "42501"
    ) {
      throw new Error(
        "You are not authorized to create a tournament.",
      );
    }

    // Do not expose raw database internals to the UI.
    throw new Error(
      "Tournament creation failed. Review the entered values and try again.",
    );
  }

  const rows = data as unknown as CreatedTournament[] | null;
  const created = Array.isArray(rows) ? rows[0] : undefined;

  if (!created?.tournament_id) {
    throw new Error(
      "The backend did not return the created tournament ID. Verify the directory before retrying.",
    );
  }

  return created;
}

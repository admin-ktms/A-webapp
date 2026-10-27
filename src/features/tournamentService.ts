
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 50;

export type TournamentType = {
  tournament_type_id: string;
  tournament_type_name: string;
  tournament_type_status: string;
};

export type TournamentDirectoryItem = {
  tournament_id: string;
  tournament_name: string | null;
  tournament_type_id: string;
  tournament_status: string;
  registration_open_datetime: string | null;
  registration_close_datetime: string | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
  registration_fee: number | string | null;
  currency: string | null;
  maximum_players: number | null;
  registrationCount: number;
  matchdayCount: number;
  fixtureCount: number;
};

export type TournamentDirectoryData = {
  tournaments: TournamentDirectoryItem[];
  types: TournamentType[];
  total: number;
};

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function countByTournament(
  rows: Array<{ tournament_id: string | null }> | null,
) {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    if (!row.tournament_id) continue;

    counts.set(
      row.tournament_id,
      (counts.get(row.tournament_id) ?? 0) + 1,
    );
  }

  return counts;
}

export async function getTournamentDirectory(
  page = 0,
): Promise<TournamentDirectoryData> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [tournamentResult, typeResult] = await Promise.all([
    supabase
      .schema("kt")
      .from("kt_tournaments")
      .select(
        [
          "tournament_id",
          "tournament_name",
          "tournament_type_id",
          "tournament_status",
          "registration_open_datetime",
          "registration_close_datetime",
          "tournament_start_date",
          "tournament_end_date",
          "registration_fee",
          "currency",
          "maximum_players",
        ].join(", "),
        { count: "exact" },
      )
      .order("created_datetime", { ascending: false })
      .range(from, to),

    supabase
      .schema("platform")
      .from("tournament_types")
      .select(
        "tournament_type_id, tournament_type_name, tournament_type_status",
      )
      .order("tournament_type_name", { ascending: true }),
  ]);

  throwIfError(tournamentResult.error);
  throwIfError(typeResult.error);

  const tournaments = tournamentResult.data ?? [];
  const types = (typeResult.data ?? []) as TournamentType[];

  if (tournaments.length === 0) {
    return {
      tournaments: [],
      types,
      total: tournamentResult.count ?? 0,
    };
  }

  const tournamentIds = tournaments.map(
    (tournament) => tournament.tournament_id,
  );

  const [registrationsResult, matchdaysResult, fixturesResult] =
    await Promise.all([
      supabase
        .schema("kt")
        .from("kt_registrations")
        .select("tournament_id")
        .in("tournament_id", tournamentIds),

      supabase
        .schema("kt")
        .from("kt_matchdays")
        .select("tournament_id")
        .in("tournament_id", tournamentIds),

      supabase
        .schema("kt")
        .from("kt_fixtures")
        .select("tournament_id")
        .in("tournament_id", tournamentIds),
    ]);

  throwIfError(registrationsResult.error);
  throwIfError(matchdaysResult.error);
  throwIfError(fixturesResult.error);

  const registrationCounts = countByTournament(
    registrationsResult.data,
  );
  const matchdayCounts = countByTournament(matchdaysResult.data);
  const fixtureCounts = countByTournament(fixturesResult.data);

  return {
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      tournament_status: tournament.tournament_status ?? "Unknown",
      registrationCount:
        registrationCounts.get(tournament.tournament_id) ?? 0,
      matchdayCount:
        matchdayCounts.get(tournament.tournament_id) ?? 0,
      fixtureCount:
        fixtureCounts.get(tournament.tournament_id) ?? 0,
    })),
    types,
    total: tournamentResult.count ?? tournaments.length,
  };
}

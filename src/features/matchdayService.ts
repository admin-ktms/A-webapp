
import { supabase } from "../lib/supabase";

export type MatchdayStatus =
  | "Scheduled"
  | "Active"
  | "Completed"
  | "Rescheduled"
  | string;

export type MatchdayFixtureSummary = {
  fixtureCount: number;
  completedCount: number;
  pendingCount: number;
  rescheduledCount: number;
  rounds: string[];
};

export type MatchdayItem = {
  matchday_id: string;
  tournament_id: string;
  matchday_number: number | null;
  matchday_name: string | null;
  stage: string | null;
  matchday_status: MatchdayStatus;
  start_datetime: string;
  end_datetime: string;
  fixtureSummary: MatchdayFixtureSummary | null;
};

type AuthorizationRow = {
  is_authorized: boolean;
  decision_code: string;
};

type MatchdayRow = Omit<MatchdayItem, "fixtureSummary">;

type PublicFixtureRow = {
  fixture_id: string;
  tournament_id: string;
  matchday_id: string;
  round_name: string;
  fixture_status: string | null;
  is_rescheduled: boolean | null;
  fixture_archived: boolean | null;
};

async function hasPermission(
  permissionCode: string,
  tournamentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .schema("identity")
    .rpc("evaluate_authorization", {
      p_permission_code: permissionCode,
      p_resource_entity: "tournament",
      p_resource_id: tournamentId,
      p_target_author_id: null,
      p_reason: null,
      p_approval_id: null,
    });

  if (error) throw error;

  const row = (
    Array.isArray(data) ? data[0] : data
  ) as AuthorizationRow | null;

  return row?.is_authorized === true;
}

function emptyFixtureSummary(): MatchdayFixtureSummary {
  return {
    fixtureCount: 0,
    completedCount: 0,
    pendingCount: 0,
    rescheduledCount: 0,
    rounds: [],
  };
}

export async function getTournamentMatchdays(
  tournamentId: string,
): Promise<MatchdayItem[]> {
  if (!tournamentId.trim()) {
    throw new Error("The tournament ID is missing from the URL.");
  }

  const canViewMatchdays = await hasPermission(
    "tournament.view_public",
    tournamentId,
  );

  if (!canViewMatchdays) {
    throw new Error(
      "You are not authorized to view this tournament's matchdays.",
    );
  }

  const { data, error } = await supabase
    .schema("kt")
    .from("kt_matchdays")
    .select(`
      matchday_id,
      tournament_id,
      matchday_number,
      matchday_name,
      stage,
      matchday_status,
      start_datetime,
      end_datetime
    `)
    .eq("tournament_id", tournamentId)
    .order("matchday_number", { ascending: true });

  if (error) throw error;

  const matchdays = (data ?? []) as unknown as MatchdayRow[];

  if (matchdays.length === 0) {
    return [];
  }

  // Fixture information has its own permission.
  const canViewFixtures = await hasPermission(
    "fixture.view",
    tournamentId,
  );

  if (!canViewFixtures) {
    return matchdays.map((matchday) => ({
      ...matchday,
      fixtureSummary: null,
    }));
  }

  const { data: fixtureData, error: fixtureError } =
    await supabase
      .schema("kt")
      .rpc("get_public_fixtures", {
        p_tournament_id: tournamentId,
      });

  if (fixtureError) throw fixtureError;

  const summaries = new Map<
    string,
    MatchdayFixtureSummary
  >();

  for (const matchday of matchdays) {
    summaries.set(
      matchday.matchday_id,
      emptyFixtureSummary(),
    );
  }

  const fixtures = (fixtureData ?? []) as unknown as
    PublicFixtureRow[];

  for (const fixture of fixtures) {
    const summary = summaries.get(fixture.matchday_id);

    if (!summary) continue;

    summary.fixtureCount += 1;

    if (
      fixture.fixture_status === "Official" ||
      fixture.fixture_status === "Walkover"
    ) {
      summary.completedCount += 1;
    } else {
      summary.pendingCount += 1;
    }

    if (fixture.is_rescheduled === true) {
      summary.rescheduledCount += 1;
    }

    if (
      fixture.round_name &&
      !summary.rounds.includes(fixture.round_name)
    ) {
      summary.rounds.push(fixture.round_name);
    }
  }

  return matchdays.map((matchday) => ({
    ...matchday,
    fixtureSummary:
      summaries.get(matchday.matchday_id) ??
      emptyFixtureSummary(),
  }));
}

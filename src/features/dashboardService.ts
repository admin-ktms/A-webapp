
import { supabase } from "../../lib/supabase";

const IN_PROGRESS_STATUSES = [
  "Group Stage",
  "Playoff Stage",
  "Knockout Stage",
] as const;

const ATTENTION_STATUSES = ["Pending", "Disputed"] as const;

export type DashboardSummary = {
  totalTournaments: number;
  inProgressTournaments: number;
  activeMatchdays: number;
  resultsNeedingAttention: number;
};

export type DashboardResultItem = {
  submissionId: string;
  fixtureId: string;
  matchCode: string;
  tournamentId: string;
  tournamentName: string;
  status: string;
  submittedAt: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  results: DashboardResultItem[];
};

type TournamentRow = {
  tournament_id: string;
  tournament_name: string | null;
  tournament_status: string | null;
};

type MatchdayRow = {
  matchday_id: string;
};

type SubmissionRow = {
  submission_id: string;
  fixture_id: string;
  submission_status: string;
  submitted_datetime: string | null;
};

type FixtureRow = {
  fixture_id: string;
  tournament_id: string;
  match_code: string | null;
};

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    tournamentsResult,
    inProgressResult,
    matchdaysResult,
    attentionCountResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .schema("kt")
      .from("kt_tournaments")
      .select("tournament_id", { count: "exact", head: true }),

    supabase
      .schema("kt")
      .from("kt_tournaments")
      .select("tournament_id", { count: "exact", head: true })
      .in("tournament_status", [...IN_PROGRESS_STATUSES]),

    supabase
      .schema("kt")
      .from("kt_matchdays")
      .select("matchday_id", { count: "exact", head: true })
      .eq("matchday_status", "Active"),

    supabase
      .schema("kt")
      .from("kt_match_result_submissions")
      .select("submission_id", { count: "exact", head: true })
      .eq("is_current", true)
      .in("submission_status", [...ATTENTION_STATUSES]),

    supabase
      .schema("kt")
      .from("kt_match_result_submissions")
      .select(
        "submission_id, fixture_id, submission_status, submitted_datetime",
      )
      .eq("is_current", true)
      .in("submission_status", [...ATTENTION_STATUSES])
      .order("submitted_datetime", { ascending: true })
      .limit(6),
  ]);

  throwIfError(tournamentsResult.error);
  throwIfError(inProgressResult.error);
  throwIfError(matchdaysResult.error);
  throwIfError(attentionCountResult.error);
  throwIfError(submissionsResult.error);

  const summary: DashboardSummary = {
    totalTournaments: tournamentsResult.count ?? 0,
    inProgressTournaments: inProgressResult.count ?? 0,
    activeMatchdays: matchdaysResult.count ?? 0,
    resultsNeedingAttention: attentionCountResult.count ?? 0,
  };

  const submissions = (submissionsResult.data ??
    []) as SubmissionRow[];

  if (submissions.length === 0) {
    return { summary, results: [] };
  }

  const fixtureIds = [
    ...new Set(submissions.map((item) => item.fixture_id)),
  ];

  const fixturesResult = await supabase
    .schema("kt")
    .from("kt_fixtures")
    .select("fixture_id, tournament_id, match_code")
    .in("fixture_id", fixtureIds);

  throwIfError(fixturesResult.error);

  const fixtures = (fixturesResult.data ?? []) as FixtureRow[];
  const fixtureById = new Map(
    fixtures.map((fixture) => [fixture.fixture_id, fixture]),
  );

  const tournamentIds = [
    ...new Set(fixtures.map((fixture) => fixture.tournament_id)),
  ];

  let tournaments: TournamentRow[] = [];

  if (tournamentIds.length > 0) {
    const tournamentsResult = await supabase
      .schema("kt")
      .from("kt_tournaments")
      .select("tournament_id, tournament_name, tournament_status")
      .in("tournament_id", tournamentIds);

    throwIfError(tournamentsResult.error);
    tournaments = (tournamentsResult.data ?? []) as TournamentRow[];
  }

  const tournamentById = new Map(
    tournaments.map((tournament) => [
      tournament.tournament_id,
      tournament,
    ]),
  );

  const results: DashboardResultItem[] = submissions.map((submission) => {
    const fixture = fixtureById.get(submission.fixture_id);
    const tournament = fixture
      ? tournamentById.get(fixture.tournament_id)
      : undefined;

    return {
      submissionId: submission.submission_id,
      fixtureId: submission.fixture_id,
      matchCode: fixture?.match_code ?? submission.fixture_id,
      tournamentId: fixture?.tournament_id ?? "",
      tournamentName:
        tournament?.tournament_name ?? "Tournament unavailable",
      status: submission.submission_status,
      submittedAt: submission.submitted_datetime ?? "",
    };
  });

  return { summary, results };
}

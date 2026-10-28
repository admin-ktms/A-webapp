
import { supabase } from "../lib/supabase";

export type SectionStatus =
  | "loading"
  | "ready"
  | "denied"
  | "empty"
  | "error";

export type OverviewSection<T> = {
  status: Exclude<SectionStatus, "loading">;
  data: T | null;
  message?: string;
};

export type TournamentOverview = {
  tournament: OverviewSection<TournamentDetails>;
  matchdays: OverviewSection<CountSummary>;
  registrations: OverviewSection<CountSummary>;
  fixtures: OverviewSection<CountSummary>;
  results: OverviewSection<CountSummary>;
  disputes: OverviewSection<CountSummary>;
};

export type TournamentDetails = {
  tournament_id: string;
  tournament_name: string | null;
  tournament_type_id: string | null;
  tournament_status: string | null;
  registration_open_datetime: string | null;
  registration_close_datetime: string | null;
  registration_fee: number | string | null;
  currency: string;
  maximum_players: number | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
};

export type CountSummary = {
  count: number;
};

type AuthorizationRow = {
  is_authorized: boolean;
  decision_code: string;
};

const emptyOverviewSection = <T,>(
  status: "denied" | "error",
  message: string,
): OverviewSection<T> => ({
  status,
  data: null,
  message,
});

function sectionError<T>(error: unknown): OverviewSection<T> {
  return emptyOverviewSection(
    "error",
    error instanceof Error
      ? error.message
      : "The backend request failed.",
  );
}

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

async function authorizedSection<T>(
  permissionCode: string,
  tournamentId: string,
  load: () => Promise<T>,
  isEmpty: (data: T) => boolean = () => false,
): Promise<OverviewSection<T>> {
  try {
    const allowed = await hasPermission(
      permissionCode,
      tournamentId,
    );

    if (!allowed) {
      return emptyOverviewSection(
        "denied",
        "Access denied for this section.",
      );
    }

    const data = await load();

    return {
      status: isEmpty(data) ? "empty" : "ready",
      data,
      ...(isEmpty(data) ? { message: "No records found." } : {}),
    };
  } catch (error) {
    return sectionError<T>(error);
  }
}

async function getCount(
  table: string,
  tournamentId: string,
  column = "tournament_id",
): Promise<CountSummary> {
  const { count, error } = await supabase
    .schema("kt")
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) throw error;

  return { count: count ?? 0 };
}

async function getResultSubmissionCount(
  tournamentId: string,
): Promise<CountSummary> {
  const { data: fixtures, error: fixtureError } = await supabase
    .schema("kt")
    .from("kt_fixtures")
    .select("fixture_id")
    .eq("tournament_id", tournamentId);

  if (fixtureError) throw fixtureError;

  const fixtureIds = (fixtures ?? []).map(
    (fixture) => fixture.fixture_id as string,
  );

  if (fixtureIds.length === 0) return { count: 0 };

  const { count, error } = await supabase
    .schema("kt")
    .from("kt_match_result_submissions")
    .select("submission_id", { count: "exact", head: true })
    .in("fixture_id", fixtureIds)
    .eq("is_current", true);

  if (error) throw error;

  return { count: count ?? 0 };
}

async function getDisputeCount(
  tournamentId: string,
): Promise<CountSummary> {
  const { data: fixtures, error: fixtureError } = await supabase
    .schema("kt")
    .from("kt_fixtures")
    .select("fixture_id")
    .eq("tournament_id", tournamentId);

  if (fixtureError) throw fixtureError;

  const fixtureIds = (fixtures ?? []).map(
    (fixture) => fixture.fixture_id as string,
  );

  if (fixtureIds.length === 0) return { count: 0 };

  const { count, error } = await supabase
    .schema("kt")
    .from("kt_match_result_submissions")
    .select("submission_id", { count: "exact", head: true })
    .in("fixture_id", fixtureIds)
    .eq("is_current", true)
    .eq("submission_status", "Disputed");

  if (error) throw error;

  return { count: count ?? 0 };
}

export async function getTournamentOverview(
  tournamentId: string,
): Promise<TournamentOverview> {
  const [
    tournament,
    matchdays,
    registrations,
    fixtures,
    results,
    disputes,
  ] = await Promise.all([
    authorizedSection<TournamentDetails>(
      "tournament.view_internal",
      tournamentId,
      async () => {
        const { data, error } = await supabase
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
              "registration_fee",
              "currency",
              "maximum_players",
              "tournament_start_date",
              "tournament_end_date",
            ].join(", "),
          )
          .eq("tournament_id", tournamentId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Tournament record not found.");

        const record = data as unknown as Record<string, unknown>;

        if (
          typeof record.tournament_id !== "string" ||
          !("tournament_name" in record) ||
          !("tournament_type_id" in record) ||
          !("tournament_status" in record)
        ) {
          throw new Error(
            "The tournament query returned an unexpected record shape."
          );
        }
        
        return {
          tournament_id: record.tournament_id,
          tournament_name: record.tournament_name as string | null,
          tournament_type_id: record.tournament_type_id as string | null,
          tournament_status: record.tournament_status as string | null,
          registration_open_datetime:
            record.registration_open_datetime as string | null,
          registration_close_datetime:
            record.registration_close_datetime as string | null,
          registration_fee: record.registration_fee as number | string | null,
          currency: record.currency as string,
          maximum_players: record.maximum_players as number | null,
          tournament_start_date: record.tournament_start_date as string | null,
          tournament_end_date: record.tournament_end_date as string | null,
        };
      },
    ),

    authorizedSection<CountSummary>(
      "tournament.view_public",
      tournamentId,
      () => getCount("kt_matchdays", tournamentId),
      (value) => value.count === 0,
    ),

    authorizedSection<CountSummary>(
      "registration.view_review",
      tournamentId,
      () => getCount("kt_registrations", tournamentId),
      (value) => value.count === 0,
    ),

    authorizedSection<CountSummary>(
      "fixture.view",
      tournamentId,
      async () => {
        const { data, error } = await supabase
          .schema("kt")
          .rpc("get_public_fixtures", {
            p_tournament_id: tournamentId,
          });

        if (error) throw error;

        return { count: Array.isArray(data) ? data.length : 0 };
      },
      (value) => value.count === 0,
    ),

    authorizedSection<CountSummary>(
      "match_result.view_published",
      tournamentId,
      () => getResultSubmissionCount(tournamentId),
      (value) => value.count === 0,
    ),

    authorizedSection<CountSummary>(
      "match_result.dispute.view",
      tournamentId,
      () => getDisputeCount(tournamentId),
      (value) => value.count === 0,
    ),
  ]);

  return {
    tournament,
    matchdays,
    registrations,
    fixtures,
    results,
    disputes,
  };
}

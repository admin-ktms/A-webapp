
import { supabase } from "../lib/supabase";

export type SignedSquadScreenshot = {
  objectPath: string;
  signedUrl: string;
};

type EdgeFunctionScreenshot = {
  object_path: string;
  signed_url: string;
};

type ScreenshotResponse = {
  player_id: string;
  expires_in_seconds: number;
  screenshots: EdgeFunctionScreenshot[];
};

function isScreenshotResponse(value: unknown): value is ScreenshotResponse {
  if (!value || typeof value !== "object") return false;

  const response = value as Record<string, unknown>;

  return (
    typeof response.player_id === "string" &&
    typeof response.expires_in_seconds === "number" &&
    Array.isArray(response.screenshots) &&
    response.screenshots.every((item: unknown) => {
      if (!item || typeof item !== "object") return false;

      const screenshot = item as Record<string, unknown>;

      return (
        typeof screenshot.object_path === "string" &&
        typeof screenshot.signed_url === "string" &&
        screenshot.signed_url.startsWith("https://")
      );
    })
  );
}

export async function getSquadScreenshotUrls(
  playerId: string,
  tournamentId?: string | null,
): Promise<SignedSquadScreenshot[]> {
  if (!playerId.trim()) {
    throw new Error("A player ID is required to load screenshots.");
  }

  const body: {
    player_id: string;
    tournament_id?: string;
  } = {
    player_id: playerId,
  };

  if (tournamentId?.trim()) {
    body.tournament_id = tournamentId.trim();
  }

  const { data, error } = await supabase.functions.invoke(
    "view-squad-screenshot",
    { body },
  );

  if (error) {
    throw new Error(
      "Unable to retrieve squad screenshots. Your session may have expired, access may be restricted, or the screenshot service may be unavailable.",
    );
  }

  if (!isScreenshotResponse(data)) {
    throw new Error("The screenshot service returned an invalid response.");
  }

  if (data.player_id !== playerId) {
    throw new Error("The screenshot service returned an unexpected player.");
  }

  return data.screenshots.map((screenshot) => ({
    objectPath: screenshot.object_path,
    signedUrl: screenshot.signed_url,
  }));
}

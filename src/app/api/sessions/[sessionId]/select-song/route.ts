import { NextResponse } from "next/server";
import type { CreationStatus } from "../../../../../lib/domain/types";
import { getNextStatusAfterSongSelection } from "../../../../../lib/domain/session-state";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";
import { processableTrackSchema } from "../schemas";

function getStatusAfterSongSelection(status: CreationStatus): CreationStatus {
  if (status === "song_selected") return "song_selected";
  return getNextStatusAfterSongSelection(status);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const invalidSessionIdResponse = validateRouteSessionId(sessionId);
  if (invalidSessionIdResponse) return invalidSessionIdResponse;

  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const trackResult = processableTrackSchema.safeParse(
    typeof body === "object" && body !== null && "track" in body
      ? body.track
      : undefined,
  );

  if (!trackResult.success) {
    return NextResponse.json(
      { error: "Track is not processable" },
      { status: 400 },
    );
  }

  let nextStatus: CreationStatus;
  try {
    nextStatus = getStatusAfterSongSelection(session.status);
  } catch {
    return NextResponse.json(
      { error: "Invalid song selection state" },
      { status: 400 },
    );
  }

  const nextSession = await sessions.update(sessionId, {
    status: nextStatus,
    selectedSong: { type: "soundcloud", track: trackResult.data },
  });

  return NextResponse.json({ session: nextSession });
}

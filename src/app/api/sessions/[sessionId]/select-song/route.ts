import { NextResponse } from "next/server";
import type { NormalizedTrack } from "@/lib/domain/types";
import { getNextStatusAfterSongSelection } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = (await request.json()) as { track?: NormalizedTrack };

  if (!body.track?.processability.processable) {
    return NextResponse.json(
      { error: "Track is not processable" },
      { status: 400 },
    );
  }

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterSongSelection(session.status),
    selectedSong: { type: "soundcloud", track: body.track },
  });

  return NextResponse.json({ session: nextSession });
}

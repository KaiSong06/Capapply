import { NextResponse } from "next/server";
import type { CreationStatus } from "../../../../../lib/domain/types";
import { getNextStatusAfterSongSelection } from "../../../../../lib/domain/session-state";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

function getStatusAfterUploadTrack(status: CreationStatus): CreationStatus {
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

  const { sessions, artifacts } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
  }

  let nextStatus: CreationStatus;
  try {
    nextStatus = getStatusAfterUploadTrack(session.status);
  } catch {
    return NextResponse.json(
      { error: "Invalid upload track state" },
      { status: 400 },
    );
  }

  const artifact = await artifacts.putBuffer(sessionId, {
    kind: "uploaded_track",
    filename: file.name,
    contentType: file.type || "audio/mpeg",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  const nextSession = await sessions.update(sessionId, {
    status: nextStatus,
    artifacts: [
      ...session.artifacts.filter((item) => item.kind !== "uploaded_track"),
      artifact,
    ],
    selectedSong: { type: "upload", artifact, title: file.name },
  });

  return NextResponse.json({ session: nextSession });
}

import { NextResponse } from "next/server";
import { getNextStatusAfterSongSelection } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
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

  const artifact = await artifacts.putBuffer(sessionId, {
    kind: "uploaded_track",
    filename: file.name,
    contentType: file.type || "audio/mpeg",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterSongSelection(session.status),
    artifacts: [...session.artifacts, artifact],
    selectedSong: { type: "upload", artifact, title: file.name },
  });

  return NextResponse.json({ session: nextSession });
}

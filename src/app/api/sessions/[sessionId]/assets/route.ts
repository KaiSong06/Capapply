import { NextResponse } from "next/server";
import type { ArtifactKind } from "@/lib/domain/types";
import { getNextStatusAfterAssetUpload } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

const allowedKinds = new Set<ArtifactKind>([
  "resume",
  "voice_sample",
  "face_media",
]);

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
  const kind = String(form.get("kind")) as ArtifactKind;
  const file = form.get("file");

  if (!allowedKinds.has(kind) || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid asset upload" }, { status: 400 });
  }

  const artifact = await artifacts.putBuffer(sessionId, {
    kind,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterAssetUpload(session.status),
    artifacts: [
      ...session.artifacts.filter((item) => item.kind !== kind),
      artifact,
    ],
  });

  return NextResponse.json({ session: nextSession });
}

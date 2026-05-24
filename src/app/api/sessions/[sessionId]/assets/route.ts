import { NextResponse } from "next/server";
import { getNextStatusAfterAssetUpload } from "../../../../../lib/domain/session-state";
import type {
  ArtifactKind,
  CreationStatus,
} from "../../../../../lib/domain/types";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

const allowedKinds = new Set<ArtifactKind>([
  "resume",
  "voice_sample",
  "face_media",
]);
const invalidAssetUploadState = new Error("Invalid asset upload state");

function getStatusAfterAssetUpload(status: CreationStatus): CreationStatus {
  if (status === "assets_ready") return "assets_ready";
  return getNextStatusAfterAssetUpload(status);
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "type" in value &&
    typeof value.type === "string" &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
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
  const kind = String(form.get("kind")) as ArtifactKind;
  const file = form.get("file");

  if (!allowedKinds.has(kind) || !isUploadFile(file)) {
    return NextResponse.json({ error: "Invalid asset upload" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const nextSession = await sessions.updateWith(sessionId, async (current) => {
      let nextStatus: CreationStatus;

      try {
        nextStatus = getStatusAfterAssetUpload(current.status);
      } catch {
        throw invalidAssetUploadState;
      }

      const artifact = await artifacts.putBuffer(sessionId, {
        kind,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        buffer,
      });

      return {
        status: nextStatus,
        artifacts: [
          ...current.artifacts.filter((item) => item.kind !== kind),
          artifact,
        ],
      };
    });

    return NextResponse.json({ session: nextSession });
  } catch (error) {
    if (error === invalidAssetUploadState) {
      return NextResponse.json(
        { error: "Invalid asset upload state" },
        { status: 400 },
      );
    }

    throw error;
  }
}

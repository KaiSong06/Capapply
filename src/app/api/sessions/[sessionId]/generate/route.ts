import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { demoOutputFilename } from "../../../../../lib/demo/demo-content";
import type { ArtifactRef } from "../../../../../lib/domain/types";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

const demoVideoPath = path.join(process.cwd(), "public", demoOutputFilename);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Generation failed";
}

async function assertDemoVideoExists() {
  try {
    await stat(demoVideoPath);
  } catch {
    throw new Error(`Demo output video missing at public/${demoOutputFilename}`);
  }
}

function createDemoFinalVideoArtifact(): ArtifactRef {
  return {
    id: "demo-output-video",
    kind: "final_video",
    filename: demoOutputFilename,
    contentType: "video/mp4",
    path: demoVideoPath,
    createdAt: new Date().toISOString(),
  };
}

export async function POST(
  _request: Request,
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

  try {
    const nextSession = await sessions.updateWith(session.id, async (latest) => {
      if (latest.status !== "song_selected") {
        throw new Error(
          `Generation requires song_selected status, received ${latest.status}`,
        );
      }

      await assertDemoVideoExists();
      const finalVideo = createDemoFinalVideoArtifact();

      return {
        status: "ready",
        generationStep: "complete",
        artifacts: [
          ...latest.artifacts.filter((artifact) => artifact.kind !== "final_video"),
          finalVideo,
        ],
        finalVideo,
        error: null,
      };
    });

    return NextResponse.json({ session: nextSession });
  } catch (error) {
    const latestSession = await sessions.get(sessionId);
    const message = getErrorMessage(error);
    const status = message.startsWith("Generation requires song_selected")
      ? 400
      : 500;

    return NextResponse.json(
      latestSession
        ? { session: latestSession, error: message }
        : { error: message },
      { status },
    );
  }
}

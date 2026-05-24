import { NextResponse } from "next/server";
import { runGeneration } from "../../../../../lib/generation/orchestrator";
import { createGenerationProviders } from "../../../../../lib/generation/providers";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Generation failed";
}

export async function POST(
  _request: Request,
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

  try {
    const nextSession = await runGeneration({
      session,
      sessions,
      artifacts,
      providers: createGenerationProviders(),
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

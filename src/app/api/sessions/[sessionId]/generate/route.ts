import { NextResponse } from "next/server";
import { readEnv } from "@/lib/config/env";
import { createHardwareController } from "@/lib/hardware/create-controller";
import { runGeneration } from "@/lib/generation/orchestrator";
import { createGenerationProviders } from "@/lib/generation/providers";
import { getStores } from "@/lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const invalid = validateRouteSessionId(sessionId);
  if (invalid) {
    return invalid;
  }

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
      hardware: createHardwareController(readEnv()),
    });

    return NextResponse.json({ session: nextSession });
  } catch {
    const failedSession = await sessions.get(sessionId);
    return NextResponse.json(
      { session: failedSession, error: failedSession?.error?.message ?? "Generation failed" },
      { status: 500 },
    );
  }
}

import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const invalidSessionIdResponse = validateRouteSessionId(sessionId);
  if (invalidSessionIdResponse) return invalidSessionIdResponse;

  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session?.finalVideo) {
    return NextResponse.json(
      { error: "Final audio not ready" },
      { status: 404 },
    );
  }

  const bytes = await readFile(session.finalVideo.path);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": session.finalVideo.contentType,
      "Content-Disposition": `attachment; filename="${session.finalVideo.filename}"`,
    },
  });
}

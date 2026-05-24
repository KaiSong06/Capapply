import { NextResponse } from "next/server";
import type { NormalizedJob } from "@/lib/domain/types";
import { getNextStatusAfterJobSelection } from "@/lib/domain/session-state";
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

  const body = (await request.json()) as { job?: NormalizedJob };

  if (!body.job?.id || !body.job.title || !body.job.boardToken) {
    return NextResponse.json({ error: "Invalid job selection" }, { status: 400 });
  }

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterJobSelection(session.status),
    selectedCompany: {
      company: body.job.company,
      boardToken: body.job.boardToken,
    },
    selectedJob: body.job,
  });

  return NextResponse.json({ session: nextSession });
}

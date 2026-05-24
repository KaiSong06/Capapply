import { NextResponse } from "next/server";
import type { CreationStatus } from "../../../../../lib/domain/types";
import { getNextStatusAfterJobSelection } from "../../../../../lib/domain/session-state";
import { getStores } from "../../../../../lib/server/stores";
import { validateRouteSessionId } from "../route-helpers";
import { normalizedJobSchema } from "../schemas";

function getStatusAfterJobSelection(status: CreationStatus): CreationStatus {
  if (status === "job_selected") return "job_selected";
  return getNextStatusAfterJobSelection(status);
}

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const jobResult = normalizedJobSchema.safeParse(
    typeof body === "object" && body !== null && "job" in body
      ? body.job
      : undefined,
  );

  if (!jobResult.success) {
    return NextResponse.json({ error: "Invalid job selection" }, { status: 400 });
  }

  let nextStatus: CreationStatus;
  try {
    nextStatus = getStatusAfterJobSelection(session.status);
  } catch {
    return NextResponse.json(
      { error: "Invalid job selection state" },
      { status: 400 },
    );
  }

  const nextSession = await sessions.update(sessionId, {
    status: nextStatus,
    selectedCompany: {
      company: jobResult.data.company,
      boardToken: jobResult.data.boardToken,
    },
    selectedJob: jobResult.data,
  });

  return NextResponse.json({ session: nextSession });
}

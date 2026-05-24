import { NextResponse } from "next/server";
import { assertSafeSessionId } from "../../../../lib/storage/sessions";

export function validateRouteSessionId(sessionId: string): NextResponse | null {
  try {
    assertSafeSessionId(sessionId);
    return null;
  } catch {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }
}

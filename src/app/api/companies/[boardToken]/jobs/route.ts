import { NextResponse } from "next/server";
import { demoStripeInternshipJobs } from "../../../../../lib/demo/demo-content";
import { findCompanyByBoardToken } from "../../../../../lib/config/companies";

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardToken: string }> },
) {
  const { boardToken } = await context.params;
  const company = findCompanyByBoardToken(boardToken);

  if (!company) {
    return NextResponse.json({ error: "Unknown company" }, { status: 404 });
  }

  return NextResponse.json({ jobs: demoStripeInternshipJobs });
}

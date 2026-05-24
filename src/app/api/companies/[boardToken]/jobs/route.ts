import { NextResponse } from "next/server";
import { fetchGreenhouseJobs } from "../../../../../lib/adapters/greenhouse";
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

  try {
    const jobs = await fetchGreenhouseJobs(company);
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: "Unable to fetch jobs" }, { status: 502 });
  }
}

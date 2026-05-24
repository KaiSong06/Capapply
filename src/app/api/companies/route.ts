import { NextResponse } from "next/server";
import { curatedCompanies } from "@/lib/config/companies";

export async function GET() {
  return NextResponse.json({ companies: curatedCompanies });
}

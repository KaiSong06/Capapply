import { NextResponse } from "next/server";
import { getStores } from "@/lib/server/stores";

export async function POST() {
  const { sessions } = getStores();
  const session = await sessions.create();

  return NextResponse.json({ session }, { status: 201 });
}

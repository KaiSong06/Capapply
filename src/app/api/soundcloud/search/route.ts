import { NextResponse } from "next/server";
import { searchSoundCloudTracks } from "../../../../lib/adapters/soundcloud";
import { readEnv } from "../../../../lib/config/env";

export async function GET(request: Request) {
  try {
    const env = readEnv();
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    const tracks = await searchSoundCloudTracks({
      query,
      searchUrl: env.SOUNDCLOUD_SEARCH_URL,
      rapidApiKey: env.RAPIDAPI_KEY,
      rapidApiHost: env.SOUNDCLOUD_RAPIDAPI_HOST,
    });

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ error: "Unable to search SoundCloud" }, { status: 502 });
  }
}

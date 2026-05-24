import { z } from "zod";
import type { NormalizedTrack, TrackProcessability } from "@/lib/domain/types";

const rawTrackSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().default("Untitled track"),
  user: z.object({ username: z.string().optional() }).optional(),
  duration: z.number().nullable().optional(),
  artwork_url: z.string().nullable().optional(),
  permalink_url: z.string().optional(),
  downloadable: z.boolean().optional(),
  download_url: z.string().nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
});

const searchResponseSchema = z.union([
  z.object({ collection: z.array(rawTrackSchema) }),
  z.array(rawTrackSchema),
]);

function getCollection(payload: unknown): z.infer<typeof rawTrackSchema>[] {
  const parsed = searchResponseSchema.parse(payload);
  return Array.isArray(parsed) ? parsed : parsed.collection;
}

function getProcessability(track: z.infer<typeof rawTrackSchema>): TrackProcessability {
  const downloadUrl = track.download_url ?? track.downloadUrl ?? null;

  if (track.downloadable === true && downloadUrl) {
    return { processable: true, reason: "downloadable", audioUrl: downloadUrl };
  }

  if (downloadUrl) {
    return { processable: true, reason: "direct_audio_url", audioUrl: downloadUrl };
  }

  return { processable: false, reason: "not_permitted", audioUrl: null };
}

export function normalizeSoundCloudSearch(payload: unknown): NormalizedTrack[] {
  return getCollection(payload).map((track) => ({
    id: String(track.id),
    title: track.title,
    artist: track.user?.username ?? "Unknown artist",
    durationMs: track.duration ?? null,
    artworkUrl: track.artwork_url ?? null,
    sourceUrl: track.permalink_url ?? "",
    processability: getProcessability(track),
  }));
}

export async function searchSoundCloudTracks(input: {
  query: string;
  searchUrl: string;
  rapidApiKey?: string;
  rapidApiHost: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedTrack[]> {
  if (!input.query.trim()) return [];

  const fetcher = input.fetchImpl ?? fetch;
  const url = new URL(input.searchUrl);
  url.searchParams.set("q", input.query);

  const response = await fetcher(url, {
    headers: {
      "x-rapidapi-key": input.rapidApiKey ?? "",
      "x-rapidapi-host": input.rapidApiHost,
    },
  });

  if (!response.ok) {
    throw new Error(`SoundCloud search failed: ${response.status}`);
  }

  return normalizeSoundCloudSearch(await response.json());
}

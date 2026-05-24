import { z } from "zod";

export const normalizedJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  boardToken: z.string(),
  location: z.string(),
  content: z.string(),
  absoluteUrl: z.string(),
  updatedAt: z.string().nullable(),
});

export const processableTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  durationMs: z.number().nullable(),
  artworkUrl: z.string().nullable(),
  sourceUrl: z.string(),
  processability: z.object({
    processable: z.literal(true),
    reason: z.enum(["downloadable", "direct_audio_url"]),
    audioUrl: z.string().min(1).url(),
  }),
});

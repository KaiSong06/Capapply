import { z } from "zod";

const requiredString = z.string().min(1);

export const normalizedJobSchema = z.object({
  id: requiredString,
  title: requiredString,
  company: requiredString,
  boardToken: requiredString,
  location: requiredString,
  content: requiredString,
  absoluteUrl: requiredString,
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

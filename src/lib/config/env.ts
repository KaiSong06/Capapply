import { z } from "zod";

const envSchema = z.object({
  ARTIFACT_ROOT: z.string().default("var/capapply"),
  MEDIA_PROVIDER_MODE: z.enum(["mock", "real"]).default("mock"),
  RAPIDAPI_KEY: z.string().optional(),
  SOUNDCLOUD_SEARCH_URL: z
    .string()
    .url()
    .default("https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks"),
  SOUNDCLOUD_RAPIDAPI_HOST: z.string().default("soundcloud-scraper.p.rapidapi.com"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  LYRICS_API_URL: z.string().url().optional(),
  LYRICS_API_KEY: z.string().optional(),
  SOURCE_SEPARATION_URL: z.string().url().optional(),
  SOURCE_SEPARATION_API_KEY: z.string().optional(),
  LIPSYNC_CREATE_URL: z.string().url().optional(),
  LIPSYNC_STATUS_URL: z.string().url().optional(),
  LIPSYNC_API_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const env = envSchema.parse(raw);

  if (env.MEDIA_PROVIDER_MODE === "real") {
    const missing = [
      ["RAPIDAPI_KEY", env.RAPIDAPI_KEY],
      ["ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY],
      ["ELEVENLABS_VOICE_ID", env.ELEVENLABS_VOICE_ID],
      ["LYRICS_API_URL", env.LYRICS_API_URL],
      ["SOURCE_SEPARATION_URL", env.SOURCE_SEPARATION_URL],
      ["LIPSYNC_CREATE_URL", env.LIPSYNC_CREATE_URL],
      ["LIPSYNC_STATUS_URL", env.LIPSYNC_STATUS_URL],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new Error(`Missing real media provider env: ${missing.map(([key]) => key).join(", ")}`);
    }
  }

  return env;
}

import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

const envSchema = z.object({
  ARTIFACT_ROOT: z.string().default("var/capapply"),
  MEDIA_PROVIDER_MODE: z.enum(["mock", "real"]).default("mock"),
  ELEVENLABS_AUDIO_MODE: z.enum(["mock", "real"]).default("mock"),
  RAPIDAPI_KEY: optionalString,
  SOUNDCLOUD_SEARCH_URL: z
    .string()
    .url()
    .default("https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks"),
  SOUNDCLOUD_RAPIDAPI_HOST: z.string().default("soundcloud-scraper.p.rapidapi.com"),
  ELEVENLABS_API_KEY: optionalString,
  ELEVENLABS_VOICE_ID: optionalString,
  LYRICS_API_URL: optionalUrl,
  LYRICS_API_KEY: optionalString,
  SOURCE_SEPARATION_URL: optionalUrl,
  SOURCE_SEPARATION_API_KEY: optionalString,
  LIPSYNC_CREATE_URL: optionalUrl,
  LIPSYNC_STATUS_URL: optionalUrl,
  LIPSYNC_API_KEY: optionalString,
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

  if (env.ELEVENLABS_AUDIO_MODE === "real") {
    const missing = [
      ["ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY],
      ["ELEVENLABS_VOICE_ID", env.ELEVENLABS_VOICE_ID],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new Error(
        `Missing ElevenLabs audio env: ${missing.map(([key]) => key).join(", ")}`,
      );
    }
  }

  return env;
}

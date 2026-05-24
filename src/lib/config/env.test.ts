import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

describe("readEnv", () => {
  it("treats blank optional URL values as missing in mock mode", () => {
    const env = readEnv({
      MEDIA_PROVIDER_MODE: "mock",
      LYRICS_API_URL: "",
      LIPSYNC_CREATE_URL: "",
    });

    expect(env.LYRICS_API_URL).toBeUndefined();
    expect(env.LIPSYNC_CREATE_URL).toBeUndefined();
  });

  it("requires real provider environment when media provider mode is real", () => {
    expect(() => readEnv({ MEDIA_PROVIDER_MODE: "real" })).toThrow(
      "Missing real media provider env",
    );
  });

  it("allows mock media mode to use real ElevenLabs audio only", () => {
    const env = readEnv({
      MEDIA_PROVIDER_MODE: "mock",
      ELEVENLABS_AUDIO_MODE: "real",
      ELEVENLABS_API_KEY: "elevenlabs-key",
      ELEVENLABS_VOICE_ID: "voice-id",
    });

    expect(env.MEDIA_PROVIDER_MODE).toBe("mock");
    expect(env.ELEVENLABS_AUDIO_MODE).toBe("real");
  });

  it("requires ElevenLabs credentials when real audio mode is enabled", () => {
    expect(() =>
      readEnv({
        MEDIA_PROVIDER_MODE: "mock",
        ELEVENLABS_AUDIO_MODE: "real",
      }),
    ).toThrow("Missing ElevenLabs audio env");
  });
});

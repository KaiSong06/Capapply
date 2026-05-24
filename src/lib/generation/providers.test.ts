import { afterEach, describe, expect, it, vi } from "vitest";
import { createGenerationProviders } from "./providers";

describe("createGenerationProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses mock providers by default", () => {
    vi.stubEnv("MEDIA_PROVIDER_MODE", "mock");

    const providers = createGenerationProviders();

    expect(providers.generateLyrics).toBeTypeOf("function");
  });

  it("wires real providers when real mode env is complete", () => {
    vi.stubEnv("MEDIA_PROVIDER_MODE", "real");
    vi.stubEnv("RAPIDAPI_KEY", "rapidapi-key");
    vi.stubEnv("ELEVENLABS_API_KEY", "elevenlabs-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voice-id");
    vi.stubEnv("LYRICS_API_URL", "https://providers.example.com/lyrics");
    vi.stubEnv(
      "SOURCE_SEPARATION_URL",
      "https://providers.example.com/separate",
    );
    vi.stubEnv("LIPSYNC_CREATE_URL", "https://providers.example.com/lipsync");
    vi.stubEnv(
      "LIPSYNC_STATUS_URL",
      "https://providers.example.com/lipsync/{id}",
    );

    const providers = createGenerationProviders();

    expect(providers.generateLyrics).toBeTypeOf("function");
    expect(providers.convertVoice).toBeTypeOf("function");
  });
});

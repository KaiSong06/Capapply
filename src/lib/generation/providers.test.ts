import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreationSession } from "../domain/types";
import { createArtifactStore } from "../storage/artifacts";
import { createGenerationProviders } from "./providers";

describe("createGenerationProviders", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "capapply-providers-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
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

  it("uses ElevenLabs for vocal audio while keeping mock media providers", async () => {
    vi.stubEnv("MEDIA_PROVIDER_MODE", "mock");
    vi.stubEnv("ELEVENLABS_AUDIO_MODE", "real");
    vi.stubEnv("ELEVENLABS_API_KEY", "elevenlabs-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voice-id");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("mp3 audio"), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = {
      id: "00000000-0000-4000-8000-000000000001",
    } as CreationSession;
    const artifacts = createArtifactStore(root);
    const providers = createGenerationProviders();

    const guideVocal = await providers.createGuideVocal(
      session,
      "Hire me",
      artifacts,
    );
    const convertedVocal = await providers.convertVoice(
      session,
      guideVocal,
      artifacts,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/text-to-speech/voice-id");
    expect(guideVocal).toMatchObject({
      kind: "guide_vocal",
      filename: "guide-vocal.mp3",
      contentType: "audio/mpeg",
    });
    expect(convertedVocal).toMatchObject({
      kind: "converted_vocal",
      filename: "converted-vocal.mp3",
      contentType: "audio/mpeg",
    });
    await expect(readFile(convertedVocal.path, "utf8")).resolves.toBe(
      "mp3 audio",
    );
  });
});

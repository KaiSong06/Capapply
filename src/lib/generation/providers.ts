import { readEnv } from "../config/env";
import type { GenerationProviders } from "./contracts";
import { createMockProviders } from "./mock-providers";
import {
  convertVoiceWithElevenLabs,
  createGuideVocalWithElevenLabs,
} from "./providers/elevenlabs-voice-conversion";
import { generateLyricsWithHttp } from "./providers/http-lyrics";
import { createLipSyncVideoWithHttp } from "./providers/http-lipsync";
import { separateInstrumentalWithHttp } from "./providers/http-source-separation";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing real media provider env: ${name}`);
  }

  return value;
}

export function createGenerationProviders(): GenerationProviders {
  const env = readEnv();

  if (env.MEDIA_PROVIDER_MODE === "mock") {
    return createMockProviders();
  }

  const mockProviders = createMockProviders();

  return {
    async generateLyrics(session) {
      return generateLyricsWithHttp({
        session,
        url: requireEnv("LYRICS_API_URL", env.LYRICS_API_URL),
        apiKey: env.LYRICS_API_KEY,
      });
    },

    async separateInstrumental(session, artifacts) {
      return separateInstrumentalWithHttp({
        session,
        artifacts,
        url: requireEnv("SOURCE_SEPARATION_URL", env.SOURCE_SEPARATION_URL),
        apiKey: env.SOURCE_SEPARATION_API_KEY,
      });
    },

    async createGuideVocal(session, lyrics, artifacts) {
      return createGuideVocalWithElevenLabs({
        session,
        lyrics,
        artifacts,
        apiKey: requireEnv("ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY),
        voiceId: requireEnv("ELEVENLABS_VOICE_ID", env.ELEVENLABS_VOICE_ID),
      });
    },

    async convertVoice(session, guideVocal, artifacts) {
      return convertVoiceWithElevenLabs({
        session,
        guideVocal,
        artifacts,
        apiKey: requireEnv("ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY),
        voiceId: requireEnv("ELEVENLABS_VOICE_ID", env.ELEVENLABS_VOICE_ID),
      });
    },

    async createLipSyncVideo(session, convertedVocal, artifacts) {
      return createLipSyncVideoWithHttp({
        session,
        convertedVocal,
        artifacts,
        createUrl: requireEnv("LIPSYNC_CREATE_URL", env.LIPSYNC_CREATE_URL),
        statusUrl: requireEnv("LIPSYNC_STATUS_URL", env.LIPSYNC_STATUS_URL),
        apiKey: env.LIPSYNC_API_KEY,
      });
    },

    async renderFinalVideo(session, lipSyncVideo, convertedVocal, artifacts) {
      return mockProviders.renderFinalVideo(
        session,
        lipSyncVideo,
        convertedVocal,
        artifacts,
      );
    },
  };
}

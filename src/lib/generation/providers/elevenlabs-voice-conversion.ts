import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

const elevenLabsBaseUrl = "https://api.elevenlabs.io/v1";

function elevenLabsHeaders(apiKey: string, contentType?: string): HeadersInit {
  return {
    "xi-api-key": apiKey,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export async function createGuideVocalWithElevenLabs(input: {
  session: CreationSession;
  lyrics: string;
  artifacts: ArtifactStore;
  apiKey: string;
  voiceId: string;
}): Promise<ArtifactRef> {
  const response = await fetch(
    `${elevenLabsBaseUrl}/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: elevenLabsHeaders(input.apiKey, "application/json"),
      body: JSON.stringify({
        text: input.lyrics,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs guide vocal failed: ${response.status}`);
  }

  return input.artifacts.putBuffer(input.session.id, {
    kind: "guide_vocal",
    filename: "guide-vocal.mp3",
    contentType: "audio/mpeg",
    buffer: Buffer.from(await response.arrayBuffer()),
  });
}

export async function convertVoiceWithElevenLabs(input: {
  session: CreationSession;
  guideVocal: ArtifactRef;
  artifacts: ArtifactStore;
  apiKey: string;
  voiceId: string;
}): Promise<ArtifactRef> {
  const guideVocalBuffer = await readFile(input.guideVocal.path);
  const form = new FormData();
  form.set(
    "audio",
    new Blob([new Uint8Array(guideVocalBuffer)], {
      type: input.guideVocal.contentType,
    }),
    input.guideVocal.filename,
  );
  form.set("model_id", "eleven_multilingual_sts_v2");
  form.set("remove_background_noise", "true");

  const response = await fetch(
    `${elevenLabsBaseUrl}/speech-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: elevenLabsHeaders(input.apiKey),
      body: form,
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs voice conversion failed: ${response.status}`);
  }

  return input.artifacts.putBuffer(input.session.id, {
    kind: "converted_vocal",
    filename: "converted-vocal.mp3",
    contentType: "audio/mpeg",
    buffer: Buffer.from(await response.arrayBuffer()),
  });
}

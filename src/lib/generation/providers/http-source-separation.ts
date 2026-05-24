import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

type AudioSource = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

function headerWithApiKey(apiKey?: string): HeadersInit | undefined {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
}

async function fetchAudioUrl(url: string, filename: string): Promise<AudioSource> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Audio source download failed: ${response.status}`);
  }

  return {
    filename,
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

async function getSelectedAudio(session: CreationSession): Promise<AudioSource> {
  const selectedSong = session.selectedSong;

  if (!selectedSong) {
    throw new Error("A selected song is required for source separation");
  }

  if (selectedSong.type === "upload") {
    return {
      filename: selectedSong.artifact.filename,
      contentType: selectedSong.artifact.contentType,
      buffer: await readFile(selectedSong.artifact.path),
    };
  }

  const audioUrl = selectedSong.track.processability.audioUrl;
  if (!audioUrl) {
    throw new Error("Selected SoundCloud track has no processable audio URL");
  }

  return fetchAudioUrl(audioUrl, `${selectedSong.track.id}.mp3`);
}

async function readInstrumentalResponse(response: Response): Promise<{
  contentType: string;
  buffer: Buffer;
}> {
  const contentType = response.headers.get("content-type") ?? "audio/wav";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      instrumentalUrl?: string;
      instrumental_url?: string;
      audioUrl?: string;
      audio_url?: string;
    };
    const audioUrl =
      payload.instrumentalUrl ??
      payload.instrumental_url ??
      payload.audioUrl ??
      payload.audio_url;

    if (!audioUrl) {
      throw new Error("Source separation provider did not return audio bytes or URL");
    }

    const audio = await fetchAudioUrl(audioUrl, "instrumental.wav");
    return {
      contentType: audio.contentType,
      buffer: audio.buffer,
    };
  }

  return {
    contentType,
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

export async function separateInstrumentalWithHttp(input: {
  session: CreationSession;
  artifacts: ArtifactStore;
  url: string;
  apiKey?: string;
}): Promise<ArtifactRef> {
  const source = await getSelectedAudio(input.session);
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(source.buffer)], { type: source.contentType }),
    source.filename,
  );

  const response = await fetch(input.url, {
    method: "POST",
    headers: headerWithApiKey(input.apiKey),
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Source separation provider failed: ${response.status}`);
  }

  const instrumental = await readInstrumentalResponse(response);

  return input.artifacts.putBuffer(input.session.id, {
    kind: "instrumental_track",
    filename: "instrumental.wav",
    contentType: instrumental.contentType,
    buffer: instrumental.buffer,
  });
}

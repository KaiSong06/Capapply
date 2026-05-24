import type {
  ArtifactRef,
  CreationSession,
  GenerationStep,
} from "../domain/types";
import type { createSessionStore } from "../storage/sessions";
import type { HardwareController } from "../hardware/contracts";
import { resolvePlaybackArtifact } from "../hardware/contracts";
import type { ArtifactStore, GenerationProviders } from "./contracts";

type SessionStore = ReturnType<typeof createSessionStore>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Generation failed";
}

export async function runGeneration(input: {
  session: CreationSession;
  sessions: SessionStore;
  artifacts: ArtifactStore;
  providers: GenerationProviders;
  hardware: HardwareController;
}): Promise<CreationSession> {
  const { session, sessions, artifacts, providers, hardware } = input;

  let current = await sessions.updateWith(session.id, (latest) => {
    if (latest.status !== "song_selected") {
      throw new Error(
        `Generation requires song_selected status, received ${latest.status}`,
      );
    }

    return {
      status: "generating",
      generationStep: "writing_lyrics",
      error: null,
    };
  });

  const appendArtifacts = (
    sessionId: string,
    newArtifacts: ArtifactRef[],
    generationStep: GenerationStep,
  ) =>
    sessions.updateWith(sessionId, (latest) => ({
      artifacts: [...latest.artifacts, ...newArtifacts],
      generationStep,
    }));

  try {
    const lyricResult = await providers.generateLyrics(current);
    const briefArtifact = await artifacts.putBuffer(current.id, {
      kind: "parody_brief",
      filename: "parody-brief.txt",
      contentType: "text/plain",
      buffer: Buffer.from(lyricResult.brief),
    });
    const lyricsArtifact = await artifacts.putBuffer(current.id, {
      kind: "lyrics",
      filename: "lyrics.txt",
      contentType: "text/plain",
      buffer: Buffer.from(lyricResult.lyrics),
    });

    current = await appendArtifacts(
      current.id,
      [briefArtifact, lyricsArtifact],
      "separating_instrumental",
    );

    const instrumental = await providers.separateInstrumental(
      current,
      artifacts,
    );
    current = await appendArtifacts(
      current.id,
      [instrumental],
      "creating_guide_vocal",
    );

    const guideVocal = await providers.createGuideVocal(
      current,
      lyricResult.lyrics,
      artifacts,
    );
    current = await appendArtifacts(
      current.id,
      [guideVocal],
      "converting_voice",
    );

    const convertedVocal = await providers.convertVoice(
      current,
      guideVocal,
      artifacts,
    );
    current = await appendArtifacts(
      current.id,
      [convertedVocal],
      "creating_lipsync_video",
    );

    const lipSyncVideo = await providers.createLipSyncVideo(
      current,
      convertedVocal,
      artifacts,
    );
    current = await appendArtifacts(
      current.id,
      [lipSyncVideo],
      "rendering_final_video",
    );

    const finalVideo = await providers.renderFinalVideo(
      current,
      lipSyncVideo,
      convertedVocal,
      artifacts,
    );
    current = await appendArtifacts(
      current.id,
      [finalVideo],
      "playing_on_device",
    );

    const playbackArtifact = resolvePlaybackArtifact(
      current,
      current.artifacts,
    );
    if (!playbackArtifact) {
      throw new Error("No audio artifact available for device playback");
    }

    await hardware.playSong({
      sessionId: current.id,
      artifact: playbackArtifact,
    });

    current = await sessions.updateWith(current.id, (latest) => ({
      generationStep: "moving_motor",
    }));

    await hardware.moveMotor();

    return sessions.updateWith(current.id, (latest) => ({
      status: "ready",
      generationStep: "complete",
      finalVideo,
      error: null,
    }));
  } catch (error) {
    await sessions.updateWith(current.id, (latest) => ({
      status: "failed",
      error: {
        step: latest.generationStep,
        message: errorMessage(error),
        retryable: true,
        occurredAt: new Date().toISOString(),
      },
    }));

    throw error;
  }
}

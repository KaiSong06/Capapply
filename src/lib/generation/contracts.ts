import type { ArtifactRef, CreationSession } from "../domain/types";
import type { createArtifactStore } from "../storage/artifacts";

export type ArtifactStore = ReturnType<typeof createArtifactStore>;

export type LyricsResult = {
  brief: string;
  lyrics: string;
};

export type GenerationProviders = {
  generateLyrics(session: CreationSession): Promise<LyricsResult>;
  separateInstrumental(
    session: CreationSession,
    artifacts: ArtifactStore,
  ): Promise<ArtifactRef>;
  createGuideVocal(
    session: CreationSession,
    lyrics: string,
    artifacts: ArtifactStore,
  ): Promise<ArtifactRef>;
  convertVoice(
    session: CreationSession,
    guideVocal: ArtifactRef,
    artifacts: ArtifactStore,
  ): Promise<ArtifactRef>;
  createLipSyncVideo(
    session: CreationSession,
    convertedVocal: ArtifactRef,
    artifacts: ArtifactStore,
  ): Promise<ArtifactRef>;
  renderFinalVideo(
    session: CreationSession,
    lipSyncVideo: ArtifactRef,
    convertedVocal: ArtifactRef,
    artifacts: ArtifactStore,
  ): Promise<ArtifactRef>;
};

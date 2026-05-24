import type { CreationSession } from "../domain/types";
import type { createSessionStore } from "../storage/sessions";
import type { ArtifactStore, GenerationProviders } from "./contracts";

type SessionStore = ReturnType<typeof createSessionStore>;

export async function runGeneration(input: {
  session: CreationSession;
  sessions: SessionStore;
  artifacts: ArtifactStore;
  providers: GenerationProviders;
}): Promise<CreationSession> {
  const { session, sessions, artifacts, providers } = input;

  if (session.status !== "song_selected") {
    throw new Error(
      `Generation requires song_selected status, received ${session.status}`,
    );
  }

  let current = await sessions.update(session.id, {
    status: "generating",
    generationStep: "writing_lyrics",
  });

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

  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, briefArtifact, lyricsArtifact],
    generationStep: "separating_instrumental",
  });

  const instrumental = await providers.separateInstrumental(current, artifacts);
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, instrumental],
    generationStep: "creating_guide_vocal",
  });

  const guideVocal = await providers.createGuideVocal(
    current,
    lyricResult.lyrics,
    artifacts,
  );
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, guideVocal],
    generationStep: "converting_voice",
  });

  const convertedVocal = await providers.convertVoice(
    current,
    guideVocal,
    artifacts,
  );
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, convertedVocal],
    generationStep: "creating_lipsync_video",
  });

  const lipSyncVideo = await providers.createLipSyncVideo(
    current,
    convertedVocal,
    artifacts,
  );
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, lipSyncVideo],
    generationStep: "rendering_final_video",
  });

  const finalVideo = await providers.renderFinalVideo(
    current,
    lipSyncVideo,
    convertedVocal,
    artifacts,
  );

  return sessions.update(current.id, {
    status: "ready",
    generationStep: "complete",
    artifacts: [...current.artifacts, finalVideo],
    finalVideo,
    error: null,
  });
}

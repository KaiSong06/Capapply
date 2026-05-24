import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ArtifactRef, CreationSession } from "../domain/types";
import type { ArtifactStore, GenerationProviders } from "./contracts";
import {
  createSilentAudio,
  createSolidVideo,
  renderFinalMp4,
} from "./ffmpeg-renderer";

async function putGeneratedFile(input: {
  artifacts: ArtifactStore;
  sessionId: string;
  kind: ArtifactRef["kind"];
  filename: string;
  contentType: string;
  build(filePath: string): Promise<void>;
}): Promise<ArtifactRef> {
  const dir = await mkdtemp(path.join(tmpdir(), "capapply-mock-media-"));
  const filePath = path.join(dir, input.filename);

  try {
    await input.build(filePath);
    return input.artifacts.putBuffer(input.sessionId, {
      kind: input.kind,
      filename: input.filename,
      contentType: input.contentType,
      buffer: await readFile(filePath),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function createMockProviders(): GenerationProviders {
  return {
    async generateLyrics(session: CreationSession) {
      const title = session.selectedJob?.title ?? "the role";
      return {
        brief: `A confident application parody for ${title}.`,
        lyrics: `Hire me for ${title}\nI ship the flows that make teams glow\nMy resume says I can build\nThe product dreams you need fulfilled`,
      };
    },

    async separateInstrumental(session, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "instrumental_track",
        filename: "instrumental.m4a",
        contentType: "audio/mp4",
        build: (filePath) => createSilentAudio(filePath, 3),
      });
    },

    async createGuideVocal(session, _lyrics, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "guide_vocal",
        filename: "guide-vocal.m4a",
        contentType: "audio/mp4",
        build: (filePath) => createSilentAudio(filePath, 3),
      });
    },

    async convertVoice(session, guideVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "converted_vocal",
        filename: "converted-vocal.m4a",
        contentType: "audio/mp4",
        buffer: await readFile(guideVocal.path),
      });
    },

    async createLipSyncVideo(session, _convertedVocal, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "lip_sync_video",
        filename: "lip-sync.mp4",
        contentType: "video/mp4",
        build: (filePath) => createSolidVideo(filePath, 3),
      });
    },

    async renderFinalVideo(session, lipSyncVideo, convertedVocal, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "final_video",
        filename: "capapply-demo.mp4",
        contentType: "video/mp4",
        build: (filePath) =>
          renderFinalMp4({
            videoPath: lipSyncVideo.path,
            audioPath: convertedVocal.path,
            outputPath: filePath,
          }),
      });
    },
  };
}

import type { ArtifactRef, CreationSession } from "../domain/types";
import type { ArtifactStore, GenerationProviders } from "./contracts";

async function putTextArtifact(
  artifacts: ArtifactStore,
  sessionId: string,
  kind: ArtifactRef["kind"],
  filename: string,
  text: string,
): Promise<ArtifactRef> {
  return artifacts.putBuffer(sessionId, {
    kind,
    filename,
    contentType: "text/plain",
    buffer: Buffer.from(text),
  });
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
      return putTextArtifact(
        artifacts,
        session.id,
        "instrumental_track",
        "instrumental.txt",
        "mock instrumental",
      );
    },

    async createGuideVocal(session, _lyrics, artifacts) {
      return putTextArtifact(
        artifacts,
        session.id,
        "guide_vocal",
        "guide-vocal.txt",
        "mock guide vocal",
      );
    },

    async convertVoice(session, _guideVocal, artifacts) {
      return putTextArtifact(
        artifacts,
        session.id,
        "converted_vocal",
        "converted-vocal.txt",
        "mock converted vocal",
      );
    },

    async createLipSyncVideo(session, _convertedVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "lip_sync_video",
        filename: "lip-sync.mp4",
        contentType: "video/mp4",
        buffer: Buffer.from("mock lip sync video"),
      });
    },

    async renderFinalVideo(session, _lipSyncVideo, _convertedVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "final_video",
        filename: "capapply-demo.mp4",
        contentType: "video/mp4",
        buffer: Buffer.from("mock final video"),
      });
    },
  };
}

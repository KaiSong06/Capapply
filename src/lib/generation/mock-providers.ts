import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ArtifactRef, CreationSession, SelectedSong } from "../domain/types";
import type { ArtifactStore, GenerationProviders } from "./contracts";
import {
  createVideoFromImage,
  createVideoFromSource,
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

function selectedSongTitle(selectedSong: SelectedSong | null): string {
  if (!selectedSong) return "the selected song";
  if (selectedSong.type === "upload") return selectedSong.title;
  return selectedSong.track.title;
}

function selectedSongArtist(selectedSong: SelectedSong | null): string {
  if (!selectedSong || selectedSong.type === "upload") return "your chosen track";
  return selectedSong.track.artist;
}

async function copyArtifact(input: {
  artifacts: ArtifactStore;
  sessionId: string;
  source: ArtifactRef;
  kind: ArtifactRef["kind"];
  filename: string;
}): Promise<ArtifactRef> {
  return input.artifacts.putBuffer(input.sessionId, {
    kind: input.kind,
    filename: input.filename,
    contentType: input.source.contentType,
    buffer: await readFile(input.source.path),
  });
}

async function fetchSoundCloudAudio(input: {
  session: CreationSession;
  artifacts: ArtifactStore;
}): Promise<ArtifactRef | null> {
  const selectedSong = input.session.selectedSong;
  if (selectedSong?.type !== "soundcloud") return null;

  const audioUrl = selectedSong.track.processability.audioUrl;
  if (!audioUrl) return null;

  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return null;

    return input.artifacts.putBuffer(input.session.id, {
      kind: "instrumental_track",
      filename: `backing-${selectedSong.track.id}.mp3`,
      contentType: response.headers.get("content-type") ?? "audio/mpeg",
      buffer: Buffer.from(await response.arrayBuffer()),
    });
  } catch {
    return null;
  }
}

export function createMockProviders(): GenerationProviders {
  return {
    async generateLyrics(session: CreationSession) {
      const title = session.selectedJob?.title ?? "the role";
      const company = session.selectedJob?.company ?? "the company";
      const resumeSummary =
        session.parsedResumeText?.split(/\s+/).slice(0, 5).join(" ") ??
        "a sharp candidate";
      const songTitle = selectedSongTitle(session.selectedSong);
      const songArtist = selectedSongArtist(session.selectedSong);

      return {
        brief: `A confident application parody for ${title} at ${company}, set against ${songTitle}.`,
        lyrics: `Hire me for ${title}\n${resumeSummary} is walking in the room\nI tuned this pitch to ${songTitle}\n${songArtist} can hold the groove\nMy resume says I can build\nThe product dreams you need fulfilled`,
      };
    },

    async separateInstrumental(session, artifacts) {
      if (session.selectedSong?.type === "upload") {
        return copyArtifact({
          artifacts,
          sessionId: session.id,
          source: session.selectedSong.artifact,
          kind: "instrumental_track",
          filename: `backing-${session.selectedSong.artifact.filename}`,
        });
      }

      const fetchedAudio = await fetchSoundCloudAudio({ session, artifacts });
      if (fetchedAudio) return fetchedAudio;

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
      const faceMedia =
        session.artifacts.find((artifact) => artifact.kind === "face_media") ??
        null;

      if (faceMedia?.contentType.startsWith("image/")) {
        try {
          return putGeneratedFile({
            artifacts,
            sessionId: session.id,
            kind: "lip_sync_video",
            filename: "face-video.mp4",
            contentType: "video/mp4",
            build: (filePath) =>
              createVideoFromImage({
                imagePath: faceMedia.path,
                outputPath: filePath,
                seconds: 3,
              }),
          });
        } catch {
          // Fall back to a generated frame if uploaded media cannot be decoded.
        }
      }

      if (faceMedia?.contentType.startsWith("video/")) {
        try {
          return putGeneratedFile({
            artifacts,
            sessionId: session.id,
            kind: "lip_sync_video",
            filename: "face-video.mp4",
            contentType: "video/mp4",
            build: (filePath) =>
              createVideoFromSource({
                videoPath: faceMedia.path,
                outputPath: filePath,
                seconds: 3,
              }),
          });
        } catch {
          // Fall back to a generated frame if uploaded media cannot be decoded.
        }
      }

      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "lip_sync_video",
        filename: "lip-sync.mp4",
        contentType: "video/mp4",
        build: (filePath) => createSolidVideo(filePath, 3),
      });
    },

    async renderFinalVideo(
      session,
      lipSyncVideo,
      convertedVocal,
      backingTrack,
      artifacts,
    ) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "final_video",
        filename: "capapply-demo.mp4",
        contentType: "video/mp4",
        build: async (filePath) => {
          try {
            await renderFinalMp4({
              videoPath: lipSyncVideo.path,
              audioPath: convertedVocal.path,
              backingAudioPath: backingTrack.path,
              outputPath: filePath,
            });
          } catch {
            await renderFinalMp4({
              videoPath: lipSyncVideo.path,
              audioPath: convertedVocal.path,
              outputPath: filePath,
            });
          }
        },
      });
    },
  };
}

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CreationSession } from "../domain/types";
import { createArtifactStore } from "../storage/artifacts";
import { createMockProviders } from "./mock-providers";

const execFileAsync = promisify(execFile);
const sessionId = "00000000-0000-4000-8000-000000000002";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-mock-providers-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createPng(filePath: string) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0f766e:s=640x360:d=1",
    "-frames:v",
    "1",
    filePath,
  ]);
}

describe("mock generation providers", () => {
  it("writes parody lyrics from resume, job, and selected song context", async () => {
    const providers = createMockProviders();
    const session = {
      parsedResumeText: "Senior Product Engineer focused on onboarding",
      selectedJob: {
        title: "Product Engineer",
        company: "Stripe",
        location: "New York",
        content: "Build developer workflows.",
      },
      selectedSong: {
        type: "upload",
        title: "demo-song.mp3",
      },
    } as CreationSession;

    const result = await providers.generateLyrics(session);

    expect(result.brief).toContain("Stripe");
    expect(result.lyrics).toContain("Senior Product Engineer");
    expect(result.lyrics).toContain("Product Engineer");
    expect(result.lyrics).toContain("demo-song.mp3");
  });

  it("uses uploaded song audio as the backing artifact", async () => {
    const artifacts = createArtifactStore(root);
    const uploadedTrack = await artifacts.putBuffer(sessionId, {
      kind: "uploaded_track",
      filename: "song.mp3",
      contentType: "audio/mpeg",
      buffer: Buffer.from("song bytes"),
    });
    const session = {
      id: sessionId,
      selectedSong: {
        type: "upload",
        title: "song.mp3",
        artifact: uploadedTrack,
      },
    } as CreationSession;

    const instrumental = await createMockProviders().separateInstrumental(
      session,
      artifacts,
    );

    expect(instrumental).toMatchObject({
      kind: "instrumental_track",
      filename: "backing-song.mp3",
      contentType: "audio/mpeg",
    });
    await expect(readFile(instrumental.path, "utf8")).resolves.toBe(
      "song bytes",
    );
  });

  it("creates a lip-sync placeholder from uploaded face image media", async () => {
    const artifacts = createArtifactStore(root);
    const imagePath = path.join(root, "face.png");
    await createPng(imagePath);
    const faceMedia = await artifacts.putBuffer(sessionId, {
      kind: "face_media",
      filename: "face.png",
      contentType: "image/png",
      buffer: await readFile(imagePath),
    });
    const session = {
      id: sessionId,
      artifacts: [faceMedia],
    } as CreationSession;

    const video = await createMockProviders().createLipSyncVideo(
      session,
      faceMedia,
      artifacts,
    );

    expect(video).toMatchObject({
      kind: "lip_sync_video",
      filename: "face-video.mp4",
      contentType: "video/mp4",
    });
    expect((await stat(video.path)).size).toBeGreaterThan(1000);
  });
});

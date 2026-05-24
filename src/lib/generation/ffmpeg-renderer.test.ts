import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createVideoFromImage,
  createSilentAudio,
  createSolidVideo,
  renderFinalMp4,
} from "./ffmpeg-renderer";

const execFileAsync = promisify(execFile);
let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-ffmpeg-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ffmpeg renderer", () => {
  async function createPng(filePath: string) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x134e4a:s=640x360:d=1",
      "-frames:v",
      "1",
      filePath,
    ]);
  }

  it("creates a short video from a static image", async () => {
    const imagePath = path.join(root, "face.png");
    const outputPath = path.join(root, "face.mp4");

    await createPng(imagePath);
    await createVideoFromImage({
      imagePath,
      outputPath,
      seconds: 2,
    });

    expect((await stat(outputPath)).size).toBeGreaterThan(1000);
  });

  it("combines video and audio into an mp4", async () => {
    const videoPath = path.join(root, "video.mp4");
    const audioPath = path.join(root, "audio.m4a");
    const backingAudioPath = path.join(root, "backing.m4a");
    const outputPath = path.join(root, "final.mp4");

    await createSolidVideo(videoPath, 2);
    await createSilentAudio(audioPath, 2);
    await createSilentAudio(backingAudioPath, 2);
    await renderFinalMp4({
      videoPath,
      audioPath,
      backingAudioPath,
      outputPath,
    });

    expect((await stat(outputPath)).size).toBeGreaterThan(1000);
  });
});

import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSilentAudio,
  createSolidVideo,
  renderFinalMp4,
} from "./ffmpeg-renderer";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-ffmpeg-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ffmpeg renderer", () => {
  it("combines video and audio into an mp4", async () => {
    const videoPath = path.join(root, "video.mp4");
    const audioPath = path.join(root, "audio.m4a");
    const outputPath = path.join(root, "final.mp4");

    await createSolidVideo(videoPath, 2);
    await createSilentAudio(audioPath, 2);
    await renderFinalMp4({ videoPath, audioPath, outputPath });

    expect((await stat(outputPath)).size).toBeGreaterThan(1000);
  });
});

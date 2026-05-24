import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function createSolidVideo(
  outputPath: string,
  seconds: number,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x111827:s=1280x720:d=${seconds}`,
    "-vf",
    "format=yuv420p",
    outputPath,
  ]);
}

export async function createSilentAudio(
  outputPath: string,
  seconds: number,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    String(seconds),
    outputPath,
  ]);
}

export async function renderFinalMp4(input: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input.videoPath,
    "-i",
    input.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    input.outputPath,
  ]);
}

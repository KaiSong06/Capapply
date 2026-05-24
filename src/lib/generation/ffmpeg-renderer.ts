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

export async function createVideoFromImage(input: {
  imagePath: string;
  outputPath: string;
  seconds: number;
}): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-i",
    input.imagePath,
    "-t",
    String(input.seconds),
    "-r",
    "30",
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
    "-an",
    input.outputPath,
  ]);
}

export async function createVideoFromSource(input: {
  videoPath: string;
  outputPath: string;
  seconds: number;
}): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input.videoPath,
    "-t",
    String(input.seconds),
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
    "-an",
    input.outputPath,
  ]);
}

export async function renderFinalMp4(input: {
  videoPath: string;
  audioPath: string;
  backingAudioPath?: string;
  outputPath: string;
}): Promise<void> {
  if (input.backingAudioPath) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      input.videoPath,
      "-i",
      input.audioPath,
      "-i",
      input.backingAudioPath,
      "-filter_complex",
      "[1:a]volume=1.0[vocal];[2:a]volume=0.35[backing];[backing][vocal]amix=inputs=2:duration=shortest:normalize=0[aout]",
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      input.outputPath,
    ]);
    return;
  }

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

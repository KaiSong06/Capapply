import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

type LipSyncPayload = {
  id?: string;
  jobId?: string;
  job_id?: string;
  taskId?: string;
  task_id?: string;
  status?: string;
  videoUrl?: string;
  video_url?: string;
  downloadUrl?: string;
  download_url?: string;
  outputUrl?: string;
  output_url?: string;
  output?: string | { videoUrl?: string; video_url?: string; url?: string };
  url?: string;
};

const failedStatuses = new Set(["failed", "error", "canceled", "cancelled"]);
const completeStatuses = new Set(["complete", "completed", "done", "ready", "succeeded"]);

function headerWithApiKey(apiKey?: string): HeadersInit | undefined {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
}

function videoUrlFromPayload(payload: LipSyncPayload): string | null {
  if (typeof payload.output === "string") return payload.output;

  return (
    payload.videoUrl ??
    payload.video_url ??
    payload.downloadUrl ??
    payload.download_url ??
    payload.outputUrl ??
    payload.output_url ??
    payload.output?.videoUrl ??
    payload.output?.video_url ??
    payload.output?.url ??
    payload.url ??
    null
  );
}

function jobIdFromPayload(payload: LipSyncPayload): string | null {
  return (
    payload.id ??
    payload.jobId ??
    payload.job_id ??
    payload.taskId ??
    payload.task_id ??
    null
  );
}

function buildStatusUrl(statusUrl: string, jobId: string): string {
  if (statusUrl.includes("{id}")) {
    return statusUrl.replaceAll("{id}", encodeURIComponent(jobId));
  }

  const url = new URL(statusUrl);
  url.searchParams.set("id", jobId);
  return url.toString();
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Lip-sync video download failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function pollForVideoUrl(input: {
  statusUrl: string;
  jobId: string;
  apiKey?: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<string> {
  const maxAttempts = input.maxAttempts ?? 30;
  const intervalMs = input.intervalMs ?? 2000;
  const url = buildStatusUrl(input.statusUrl, input.jobId);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await wait(intervalMs);

    const response = await fetch(url, {
      headers: headerWithApiKey(input.apiKey),
    });

    if (!response.ok) {
      throw new Error(`Lip-sync provider status failed: ${response.status}`);
    }

    const payload = (await response.json()) as LipSyncPayload;
    const status = payload.status?.toLowerCase();
    const videoUrl = videoUrlFromPayload(payload);

    if (videoUrl && (!status || completeStatuses.has(status))) {
      return videoUrl;
    }

    if (status && failedStatuses.has(status)) {
      throw new Error(`Lip-sync provider failed with status: ${status}`);
    }
  }

  throw new Error("Lip-sync provider timed out before returning a video URL");
}

export async function createLipSyncVideoWithHttp(input: {
  session: CreationSession;
  convertedVocal: ArtifactRef;
  artifacts: ArtifactStore;
  createUrl: string;
  statusUrl: string;
  apiKey?: string;
}): Promise<ArtifactRef> {
  const face = input.session.artifacts.find(
    (artifact) => artifact.kind === "face_media",
  );

  if (!face) {
    throw new Error("Face media is required for lip-sync generation");
  }

  const [faceBuffer, vocalBuffer] = await Promise.all([
    readFile(face.path),
    readFile(input.convertedVocal.path),
  ]);

  const form = new FormData();
  form.set(
    "face",
    new Blob([new Uint8Array(faceBuffer)], { type: face.contentType }),
    face.filename,
  );
  form.set(
    "audio",
    new Blob([new Uint8Array(vocalBuffer)], {
      type: input.convertedVocal.contentType,
    }),
    input.convertedVocal.filename,
  );

  const createResponse = await fetch(input.createUrl, {
    method: "POST",
    headers: headerWithApiKey(input.apiKey),
    body: form,
  });

  if (!createResponse.ok) {
    throw new Error(`Lip-sync provider create failed: ${createResponse.status}`);
  }

  const created = (await createResponse.json()) as LipSyncPayload;
  const directVideoUrl = videoUrlFromPayload(created);
  const jobId = jobIdFromPayload(created);
  const videoUrl =
    directVideoUrl ??
    (jobId
      ? await pollForVideoUrl({
          statusUrl: input.statusUrl,
          jobId,
          apiKey: input.apiKey,
        })
      : null);

  if (!videoUrl) {
    throw new Error("Lip-sync provider did not return a video URL or job id");
  }

  return input.artifacts.putBuffer(input.session.id, {
    kind: "lip_sync_video",
    filename: "lip-sync.mp4",
    contentType: "video/mp4",
    buffer: await downloadVideo(videoUrl),
  });
}

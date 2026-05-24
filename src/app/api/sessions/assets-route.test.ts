import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createArtifactStore } from "../../../lib/storage/artifacts";
import { createSessionStore } from "../../../lib/storage/sessions";
import { POST } from "./[sessionId]/assets/route";

const getStoresMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/server/stores", () => ({
  getStores: getStoresMock,
}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-assets-route-"));
  getStoresMock.mockReturnValue({
    sessions: createSessionStore(root),
    artifacts: createArtifactStore(root),
  });
});

afterEach(async () => {
  getStoresMock.mockReset();
  await rm(root, { recursive: true, force: true });
});

function requestWithAsset(kind: string, filename: string, content: string) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", new File([content], filename, { type: "text/plain" }));

  return { formData: async () => form } as Request;
}

async function uploadAsset(sessionId: string, kind: string, filename: string) {
  const response = await POST(requestWithAsset(kind, filename, filename), {
    params: Promise.resolve({ sessionId }),
  });

  return {
    response,
    body: await response.json(),
  };
}

describe("session asset upload route", () => {
  it("supports sequential uploads and replacing an existing asset", async () => {
    const sessions = createSessionStore(root);
    const draftSession = await sessions.create();

    const resumeUpload = await uploadAsset(
      draftSession.id,
      "resume",
      "resume-v1.txt",
    );

    expect(resumeUpload.response.status).toBe(200);
    expect(resumeUpload.body.session.status).toBe("assets_ready");
    expect(resumeUpload.body.session.artifacts).toMatchObject([
      { kind: "resume", filename: "resume-v1.txt" },
    ]);

    const voiceUpload = await uploadAsset(
      draftSession.id,
      "voice_sample",
      "voice.txt",
    );

    expect(voiceUpload.response.status).toBe(200);
    expect(voiceUpload.body.session.status).toBe("assets_ready");
    expect(voiceUpload.body.session.artifacts).toMatchObject([
      { kind: "resume", filename: "resume-v1.txt" },
      { kind: "voice_sample", filename: "voice.txt" },
    ]);

    const replacementUpload = await uploadAsset(
      draftSession.id,
      "resume",
      "resume-v2.txt",
    );

    expect(replacementUpload.response.status).toBe(200);
    expect(replacementUpload.body.session.status).toBe("assets_ready");
    expect(replacementUpload.body.session.artifacts).toMatchObject([
      { kind: "voice_sample", filename: "voice.txt" },
      { kind: "resume", filename: "resume-v2.txt" },
    ]);
    expect(getStoresMock).toHaveBeenCalledTimes(3);
  });

  it("returns a stable 400 response for invalid asset upload states", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "ready" });

    const upload = await uploadAsset(session.id, "resume", "resume.txt");

    expect(upload.response.status).toBe(400);
    expect(upload.body).toEqual({ error: "Invalid asset upload state" });
    expect(getStoresMock).toHaveBeenCalledTimes(1);
  });
});

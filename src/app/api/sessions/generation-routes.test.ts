import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createArtifactStore } from "../../../lib/storage/artifacts";
import { createSessionStore } from "../../../lib/storage/sessions";
import { GET as downloadVideo } from "./[sessionId]/download/route";
import { POST as generateVideo } from "./[sessionId]/generate/route";

const getStoresMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/server/stores", () => ({
  getStores: getStoresMock,
}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-generation-routes-"));
  getStoresMock.mockReturnValue({
    sessions: createSessionStore(root),
    artifacts: createArtifactStore(root),
  });
});

afterEach(async () => {
  getStoresMock.mockReset();
  await rm(root, { recursive: true, force: true });
});

function context(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

async function createSongSelectedSession() {
  const sessions = createSessionStore(root);
  const artifacts = createArtifactStore(root);
  const session = await sessions.create();
  const uploadedTrack = await artifacts.putBuffer(session.id, {
    kind: "uploaded_track",
    filename: "demo.mp3",
    contentType: "audio/mpeg",
    buffer: Buffer.from("fake song"),
  });

  return sessions.update(session.id, {
    status: "song_selected",
    parsedResumeText: "Senior Product Engineer",
    selectedJob: {
      id: "job-1",
      title: "Product Engineer",
      company: "Example",
      boardToken: "example",
      location: "Remote",
      content: "Build onboarding systems.",
      absoluteUrl: "https://example.com/job",
      updatedAt: null,
    },
    selectedSong: {
      type: "upload",
      title: "demo.mp3",
      artifact: uploadedTrack,
    },
  });
}

describe("generation and download routes", () => {
  it("runs mock generation and downloads the final mp4", async () => {
    const session = await createSongSelectedSession();

    const generateResponse = await generateVideo(
      new Request("http://local.test", { method: "POST" }),
      context(session.id),
    );

    expect(generateResponse.status).toBe(200);
    const generateBody = await generateResponse.json();
    expect(generateBody.session.status).toBe("ready");
    expect(generateBody.session.finalVideo).toMatchObject({
      kind: "final_video",
      filename: "demo-output.mp4",
      contentType: "video/mp4",
    });
    expect(generateBody.session.finalVideo.path).toContain(
      "public/demo-output.mp4",
    );

    const downloadResponse = await downloadVideo(
      new Request("http://local.test"),
      context(session.id),
    );

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("content-type")).toBe("video/mp4");
    expect(downloadResponse.headers.get("content-disposition")).toContain(
      "demo-output.mp4",
    );
    expect((await downloadResponse.arrayBuffer()).byteLength).toBeGreaterThan(
      1000,
    );
  });

  it("returns stable errors for invalid generation and missing exports", async () => {
    const sessions = createSessionStore(root);
    const draftSession = await sessions.create();

    const generateResponse = await generateVideo(
      new Request("http://local.test", { method: "POST" }),
      context(draftSession.id),
    );

    expect(generateResponse.status).toBe(400);
    expect(await generateResponse.json()).toMatchObject({
      error: "Generation requires song_selected status, received draft",
    });

    const downloadResponse = await downloadVideo(
      new Request("http://local.test"),
      context(draftSession.id),
    );

    expect(downloadResponse.status).toBe(404);
    expect(await downloadResponse.json()).toEqual({
      error: "Final video not ready",
    });
  });
});

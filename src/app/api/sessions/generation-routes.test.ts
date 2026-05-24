import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionStore } from "../../../lib/storage/sessions";
import { GET as downloadOutput } from "./[sessionId]/download/route";
import { POST as generateOutput } from "./[sessionId]/generate/route";

const getStoresMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/server/stores", () => ({
  getStores: getStoresMock,
}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-generation-routes-"));
  getStoresMock.mockReturnValue({
    sessions: createSessionStore(root),
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
  const session = await sessions.create();

  return sessions.update(session.id, {
    status: "song_selected",
    parsedResumeText: "Senior Product Engineer",
    selectedSong: {
      type: "soundcloud",
      track: {
        id: "top-tier",
        title: "Top Tier",
        artist: "Demo",
        durationMs: 180_000,
        artworkUrl: null,
        sourceUrl: "https://example.com/top-tier",
        processability: {
          processable: true,
          reason: "direct_audio_url",
          audioUrl: "https://example.com/top-tier.mp3",
        },
      },
    },
  });
}

describe("generation and download routes", () => {
  it("uses the bundled Top Tier mp3 as the final audio export", async () => {
    const session = await createSongSelectedSession();

    const generateResponse = await generateOutput(
      new Request("http://local.test", { method: "POST" }),
      context(session.id),
    );

    expect(generateResponse.status).toBe(200);
    const generateBody = await generateResponse.json();
    expect(generateBody.session.status).toBe("ready");
    expect(generateBody.session.finalVideo).toMatchObject({
      kind: "final_audio",
      filename: "top-tier.mp3",
      contentType: "audio/mpeg",
    });
    expect(generateBody.session.finalVideo.path).toContain(
      "public/top-tier.mp3",
    );

    const downloadResponse = await downloadOutput(
      new Request("http://local.test"),
      context(session.id),
    );

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("content-type")).toBe("audio/mpeg");
    expect(downloadResponse.headers.get("content-disposition")).toContain(
      "top-tier.mp3",
    );
    expect((await downloadResponse.arrayBuffer()).byteLength).toBeGreaterThan(
      1000,
    );
  });

  it("returns stable errors for invalid generation and missing exports", async () => {
    const sessions = createSessionStore(root);
    const draftSession = await sessions.create();

    const generateResponse = await generateOutput(
      new Request("http://local.test", { method: "POST" }),
      context(draftSession.id),
    );

    expect(generateResponse.status).toBe(400);
    expect(await generateResponse.json()).toMatchObject({
      error: "Generation requires song_selected status, received draft",
    });

    const downloadResponse = await downloadOutput(
      new Request("http://local.test"),
      context(draftSession.id),
    );

    expect(downloadResponse.status).toBe(404);
    expect(await downloadResponse.json()).toEqual({
      error: "Final audio not ready",
    });
  });
});

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedJob, NormalizedTrack } from "../../../lib/domain/types";
import { createArtifactStore } from "../../../lib/storage/artifacts";
import { createSessionStore } from "../../../lib/storage/sessions";
import { GET } from "./[sessionId]/route";
import { POST as selectJob } from "./[sessionId]/select-job/route";
import { POST as selectSong } from "./[sessionId]/select-song/route";
import { POST as uploadTrack } from "./[sessionId]/upload-track/route";

const getStoresMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/server/stores", () => ({
  getStores: getStoresMock,
}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-session-routes-"));
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

function jsonRequest(body: unknown) {
  return new Request("http://local.test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function uploadRequest(filename: string, content = "audio") {
  const form = new FormData();
  form.set("file", new File([content], filename, { type: "audio/mpeg" }));

  return { formData: async () => form } as Request;
}

function normalizedJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    id: "job-1",
    title: "Product Engineer",
    company: "Acme",
    boardToken: "acme",
    location: "Remote",
    content: "Build products",
    absoluteUrl: "https://example.com/jobs/1",
    updatedAt: null,
    ...overrides,
  };
}

function processableTrack(
  overrides: Partial<NormalizedTrack> = {},
): NormalizedTrack {
  return {
    id: "track-1",
    title: "Song",
    artist: "Artist",
    durationMs: null,
    artworkUrl: null,
    sourceUrl: "https://soundcloud.com/artist/song",
    processability: {
      processable: true,
      reason: "downloadable",
      audioUrl: "https://cdn.example.com/song.mp3",
    },
    ...overrides,
  };
}

describe("session routes", () => {
  it("returns stable 400 JSON for invalid session ids", async () => {
    const response = await GET(new Request("http://local.test"), context("../x"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid session id" });
    expect(getStoresMock).not.toHaveBeenCalled();
  });

  it("rejects upload-track before job selection without adding a session artifact", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "assets_ready" });

    const response = await uploadTrack(
      uploadRequest("fallback.mp3"),
      context(session.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid upload track state" });

    const stored = await sessions.get(session.id);
    expect(stored?.artifacts).toEqual([]);
    expect(stored?.selectedSong).toBeNull();
  });

  it("rejects malformed job selection bodies", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "assets_ready" });

    const response = await selectJob(
      jsonRequest({ job: { id: "job-1" } }),
      context(session.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid job selection" });
  });

  it("rejects empty required job selection strings", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "assets_ready" });

    const emptyTitle = await selectJob(
      jsonRequest({ job: normalizedJob({ title: "" }) }),
      context(session.id),
    );
    const emptyBoardToken = await selectJob(
      jsonRequest({ job: normalizedJob({ boardToken: "" }) }),
      context(session.id),
    );

    expect(emptyTitle.status).toBe(400);
    expect(await emptyTitle.json()).toEqual({ error: "Invalid job selection" });
    expect(emptyBoardToken.status).toBe(400);
    expect(await emptyBoardToken.json()).toEqual({
      error: "Invalid job selection",
    });
  });

  it("rejects non-processable or malformed song selections", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "job_selected" });

    const nonProcessable = await selectSong(
      jsonRequest({
        track: {
          ...processableTrack(),
          processability: {
            processable: false,
            reason: "not_permitted",
            audioUrl: null,
          },
        },
      }),
      context(session.id),
    );

    expect(nonProcessable.status).toBe(400);
    expect(await nonProcessable.json()).toEqual({
      error: "Track is not processable",
    });

    const malformed = await selectSong(
      jsonRequest({ track: { id: "track-1" } }),
      context(session.id),
    );

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "Track is not processable" });
  });

  it("allows song selection immediately after audio inputs are ready", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "assets_ready" });

    const response = await selectSong(
      jsonRequest({
        track: processableTrack({ id: "top-tier", title: "Top Tier" }),
      }),
      context(session.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session.status).toBe("song_selected");
    expect(body.session.selectedSong.track.title).toBe("Top Tier");
  });

  it("allows repeated job selection from job_selected and replaces selectedJob", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "assets_ready" });

    await selectJob(jsonRequest({ job: normalizedJob() }), context(session.id));
    const response = await selectJob(
      jsonRequest({
        job: normalizedJob({
          id: "job-2",
          title: "Staff Engineer",
          company: "Beta",
          boardToken: "beta",
        }),
      }),
      context(session.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session.status).toBe("job_selected");
    expect(body.session.selectedJob.id).toBe("job-2");
    expect(body.session.selectedCompany).toEqual({
      company: "Beta",
      boardToken: "beta",
    });
  });

  it("allows repeated song and upload-track selection from song_selected", async () => {
    const sessions = createSessionStore(root);
    const session = await sessions.create();
    await sessions.update(session.id, { status: "job_selected" });

    await selectSong(
      jsonRequest({ track: processableTrack() }),
      context(session.id),
    );

    const songResponse = await selectSong(
      jsonRequest({
        track: processableTrack({ id: "track-2", title: "Replacement" }),
      }),
      context(session.id),
    );

    expect(songResponse.status).toBe(200);
    const songBody = await songResponse.json();
    expect(songBody.session.status).toBe("song_selected");
    expect(songBody.session.selectedSong.track.id).toBe("track-2");

    const uploadResponse = await uploadTrack(
      uploadRequest("replacement.mp3"),
      context(session.id),
    );

    expect(uploadResponse.status).toBe(200);
    const uploadBody = await uploadResponse.json();
    expect(uploadBody.session.status).toBe("song_selected");
    expect(uploadBody.session.selectedSong).toMatchObject({
      type: "upload",
      title: "replacement.mp3",
    });
    expect(uploadBody.session.artifacts).toMatchObject([
      { kind: "uploaded_track", filename: "replacement.mp3" },
    ]);
  });
});

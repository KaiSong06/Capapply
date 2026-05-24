import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactStore } from "../storage/artifacts";
import { createSessionStore } from "../storage/sessions";
import { createMockProviders } from "./mock-providers";
import { runGeneration } from "./orchestrator";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-generation-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("generation orchestrator", () => {
  it("creates expected artifacts and marks the session ready", async () => {
    const sessions = createSessionStore(root);
    const artifacts = createArtifactStore(root);
    const session = await sessions.create();

    const readySession = await sessions.update(session.id, {
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
        artifact: await artifacts.putBuffer(session.id, {
          kind: "uploaded_track",
          filename: "demo.mp3",
          contentType: "audio/mpeg",
          buffer: Buffer.from("fake song"),
        }),
      },
    });

    const result = await runGeneration({
      session: readySession,
      sessions,
      artifacts,
      providers: createMockProviders(),
    });

    expect(result.status).toBe("ready");
    expect(result.finalVideo?.kind).toBe("final_video");
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain(
      "lyrics",
    );
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain(
      "final_video",
    );
  });
});

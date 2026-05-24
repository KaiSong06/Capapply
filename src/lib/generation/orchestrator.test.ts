import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CreationSession } from "../domain/types";
import { createArtifactStore } from "../storage/artifacts";
import { createSessionStore } from "../storage/sessions";
import { createMockHardwareController } from "../hardware/mock-controller";
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
  async function createSongSelectedSession(): Promise<{
    sessions: ReturnType<typeof createSessionStore>;
    artifacts: ReturnType<typeof createArtifactStore>;
    session: CreationSession;
  }> {
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

    return { sessions, artifacts, session: readySession };
  }

  it("creates expected artifacts and marks the session ready", async () => {
    const { sessions, artifacts, session: readySession } =
      await createSongSelectedSession();

    const hardware = createMockHardwareController();
    const result = await runGeneration({
      session: readySession,
      sessions,
      artifacts,
      providers: createMockProviders(),
      hardware,
    });

    expect(result.status).toBe("ready");
    expect(result.generationStep).toBe("complete");
    expect(hardware.calls.map((call) => call.type)).toEqual([
      "playSong",
      "moveMotor",
    ]);
    expect(result.finalVideo?.kind).toBe("final_video");
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain(
      "lyrics",
    );
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain(
      "final_video",
    );
  });

  it("persists failed status and step error when a provider fails", async () => {
    const { sessions, artifacts, session } = await createSongSelectedSession();
    const providers = {
      ...createMockProviders(),
      async convertVoice() {
        throw new Error("voice conversion failed");
      },
    };

    await expect(
      runGeneration({
        session,
        sessions,
        artifacts,
        providers,
        hardware: createMockHardwareController(),
      }),
    ).rejects.toThrow("voice conversion failed");

    const failedSession = await sessions.get(session.id);
    expect(failedSession?.status).toBe("failed");
    expect(failedSession?.error).toMatchObject({
      step: "converting_voice",
      message: "voice conversion failed",
      retryable: true,
    });
    expect(failedSession?.error?.occurredAt).toEqual(expect.any(String));
  });

  it("rejects stale duplicate generation starts", async () => {
    const { sessions, artifacts, session } = await createSongSelectedSession();
    await sessions.update(session.id, {
      status: "generating",
      generationStep: "writing_lyrics",
    });

    await expect(
      runGeneration({
        session,
        sessions,
        artifacts,
        providers: createMockProviders(),
        hardware: createMockHardwareController(),
      }),
    ).rejects.toThrow(
      "Generation requires song_selected status, received generating",
    );
  });

  it("preserves artifacts appended externally during generation", async () => {
    const { sessions, artifacts, session } = await createSongSelectedSession();
    const providers = createMockProviders();
    const externalArtifact = await artifacts.putBuffer(session.id, {
      kind: "parsed_resume",
      filename: "external.txt",
      contentType: "text/plain",
      buffer: Buffer.from("external artifact"),
    });

    const result = await runGeneration({
      session,
      sessions,
      artifacts,
      hardware: createMockHardwareController(),
      providers: {
        ...providers,
        async separateInstrumental(current, artifactStore) {
          await sessions.updateWith(current.id, (latest) => ({
            artifacts: [...latest.artifacts, externalArtifact],
          }));

          return providers.separateInstrumental(current, artifactStore);
        },
      },
    });

    expect(result.artifacts.map((artifact) => artifact.id)).toContain(
      externalArtifact.id,
    );
  });
});

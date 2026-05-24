import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ArtifactRef } from "../domain/types";
import { createSessionStore } from "./sessions";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-sessions-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("session store", () => {
  const missingSessionId = "00000000-0000-4000-8000-000000000000";

  function artifact(id: string): ArtifactRef {
    return {
      id,
      kind: "resume",
      filename: `${id}.txt`,
      contentType: "text/plain",
      path: `sessions/test/artifacts/${id}.txt`,
      createdAt: new Date().toISOString(),
    };
  }

  it("creates, reads, and updates a session", async () => {
    const store = createSessionStore(root);
    const session = await store.create();

    expect(session.status).toBe("draft");
    expect(session.artifacts).toEqual([]);

    const updated = await store.update(session.id, { status: "assets_ready" });
    expect(updated.status).toBe("assets_ready");

    const found = await store.get(session.id);
    expect(found?.id).toBe(session.id);
    expect(found?.status).toBe("assets_ready");
  });

  it("returns null for a missing valid session id", async () => {
    const store = createSessionStore(root);

    await expect(store.get(missingSessionId)).resolves.toBeNull();
  });

  it("rejects updates for a missing valid session id", async () => {
    const store = createSessionStore(root);

    await expect(
      store.update(missingSessionId, { status: "assets_ready" }),
    ).rejects.toThrow(`Session not found: ${missingSessionId}`);
  });

  it("updates after destructuring the update function", async () => {
    const store = createSessionStore(root);
    const session = await store.create();
    const { update } = store;

    const updated = await update(session.id, { status: "assets_ready" });

    expect(updated.status).toBe("assets_ready");
  });

  it("serializes updateWith calls across store instances for the same session", async () => {
    const firstStore = createSessionStore(root);
    const secondStore = createSessionStore(root);
    const session = await firstStore.create();
    let releaseFirstUpdate: () => void = () => undefined;
    let markFirstUpdateStarted: () => void = () => undefined;
    const release = new Promise<void>((release) => {
      releaseFirstUpdate = release;
    });
    const firstUpdateStarted = new Promise<void>((resolve) => {
      markFirstUpdateStarted = resolve;
    });
    const firstUpdate = firstStore.updateWith(session.id, async (current) => {
      markFirstUpdateStarted();
      await release;
      return { artifacts: [...current.artifacts, artifact("first")] };
    });

    await firstUpdateStarted;

    const secondUpdate = secondStore.updateWith(session.id, (current) => ({
      artifacts: [...current.artifacts, artifact("second")],
    }));

    releaseFirstUpdate();

    const [, updated] = await Promise.all([firstUpdate, secondUpdate]);

    expect(updated.artifacts.map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("rejects unsafe session ids", async () => {
    const store = createSessionStore(root);

    await expect(store.get("../escape")).rejects.toThrow(
      "Invalid session id: ../escape",
    );
  });
});

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionStore } from "./sessions";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-sessions-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("session store", () => {
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
});

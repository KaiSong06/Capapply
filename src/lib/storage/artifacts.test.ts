import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactStore } from "./artifacts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-artifacts-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("artifact store", () => {
  const sessionId = "00000000-0000-4000-8000-000000000000";

  it("stores a session artifact on disk", async () => {
    const store = createArtifactStore(root);
    const artifact = await store.putBuffer(sessionId, {
      kind: "resume",
      filename: "resume.txt",
      contentType: "text/plain",
      buffer: Buffer.from("Senior product engineer"),
    });

    expect(artifact.kind).toBe("resume");
    expect(artifact.filename).toBe("resume.txt");
    expect(await readFile(artifact.path, "utf8")).toBe(
      "Senior product engineer",
    );
  });

  it("rejects unsafe session ids", async () => {
    const store = createArtifactStore(root);

    await expect(
      store.putBuffer("../escape", {
        kind: "resume",
        filename: "resume.txt",
        contentType: "text/plain",
        buffer: Buffer.from("Senior product engineer"),
      }),
    ).rejects.toThrow("Invalid session id: ../escape");
  });

  it("sanitizes artifact paths while preserving the original filename", async () => {
    const store = createArtifactStore(root);

    const artifact = await store.putBuffer(sessionId, {
      kind: "resume",
      filename: "my resume?.txt",
      contentType: "text/plain",
      buffer: Buffer.from("Senior product engineer"),
    });

    expect(path.basename(artifact.path)).toMatch(/my_resume_\.txt$/);
    expect(artifact.filename).toBe("my resume?.txt");
  });
});

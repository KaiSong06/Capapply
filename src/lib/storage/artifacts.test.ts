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
  it("stores a session artifact on disk", async () => {
    const store = createArtifactStore(root);
    const artifact = await store.putBuffer("session-1", {
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
});

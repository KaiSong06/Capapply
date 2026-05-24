import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactKind, ArtifactRef } from "@/lib/domain/types";

export type PutArtifactInput = {
  kind: ArtifactKind;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export function createArtifactStore(root: string) {
  return {
    async putBuffer(
      sessionId: string,
      input: PutArtifactInput,
    ): Promise<ArtifactRef> {
      const id = randomUUID();
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const dir = path.join(root, "sessions", sessionId, "artifacts");
      const filePath = path.join(dir, `${id}-${safeName}`);

      await mkdir(dir, { recursive: true });
      await writeFile(filePath, input.buffer);

      return {
        id,
        kind: input.kind,
        filename: input.filename,
        contentType: input.contentType,
        path: filePath,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

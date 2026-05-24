import { describe, expect, it } from "vitest";
import type { ArtifactRef, CreationSession } from "../domain/types";
import { resolvePlaybackArtifact } from "./contracts";

function artifact(kind: ArtifactRef["kind"]): ArtifactRef {
  return {
    id: `${kind}-1`,
    kind,
    filename: `${kind}.m4a`,
    contentType: "audio/mp4",
    path: `/tmp/${kind}.m4a`,
    createdAt: "2026-05-24T00:00:00.000Z",
  };
}

function session(overrides: Partial<CreationSession> = {}): CreationSession {
  return {
    id: "session-1",
    status: "generating",
    generationStep: "playing_on_device",
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    artifacts: [],
    parsedResumeText: null,
    selectedCompany: null,
    selectedJob: null,
    selectedSong: null,
    finalVideo: null,
    error: null,
    ...overrides,
  };
}

describe("resolvePlaybackArtifact", () => {
  it("prefers converted vocal over uploaded track", () => {
    const uploaded = artifact("uploaded_track");
    const converted = artifact("converted_vocal");

    const resolved = resolvePlaybackArtifact(
      session({
        selectedSong: { type: "upload", title: "demo", artifact: uploaded },
      }),
      [uploaded, converted],
    );

    expect(resolved?.kind).toBe("converted_vocal");
  });

  it("falls back to uploaded track when converted vocal is missing", () => {
    const uploaded = artifact("uploaded_track");

    const resolved = resolvePlaybackArtifact(
      session({
        selectedSong: { type: "upload", title: "demo", artifact: uploaded },
      }),
      [uploaded],
    );

    expect(resolved?.kind).toBe("uploaded_track");
  });
});

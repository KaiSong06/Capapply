import { describe, expect, it } from "vitest";
import {
  canTransition,
  getNextStatusAfterAssetUpload,
  getNextStatusAfterJobSelection,
  getNextStatusAfterSongSelection,
  transitionStatus,
} from "./session-state";

describe("session state transitions", () => {
  it("advances through the creation setup states", () => {
    expect(getNextStatusAfterAssetUpload("draft")).toBe("assets_ready");
    expect(getNextStatusAfterJobSelection("assets_ready")).toBe("job_selected");
    expect(getNextStatusAfterSongSelection("job_selected")).toBe("song_selected");
  });

  it("allows only explicit status transitions", () => {
    expect(canTransition("draft", "assets_ready")).toBe(true);
    expect(canTransition("assets_ready", "job_selected")).toBe(true);
    expect(canTransition("job_selected", "song_selected")).toBe(true);
    expect(canTransition("song_selected", "generating")).toBe(true);
    expect(canTransition("generating", "ready")).toBe(true);
    expect(canTransition("generating", "failed")).toBe(true);
    expect(canTransition("ready", "generating")).toBe(false);
    expect(canTransition("draft", "ready")).toBe(false);
  });

  it("throws when setup helpers would skip required status transitions", () => {
    expect(() => getNextStatusAfterAssetUpload("ready")).toThrow(
      new Error("Invalid session status transition: ready -> assets_ready"),
    );
    expect(() => transitionStatus("draft", "ready")).toThrow(
      new Error("Invalid session status transition: draft -> ready"),
    );
  });
});

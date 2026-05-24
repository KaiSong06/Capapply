import { describe, expect, it } from "vitest";
import {
  canTransition,
  getNextStatusAfterAssetUpload,
  getNextStatusAfterJobSelection,
  getNextStatusAfterSongSelection,
} from "./session-state";

describe("session state transitions", () => {
  it("advances through the creation setup states", () => {
    expect(getNextStatusAfterAssetUpload()).toBe("assets_ready");
    expect(getNextStatusAfterJobSelection()).toBe("job_selected");
    expect(getNextStatusAfterSongSelection()).toBe("song_selected");
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
});

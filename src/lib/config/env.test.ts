import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

describe("readEnv", () => {
  it("treats blank optional URL values as missing in mock mode", () => {
    const env = readEnv({
      MEDIA_PROVIDER_MODE: "mock",
      LYRICS_API_URL: "",
      LIPSYNC_CREATE_URL: "",
    });

    expect(env.LYRICS_API_URL).toBeUndefined();
    expect(env.LIPSYNC_CREATE_URL).toBeUndefined();
  });

  it("requires real provider environment when media provider mode is real", () => {
    expect(() => readEnv({ MEDIA_PROVIDER_MODE: "real" })).toThrow(
      "Missing real media provider env",
    );
  });

  it("requires raspberry pi url when hardware mode is raspberry", () => {
    expect(() => readEnv({ HARDWARE_MODE: "raspberry" })).toThrow(
      "RASPBERRY_PI_URL is required when HARDWARE_MODE is raspberry",
    );
  });
});

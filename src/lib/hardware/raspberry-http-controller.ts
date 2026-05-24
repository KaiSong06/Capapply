import { readFile } from "node:fs/promises";
import type { HardwareController, HardwarePlayback } from "./contracts";

export function createRaspberryHttpController(input: {
  baseUrl: string;
  motorMoveMs: number;
  fetchImpl?: typeof fetch;
}): HardwareController {
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async playSong(playback) {
      const buffer = await readFile(playback.artifact.path);
      const form = new FormData();
      form.append(
        "audio",
        new Blob([buffer], { type: playback.artifact.contentType }),
        playback.artifact.filename,
      );
      form.append("sessionId", playback.sessionId);

      const response = await fetchImpl(`${baseUrl}/play`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Raspberry Pi playback failed (${response.status}): ${detail || response.statusText}`,
        );
      }
    },

    async moveMotor() {
      const response = await fetchImpl(`${baseUrl}/motor/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          durationMs: input.motorMoveMs,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Raspberry Pi motor move failed (${response.status}): ${detail || response.statusText}`,
        );
      }
    },
  };
}

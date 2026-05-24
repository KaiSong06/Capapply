import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaspberryHttpController } from "./raspberry-http-controller";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-hardware-"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRaspberryHttpController", () => {
  it("posts audio to /play then motor move to /motor/move", async () => {
    const audioPath = path.join(root, "converted-vocal.m4a");
    await writeFile(audioPath, Buffer.from("audio-bytes"));

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/play")) {
        expect(init?.method).toBe("POST");
        return new Response("{}", { status: 200 });
      }

      if (url.endsWith("/motor/move")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ durationMs: 1500 }));
        return new Response("{}", { status: 200 });
      }

      return new Response("not found", { status: 404 });
    });

    const controller = createRaspberryHttpController({
      baseUrl: "http://pi.local:8765",
      motorMoveMs: 1500,
      fetchImpl: fetchMock as typeof fetch,
    });

    await controller.playSong({
      sessionId: "session-1",
      artifact: {
        id: "converted-1",
        kind: "converted_vocal",
        filename: "converted-vocal.m4a",
        contentType: "audio/mp4",
        path: audioPath,
        createdAt: "2026-05-24T00:00:00.000Z",
      },
    });
    await controller.moveMotor();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://pi.local:8765/play");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://pi.local:8765/motor/move");
  });
});

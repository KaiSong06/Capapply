import type { HardwareController, HardwarePlayback } from "./contracts";

export type MockHardwareCall =
  | { type: "playSong"; playback: HardwarePlayback }
  | { type: "moveMotor" };

export function createMockHardwareController(input?: {
  calls?: MockHardwareCall[];
}): HardwareController & { calls: MockHardwareCall[] } {
  const calls = input?.calls ?? [];

  return {
    calls,
    async playSong(playback) {
      calls.push({ type: "playSong", playback });
    },
    async moveMotor() {
      calls.push({ type: "moveMotor" });
    },
  };
}

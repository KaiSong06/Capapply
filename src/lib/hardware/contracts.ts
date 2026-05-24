import type { ArtifactRef, CreationSession } from "../domain/types";

export type HardwarePlayback = {
  artifact: ArtifactRef;
  sessionId: string;
};

export type HardwareController = {
  playSong(playback: HardwarePlayback): Promise<void>;
  moveMotor(): Promise<void>;
};

export function resolvePlaybackArtifact(
  session: CreationSession,
  artifacts: ArtifactRef[],
): ArtifactRef | null {
  const converted = artifacts.find((artifact) => artifact.kind === "converted_vocal");
  if (converted) {
    return converted;
  }

  if (session.selectedSong?.type === "upload") {
    return session.selectedSong.artifact;
  }

  return null;
}

import type { CreationStatus } from "./types";

const allowedTransitions: Record<CreationStatus, CreationStatus[]> = {
  draft: ["assets_ready", "failed"],
  assets_ready: ["job_selected", "song_selected", "failed"],
  job_selected: ["song_selected", "failed"],
  song_selected: ["generating", "failed"],
  generating: ["ready", "failed"],
  ready: [],
  failed: [],
};

export function canTransition(from: CreationStatus, to: CreationStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function transitionStatus(
  from: CreationStatus,
  to: CreationStatus,
): CreationStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid session status transition: ${from} -> ${to}`);
  }

  return to;
}

export function getNextStatusAfterAssetUpload(
  from: CreationStatus,
): CreationStatus {
  return transitionStatus(from, "assets_ready");
}

export function getNextStatusAfterJobSelection(
  from: CreationStatus,
): CreationStatus {
  return transitionStatus(from, "job_selected");
}

export function getNextStatusAfterSongSelection(
  from: CreationStatus,
): CreationStatus {
  return transitionStatus(from, "song_selected");
}

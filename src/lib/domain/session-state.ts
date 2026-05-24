import type { CreationStatus } from "./types";

const allowedTransitions: Record<CreationStatus, CreationStatus[]> = {
  draft: ["assets_ready", "failed"],
  assets_ready: ["job_selected", "failed"],
  job_selected: ["song_selected", "failed"],
  song_selected: ["generating", "failed"],
  generating: ["ready", "failed"],
  ready: [],
  failed: [],
};

export function canTransition(from: CreationStatus, to: CreationStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function getNextStatusAfterAssetUpload(): CreationStatus {
  return "assets_ready";
}

export function getNextStatusAfterJobSelection(): CreationStatus {
  return "job_selected";
}

export function getNextStatusAfterSongSelection(): CreationStatus {
  return "song_selected";
}

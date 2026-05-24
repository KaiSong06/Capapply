export type CreationStatus =
  | "draft"
  | "assets_ready"
  | "job_selected"
  | "song_selected"
  | "generating"
  | "ready"
  | "failed";

export type GenerationStep =
  | "idle"
  | "parsing_resume"
  | "fetching_media"
  | "writing_lyrics"
  | "separating_instrumental"
  | "creating_guide_vocal"
  | "converting_voice"
  | "creating_lipsync_video"
  | "rendering_final_video"
  | "complete";

export type ArtifactKind =
  | "resume"
  | "voice_sample"
  | "face_media"
  | "uploaded_track"
  | "parsed_resume"
  | "parody_brief"
  | "lyrics"
  | "instrumental_track"
  | "guide_vocal"
  | "converted_vocal"
  | "mixed_audio"
  | "lip_sync_video"
  | "final_video";

export type ArtifactRef = {
  id: string;
  kind: ArtifactKind;
  filename: string;
  contentType: string;
  path: string;
  createdAt: string;
};

export type CompanyConfig = {
  company: string;
  boardToken: string;
};

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  boardToken: string;
  location: string;
  content: string;
  absoluteUrl: string;
  updatedAt: string | null;
};

export type TrackProcessability = {
  processable: boolean;
  reason: "downloadable" | "direct_audio_url" | "not_permitted" | "unknown";
  audioUrl: string | null;
};

export type NormalizedTrack = {
  id: string;
  title: string;
  artist: string;
  durationMs: number | null;
  artworkUrl: string | null;
  sourceUrl: string;
  processability: TrackProcessability;
};

export type SelectedSong =
  | { type: "soundcloud"; track: NormalizedTrack }
  | { type: "upload"; artifact: ArtifactRef; title: string };

export type StepError = {
  step: GenerationStep;
  message: string;
  retryable: boolean;
  occurredAt: string;
};

export type CreationSession = {
  id: string;
  status: CreationStatus;
  generationStep: GenerationStep;
  createdAt: string;
  updatedAt: string;
  artifacts: ArtifactRef[];
  parsedResumeText: string | null;
  selectedCompany: CompanyConfig | null;
  selectedJob: NormalizedJob | null;
  selectedSong: SelectedSong | null;
  finalVideo: ArtifactRef | null;
  error: StepError | null;
};

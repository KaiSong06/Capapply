# Capapply Curated Wow Demo Design

## Summary

Capapply's MVP is a curated, high-quality end-to-end demo that creates a short parody application video. A user uploads a resume, voice sample, and face image or short face video; selects a live job from a curated list of Greenhouse companies; searches SoundCloud for a processable track; and receives a generated MP4 with parody lyrics, converted vocals, lip-synced face video, and final audio/video mix.

The MVP optimizes for wow factor over breadth. It should support fewer cases well rather than accepting every job, every song, or full-length tracks with unreliable output.

## Goals

- Provide an automated user-facing flow with no raw URL, token, or provider-detail entry.
- Fetch jobs through the Greenhouse Job Board API using curated company board tokens.
- Search SoundCloud in-app and only allow generation from downloadable or otherwise processable tracks.
- Offer user audio upload only when SoundCloud cannot provide a processable track.
- Generate a short, impressive parody application video from candidate assets, resume content, job content, and song context.
- Keep provider-specific code behind adapters so source separation, voice conversion, lip-sync, and rendering providers can change.

## Non-Goals

- Full-song parody generation.
- Applying to jobs or submitting Greenhouse applications.
- User accounts, billing, public sharing, or collaboration.
- Global Greenhouse job search across unknown companies.
- A manual pipeline editor for lyrics, stems, vocals, video, or rendering.
- Strong public-production identity verification.
- Processing arbitrary copyrighted SoundCloud tracks when the API or uploader does not permit processing.

## Product Flow

1. The user uploads candidate assets: resume, voice sample, and face image or short face video.
2. The user confirms, with a lightweight internal-demo checkbox, that uploaded face and voice assets are theirs or permissioned.
3. The user selects a company from a curated list.
4. The backend fetches live Greenhouse jobs for that company's board token and shows the available roles.
5. The user selects a job.
6. The user searches SoundCloud in-app.
7. The app shows search results with processability state and only allows processable tracks to continue.
8. If no selected track is processable, the app offers user-owned audio upload as recovery.
9. The app generates a parody brief and lyrics from the resume, job, and song context.
10. The app prepares instrumentals, creates a guide vocal, converts the vocal toward the uploaded user voice, generates a lip-synced talking/singing-head video, mixes final audio, combines audio and video, and exports an MP4.
11. The user previews and downloads the final video.

## UX Shape

The UI should feel like a guided creator, not a technical workbench. It should have clear steps for assets, job, song, generation progress, and export. Long-running stages should be shown as polished progress states with human-readable labels such as "writing parody lyrics," "building the performance," and "rendering final video."

The happy path stays automated. Recovery appears only when the app cannot proceed.

## Architecture

The app is split into five bounded areas.

### Frontend Creation Flow

The frontend owns the multi-step creation experience:

- Candidate asset upload.
- Curated company selection.
- Live job selection.
- SoundCloud search and processability display.
- Generation progress.
- Final preview and export.

The frontend does not call Greenhouse, SoundCloud, ElevenLabs, lip-sync providers, or media tools directly.

### App Backend

The backend owns:

- Creation sessions.
- Uploaded files and generated artifacts.
- Provider credentials.
- API calls through adapters.
- Async generation jobs.
- Progress and error state.
- Final export metadata.

### Discovery Adapters

`GreenhouseAdapter` accepts a curated company board token and returns normalized job posts with title, company, location, content, source URL, and job ID.

`SoundCloudAdapter` accepts a search query and returns normalized tracks with title, artist, duration, artwork, source URL, and processability state. Tracks that are not processable remain visible but disabled for generation.

### Generation Adapters

Generation providers are hidden behind stable interfaces:

- Resume parsing.
- Parody brief and lyric generation.
- Source separation or instrumental extraction.
- Guide vocal generation.
- ElevenLabs voice conversion.
- Lip-sync talking/singing-head video generation through a hosted provider.
- Final FFmpeg-based media composition.

The orchestration layer should call methods such as `searchTracks`, `fetchJobs`, `generateLyrics`, `separateInstrumental`, `createGuideVocal`, `convertVoice`, `createLipSyncVideo`, and `renderFinalVideo`.

### Job Orchestration

Generation is asynchronous. The backend creates a generation job, runs stages in order, stores intermediate artifacts, updates progress, retries recoverable failures, and exposes the final output when ready.

## Data Model

The core object is a creation session.

Session fields:

- Candidate asset references: resume, voice sample, face media.
- Parsed resume text and highlights.
- Selected company and Greenhouse board token.
- Selected job snapshot.
- Selected song snapshot or uploaded track artifact.
- Current status.
- Current generation step.
- Intermediate artifact references.
- Final video reference.
- Step-specific errors.

Status model:

- `draft`
- `assets_ready`
- `job_selected`
- `song_selected`
- `generating`
- `ready`
- `failed`

Generation artifacts:

- `parsed_resume`
- `parody_brief`
- `lyrics`
- `instrumental_track`
- `guide_vocal`
- `converted_vocal`
- `mixed_audio`
- `lip_sync_video`
- `final_video`

## Job Discovery

Greenhouse does not provide a global search API for every company. The MVP uses a curated company list with known board tokens, for example:

```json
[
  { "company": "Example Company", "boardToken": "example" }
]
```

The user sees company names, not board tokens. When a company is selected, the backend calls:

```text
GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
```

The app stores a snapshot of the selected job content so generation remains stable even if the external job post changes during processing.

## Song Discovery And Eligibility

The MVP uses open SoundCloud search with an eligibility filter. The user can search broadly, but only downloadable or otherwise processable tracks can proceed into generation.

Each SoundCloud result should show:

- Track title.
- Artist/uploader.
- Duration.
- Artwork when available.
- Processability state.
- A clear disabled state when processing is not allowed.

If a selected or desired track is not processable, the app offers user-owned audio upload as the recovery path. Upload is not part of the primary happy path.

## Audio And Video Generation

The target output is a short clip, likely 15-30 seconds. This keeps runtime, provider cost, and quality risk manageable.

The audio pipeline:

1. Analyze resume highlights and job requirements.
2. Generate a parody brief with role, strengths, tone, hooks, and song structure hints.
3. Generate lyrics for the selected clip length.
4. Produce or retrieve the instrumental track through source separation or eligible instrumental audio.
5. Create a guide vocal that follows the intended melody and rhythm.
6. Use ElevenLabs voice conversion to transform the guide vocal toward the uploaded user voice.
7. Mix converted vocal with instrumental audio.

ElevenLabs is used for voice conversion rather than assuming direct singing synthesis from a professional voice clone. This matches the current practical constraint that professional voice clones do not currently support singing.

The video pipeline:

1. Submit the user's face media and converted vocal to a hosted lip-sync provider.
2. Receive a talking/singing-head performance clip.
3. Compose the lip-sync video with the mixed audio.
4. Export MP4.

## Error Handling

The happy path should remain automated. Recovery is shown only when required.

- If a Greenhouse company has no active jobs, show an empty state and let the user pick another curated company.
- If Greenhouse fetching fails, retry once and keep the user in the job-selection step.
- If a SoundCloud result is not processable, disable generation for that track and explain that processing is not permitted.
- If no processable SoundCloud results are found, suggest a different query and offer user-owned audio upload.
- If source separation fails, retry once. If it still fails, mark generation failed rather than producing a weak export.
- If guide vocal or voice conversion fails, retry once. Guide-vocal-only output may be retained as a debug artifact but should not count as user-facing success.
- If lip-sync video generation fails, retry once. Audio-only export may be retained as an internal debug artifact but should not count as user-facing success.
- If final rendering fails, retry FFmpeg composition and preserve intermediate artifacts for debugging.

## Privacy And Consent

The MVP is an internal demo with lightweight consent. It still handles sensitive inputs: resumes, face media, and voice samples.

The app should:

- Store uploads and generated artifacts as private session assets.
- Avoid public sharing in the MVP.
- Make cleanup of session artifacts straightforward for development and later production hardening.

## Testing Strategy

- Unit tests for Greenhouse normalization.
- Unit tests for SoundCloud processability and disabled-result behavior.
- Unit tests for session status transitions.
- Mock-provider orchestration tests for successful generation and step-specific failures.
- Integration test for Greenhouse fetching with a known board token.
- Contract or integration test for SoundCloud search normalization.
- FFmpeg smoke test using fixture audio and video.
- End-to-end browser test for the creation flow with mocked generation providers.
- One manual real-provider demo script for validating the full wow path before sharing.

## References

- Greenhouse Job Board API: https://developers.greenhouse.io/job-board.html
- SoundCloud API guide: https://developers.soundcloud.com/docs/api/
- SoundCloud downloading help: https://help.soundcloud.com/hc/en-us/articles/115003448787-Downloading-tracks
- SoundCloud Terms of Use: https://soundcloud.com/terms-of-use
- ElevenLabs voice changer docs: https://elevenlabs.io/docs/overview/capabilities/voice-changer
- ElevenLabs professional voice cloning docs: https://elevenlabs.io/docs/creative-platform/voices/voice-cloning/professional-voice-cloning

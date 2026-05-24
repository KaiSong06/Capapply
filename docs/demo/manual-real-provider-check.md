# Manual Real Provider Check

1. Copy `.env.example` to `.env.local`.
2. Set `MEDIA_PROVIDER_MODE=real`.
3. Add RapidAPI, ElevenLabs, lyrics, source-separation, and lip-sync provider credentials.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.
6. Upload a text resume, a voice sample, and a face image or short face clip.
7. Select Stripe or Datadog.
8. Choose a live Greenhouse job.
9. Search SoundCloud for a processable track.
10. If search returns no processable track, upload a user-owned audio file.
11. Click Generate.
12. Confirm the app reaches Ready.
13. Download the MP4.
14. Play the MP4 locally and confirm it contains video and audio.

Notes:

- Real mode assumes `ELEVENLABS_VOICE_ID` already points at the permitted voice to use for guide-vocal creation and voice conversion.
- `SOURCE_SEPARATION_URL` may return audio bytes directly or JSON with one of `instrumentalUrl`, `instrumental_url`, `audioUrl`, or `audio_url`.
- `LIPSYNC_CREATE_URL` may return a direct video URL or a job id. If it returns a job id, `LIPSYNC_STATUS_URL` should either contain `{id}` or accept `?id=...`.

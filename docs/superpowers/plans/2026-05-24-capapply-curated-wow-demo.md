# Capapply Curated Wow Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working local MVP of the Capapply curated wow demo: upload candidate assets, fetch live Greenhouse jobs from curated companies, search SoundCloud with processability filtering, run an async generation pipeline, preview, and export a short MP4.

**Architecture:** Use a Next.js full-stack app with server-side API routes, file-backed local session/artifact storage, typed provider adapters, and an async orchestration layer. Build the product as a working end-to-end app with mock media providers first, then swap real provider adapters behind the same contracts.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Zod, Vitest, Testing Library, Playwright, Node file storage, FFmpeg, Greenhouse Job Board API, RapidAPI SoundCloud adapter, ElevenLabs speech-to-speech adapter, configurable hosted lip-sync/source-separation adapters.

---

## Scope Check

The approved spec spans several subsystems: discovery, uploads, orchestration, media generation, provider integrations, and export. This plan keeps them in one document but splits implementation into testable milestones:

1. App foundation and domain model.
2. Real job/song discovery with mocked media generation.
3. FFmpeg export and user-facing preview/download.
4. Real provider adapter wiring through environment-configured clients.

The first completed milestone should already run locally with mocked generation and a downloadable MP4. Real provider keys and exact hosted provider endpoints are added only through adapter files; no frontend code should change for that swap.

## File Structure

Create or modify these files:

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript configuration from Next.js scaffold.
- `next.config.ts`: Next.js configuration.
- `vitest.config.ts`: Vitest configuration.
- `playwright.config.ts`: Playwright configuration.
- `.env.example`: required local environment variables.
- `.gitignore`: ignore local artifacts and OS metadata.
- `src/app/layout.tsx`: root layout.
- `src/app/page.tsx`: creation flow entry point.
- `src/app/api/companies/route.ts`: curated company list endpoint.
- `src/app/api/companies/[boardToken]/jobs/route.ts`: live Greenhouse jobs endpoint.
- `src/app/api/soundcloud/search/route.ts`: SoundCloud search endpoint.
- `src/app/api/sessions/route.ts`: session creation endpoint.
- `src/app/api/sessions/[sessionId]/route.ts`: session read endpoint.
- `src/app/api/sessions/[sessionId]/assets/route.ts`: upload endpoint.
- `src/app/api/sessions/[sessionId]/select-job/route.ts`: job snapshot selection endpoint.
- `src/app/api/sessions/[sessionId]/select-song/route.ts`: song selection endpoint.
- `src/app/api/sessions/[sessionId]/upload-track/route.ts`: user-owned audio fallback endpoint.
- `src/app/api/sessions/[sessionId]/generate/route.ts`: starts generation.
- `src/app/api/sessions/[sessionId]/download/route.ts`: final MP4 download endpoint.
- `src/components/creator/CreatorFlow.tsx`: step orchestration component.
- `src/components/creator/AssetStep.tsx`: candidate asset upload step.
- `src/components/creator/JobStep.tsx`: curated company and job selection.
- `src/components/creator/SongStep.tsx`: SoundCloud search and upload recovery.
- `src/components/creator/ProgressStep.tsx`: generation status display.
- `src/components/creator/ExportStep.tsx`: final preview/download.
- `src/lib/client/api.ts`: typed frontend API client.
- `src/lib/config/companies.ts`: curated Greenhouse companies.
- `src/lib/config/env.ts`: server environment parsing.
- `src/lib/domain/types.ts`: shared domain types.
- `src/lib/domain/session-state.ts`: session status transitions.
- `src/lib/adapters/greenhouse.ts`: Greenhouse API adapter.
- `src/lib/adapters/soundcloud.ts`: RapidAPI SoundCloud adapter.
- `src/lib/storage/artifacts.ts`: local file artifact storage.
- `src/lib/storage/sessions.ts`: local JSON session storage.
- `src/lib/generation/contracts.ts`: provider contracts.
- `src/lib/generation/mock-providers.ts`: deterministic mock generation providers.
- `src/lib/generation/orchestrator.ts`: generation pipeline.
- `src/lib/generation/ffmpeg-renderer.ts`: final composition.
- `src/lib/generation/providers/elevenlabs-voice-conversion.ts`: ElevenLabs speech-to-speech client.
- `src/lib/generation/providers/http-source-separation.ts`: configurable source-separation client.
- `src/lib/generation/providers/http-lipsync.ts`: configurable lip-sync client.
- `src/lib/generation/providers/http-lyrics.ts`: configurable lyrics client.
- `src/test/fixtures/greenhouse-jobs.json`: Greenhouse fixture.
- `src/test/fixtures/soundcloud-search.json`: SoundCloud fixture.
- `src/test/fixtures/sample-resume.txt`: resume fixture.
- `e2e/creator-flow.spec.ts`: browser flow test.
- `docs/demo/manual-real-provider-check.md`: manual real-provider validation script.

## Environment Contract

Create `.env.example` with these values:

```bash
ARTIFACT_ROOT=var/capapply
MEDIA_PROVIDER_MODE=mock

RAPIDAPI_KEY=
SOUNDCLOUD_SEARCH_URL=https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks
SOUNDCLOUD_RAPIDAPI_HOST=soundcloud-scraper.p.rapidapi.com

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

LYRICS_API_URL=
LYRICS_API_KEY=
SOURCE_SEPARATION_URL=
SOURCE_SEPARATION_API_KEY=
LIPSYNC_CREATE_URL=
LIPSYNC_STATUS_URL=
LIPSYNC_API_KEY=
```

Provider mode rules:

- `MEDIA_PROVIDER_MODE=mock` uses deterministic local artifacts for lyric, vocal, separation, voice conversion, and lip-sync steps.
- `MEDIA_PROVIDER_MODE=real` uses HTTP provider adapters. The app should fail startup env parsing if a required real-provider variable is missing.

## Task 1: Scaffold Next.js App And Test Tooling

**Files:**
- Create: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/test/smoke.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold the app**

Run:

```bash
npm create next-app@latest . -- --ts --eslint --app --src-dir --tailwind --import-alias "@/*"
```

Expected: Next.js files are created under `src/`, and `package.json` exists.

- [ ] **Step 2: Install test and runtime libraries**

Run:

```bash
npm install zod uuid
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

Expected: `package-lock.json` updates and installs finish without dependency resolution errors.

- [ ] **Step 3: Add test scripts**

Edit `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Step 5: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

- [ ] **Step 6: Add smoke test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test runner", () => {
  it("runs unit tests", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Expand `.gitignore`**

Ensure `.gitignore` contains:

```gitignore
.superpowers/
.DS_Store
docs/.DS_Store
docs/superpowers/.DS_Store
var/
.env.local
playwright-report/
test-results/
```

- [ ] **Step 8: Verify tests**

Run:

```bash
npm run test:run
```

Expected: PASS for `src/test/smoke.test.ts`.

- [ ] **Step 9: Commit**

Run:

```bash
git add .gitignore package.json package-lock.json next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs src vitest.config.ts playwright.config.ts
git commit -m "chore: scaffold capapply app"
```

## Task 2: Domain Types And Session State

**Files:**
- Create: `src/lib/domain/types.ts`
- Create: `src/lib/domain/session-state.ts`
- Create: `src/lib/domain/session-state.test.ts`

- [ ] **Step 1: Write failing session-state tests**

Create `src/lib/domain/session-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canTransition, getNextStatusAfterAssetUpload, getNextStatusAfterJobSelection, getNextStatusAfterSongSelection } from "./session-state";

describe("session state transitions", () => {
  it("advances through the creation setup states", () => {
    expect(getNextStatusAfterAssetUpload()).toBe("assets_ready");
    expect(getNextStatusAfterJobSelection()).toBe("job_selected");
    expect(getNextStatusAfterSongSelection()).toBe("song_selected");
  });

  it("allows only explicit status transitions", () => {
    expect(canTransition("draft", "assets_ready")).toBe(true);
    expect(canTransition("assets_ready", "job_selected")).toBe(true);
    expect(canTransition("job_selected", "song_selected")).toBe(true);
    expect(canTransition("song_selected", "generating")).toBe(true);
    expect(canTransition("generating", "ready")).toBe(true);
    expect(canTransition("generating", "failed")).toBe(true);
    expect(canTransition("ready", "generating")).toBe(false);
    expect(canTransition("draft", "ready")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test:run -- src/lib/domain/session-state.test.ts
```

Expected: FAIL because `session-state.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `src/lib/domain/types.ts`:

```ts
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
```

- [ ] **Step 4: Add transition helpers**

Create `src/lib/domain/session-state.ts`:

```ts
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
```

- [ ] **Step 5: Verify tests**

Run:

```bash
npm run test:run -- src/lib/domain/session-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/domain
git commit -m "feat: add creation session domain model"
```

## Task 3: File-Backed Session And Artifact Storage

**Files:**
- Create: `src/lib/storage/sessions.ts`
- Create: `src/lib/storage/sessions.test.ts`
- Create: `src/lib/storage/artifacts.ts`
- Create: `src/lib/storage/artifacts.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `src/lib/storage/sessions.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionStore } from "./sessions";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-sessions-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("session store", () => {
  it("creates, reads, and updates a session", async () => {
    const store = createSessionStore(root);
    const session = await store.create();

    expect(session.status).toBe("draft");
    expect(session.artifacts).toEqual([]);

    const updated = await store.update(session.id, { status: "assets_ready" });
    expect(updated.status).toBe("assets_ready");

    const found = await store.get(session.id);
    expect(found?.id).toBe(session.id);
    expect(found?.status).toBe("assets_ready");
  });
});
```

Create `src/lib/storage/artifacts.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactStore } from "./artifacts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-artifacts-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("artifact store", () => {
  it("stores a session artifact on disk", async () => {
    const store = createArtifactStore(root);
    const artifact = await store.putBuffer("session-1", {
      kind: "resume",
      filename: "resume.txt",
      contentType: "text/plain",
      buffer: Buffer.from("Senior product engineer"),
    });

    expect(artifact.kind).toBe("resume");
    expect(artifact.filename).toBe("resume.txt");
    expect(await readFile(artifact.path, "utf8")).toBe("Senior product engineer");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test:run -- src/lib/storage
```

Expected: FAIL because storage modules do not exist.

- [ ] **Step 3: Implement artifact storage**

Create `src/lib/storage/artifacts.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ArtifactKind, ArtifactRef } from "@/lib/domain/types";

export type PutArtifactInput = {
  kind: ArtifactKind;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export function createArtifactStore(root: string) {
  return {
    async putBuffer(sessionId: string, input: PutArtifactInput): Promise<ArtifactRef> {
      const id = randomUUID();
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const dir = path.join(root, "sessions", sessionId, "artifacts");
      const filePath = path.join(dir, `${id}-${safeName}`);

      await mkdir(dir, { recursive: true });
      await writeFile(filePath, input.buffer);

      return {
        id,
        kind: input.kind,
        filename: input.filename,
        contentType: input.contentType,
        path: filePath,
        createdAt: new Date().toISOString(),
      };
    },
  };
}
```

- [ ] **Step 4: Implement session storage**

Create `src/lib/storage/sessions.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CreationSession } from "@/lib/domain/types";

export type SessionPatch = Partial<Omit<CreationSession, "id" | "createdAt">>;

function sessionPath(root: string, sessionId: string): string {
  return path.join(root, "sessions", sessionId, "session.json");
}

function createEmptySession(): CreationSession {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    status: "draft",
    generationStep: "idle",
    createdAt: now,
    updatedAt: now,
    artifacts: [],
    parsedResumeText: null,
    selectedCompany: null,
    selectedJob: null,
    selectedSong: null,
    finalVideo: null,
    error: null,
  };
}

export function createSessionStore(root: string) {
  async function save(session: CreationSession): Promise<CreationSession> {
    const file = sessionPath(root, session.id);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(session, null, 2));
    return session;
  }

  return {
    async create(): Promise<CreationSession> {
      return save(createEmptySession());
    },

    async get(sessionId: string): Promise<CreationSession | null> {
      try {
        const raw = await readFile(sessionPath(root, sessionId), "utf8");
        return JSON.parse(raw) as CreationSession;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },

    async update(sessionId: string, patch: SessionPatch): Promise<CreationSession> {
      const current = await this.get(sessionId);
      if (!current) throw new Error(`Session not found: ${sessionId}`);

      return save({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    },
  };
}
```

- [ ] **Step 5: Verify tests**

Run:

```bash
npm run test:run -- src/lib/storage
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/storage
git commit -m "feat: add local session artifact storage"
```

## Task 4: Greenhouse Company And Job Discovery

**Files:**
- Create: `src/lib/config/companies.ts`
- Create: `src/lib/adapters/greenhouse.ts`
- Create: `src/lib/adapters/greenhouse.test.ts`
- Create: `src/test/fixtures/greenhouse-jobs.json`
- Create: `src/app/api/companies/route.ts`
- Create: `src/app/api/companies/[boardToken]/jobs/route.ts`

- [ ] **Step 1: Add Greenhouse fixture**

Create `src/test/fixtures/greenhouse-jobs.json`:

```json
{
  "jobs": [
    {
      "id": 123,
      "title": "Product Engineer",
      "updated_at": "2026-05-01T12:00:00Z",
      "location": { "name": "New York, NY" },
      "absolute_url": "https://boards.greenhouse.io/example/jobs/123",
      "content": "Build useful product features for customers."
    }
  ],
  "meta": { "total": 1 }
}
```

- [ ] **Step 2: Write failing Greenhouse adapter test**

Create `src/lib/adapters/greenhouse.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import fixture from "@/test/fixtures/greenhouse-jobs.json";
import { fetchGreenhouseJobs, normalizeGreenhouseJobs } from "./greenhouse";

describe("greenhouse adapter", () => {
  it("normalizes Greenhouse jobs", () => {
    const jobs = normalizeGreenhouseJobs({
      company: "Example",
      boardToken: "example",
      payload: fixture,
    });

    expect(jobs).toEqual([
      {
        id: "123",
        title: "Product Engineer",
        company: "Example",
        boardToken: "example",
        location: "New York, NY",
        content: "Build useful product features for customers.",
        absoluteUrl: "https://boards.greenhouse.io/example/jobs/123",
        updatedAt: "2026-05-01T12:00:00Z",
      },
    ]);
  });

  it("fetches jobs with content enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    });

    const jobs = await fetchGreenhouseJobs({
      company: "Example",
      boardToken: "example",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledWith("https://boards-api.greenhouse.io/v1/boards/example/jobs?content=true");
    expect(jobs[0]?.title).toBe("Product Engineer");
  });
});
```

- [ ] **Step 3: Run failing Greenhouse test**

Run:

```bash
npm run test:run -- src/lib/adapters/greenhouse.test.ts
```

Expected: FAIL because `greenhouse.ts` does not exist.

- [ ] **Step 4: Add curated companies**

Create `src/lib/config/companies.ts`:

```ts
import type { CompanyConfig } from "@/lib/domain/types";

export const curatedCompanies: CompanyConfig[] = [
  { company: "Stripe", boardToken: "stripe" },
  { company: "Datadog", boardToken: "datadog" },
];

export function findCompanyByBoardToken(boardToken: string): CompanyConfig | null {
  return curatedCompanies.find((company) => company.boardToken === boardToken) ?? null;
}
```

- [ ] **Step 5: Implement Greenhouse adapter**

Create `src/lib/adapters/greenhouse.ts`:

```ts
import { z } from "zod";
import type { NormalizedJob } from "@/lib/domain/types";

const greenhouseJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  updated_at: z.string().nullable().optional(),
  location: z.object({ name: z.string().optional() }).nullable().optional(),
  absolute_url: z.string().optional(),
  content: z.string().optional(),
});

const greenhouseJobsResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema),
});

export function normalizeGreenhouseJobs(input: {
  company: string;
  boardToken: string;
  payload: unknown;
}): NormalizedJob[] {
  const parsed = greenhouseJobsResponseSchema.parse(input.payload);

  return parsed.jobs.map((job) => ({
    id: String(job.id),
    title: job.title,
    company: input.company,
    boardToken: input.boardToken,
    location: job.location?.name ?? "Location not listed",
    content: job.content ?? "",
    absoluteUrl: job.absolute_url ?? `https://boards.greenhouse.io/${input.boardToken}/jobs/${job.id}`,
    updatedAt: job.updated_at ?? null,
  }));
}

export async function fetchGreenhouseJobs(input: {
  company: string;
  boardToken: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedJob[]> {
  const fetcher = input.fetchImpl ?? fetch;
  const url = `https://boards-api.greenhouse.io/v1/boards/${input.boardToken}/jobs?content=true`;
  const response = await fetcher(url);

  if (!response.ok) {
    throw new Error(`Greenhouse request failed for ${input.boardToken}: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeGreenhouseJobs({
    company: input.company,
    boardToken: input.boardToken,
    payload,
  });
}
```

- [ ] **Step 6: Add company API routes**

Create `src/app/api/companies/route.ts`:

```ts
import { NextResponse } from "next/server";
import { curatedCompanies } from "@/lib/config/companies";

export async function GET() {
  return NextResponse.json({ companies: curatedCompanies });
}
```

Create `src/app/api/companies/[boardToken]/jobs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { fetchGreenhouseJobs } from "@/lib/adapters/greenhouse";
import { findCompanyByBoardToken } from "@/lib/config/companies";

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardToken: string }> },
) {
  const { boardToken } = await context.params;
  const company = findCompanyByBoardToken(boardToken);

  if (!company) {
    return NextResponse.json({ error: "Unknown company" }, { status: 404 });
  }

  const jobs = await fetchGreenhouseJobs(company);
  return NextResponse.json({ jobs });
}
```

- [ ] **Step 7: Verify Greenhouse tests**

Run:

```bash
npm run test:run -- src/lib/adapters/greenhouse.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/config/companies.ts src/lib/adapters/greenhouse.ts src/lib/adapters/greenhouse.test.ts src/test/fixtures/greenhouse-jobs.json src/app/api/companies
git commit -m "feat: add greenhouse job discovery"
```

## Task 5: SoundCloud Search And Processability

**Files:**
- Create: `src/lib/config/env.ts`
- Create: `.env.example`
- Create: `src/lib/adapters/soundcloud.ts`
- Create: `src/lib/adapters/soundcloud.test.ts`
- Create: `src/test/fixtures/soundcloud-search.json`
- Create: `src/app/api/soundcloud/search/route.ts`

- [ ] **Step 1: Add SoundCloud fixture**

Create `src/test/fixtures/soundcloud-search.json`:

```json
{
  "collection": [
    {
      "id": 1,
      "title": "Downloadable Pop Instrumental",
      "user": { "username": "Beat Maker" },
      "duration": 24000,
      "artwork_url": "https://example.com/artwork.jpg",
      "permalink_url": "https://soundcloud.com/beat-maker/downloadable-pop",
      "downloadable": true,
      "download_url": "https://api.soundcloud.com/tracks/1/download"
    },
    {
      "id": 2,
      "title": "Stream Only Track",
      "user": { "username": "Uploader" },
      "duration": 25000,
      "artwork_url": null,
      "permalink_url": "https://soundcloud.com/uploader/stream-only",
      "downloadable": false
    }
  ]
}
```

- [ ] **Step 2: Write failing SoundCloud test**

Create `src/lib/adapters/soundcloud.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import fixture from "@/test/fixtures/soundcloud-search.json";
import { normalizeSoundCloudSearch, searchSoundCloudTracks } from "./soundcloud";

describe("soundcloud adapter", () => {
  it("marks downloadable tracks as processable and stream-only tracks as disabled", () => {
    const tracks = normalizeSoundCloudSearch(fixture);

    expect(tracks[0]?.processability).toEqual({
      processable: true,
      reason: "downloadable",
      audioUrl: "https://api.soundcloud.com/tracks/1/download",
    });
    expect(tracks[1]?.processability).toEqual({
      processable: false,
      reason: "not_permitted",
      audioUrl: null,
    });
  });

  it("calls the configured RapidAPI search endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    });

    await searchSoundCloudTracks({
      query: "pop",
      searchUrl: "https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks",
      rapidApiKey: "test-key",
      rapidApiHost: "soundcloud-scraper.p.rapidapi.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("q=pop");
    expect(init.headers["x-rapidapi-key"]).toBe("test-key");
    expect(init.headers["x-rapidapi-host"]).toBe("soundcloud-scraper.p.rapidapi.com");
  });
});
```

- [ ] **Step 3: Run failing SoundCloud test**

Run:

```bash
npm run test:run -- src/lib/adapters/soundcloud.test.ts
```

Expected: FAIL because `soundcloud.ts` does not exist.

- [ ] **Step 4: Add env parsing**

Create `src/lib/config/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  ARTIFACT_ROOT: z.string().default("var/capapply"),
  MEDIA_PROVIDER_MODE: z.enum(["mock", "real"]).default("mock"),
  RAPIDAPI_KEY: z.string().optional(),
  SOUNDCLOUD_SEARCH_URL: z.string().url().default("https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks"),
  SOUNDCLOUD_RAPIDAPI_HOST: z.string().default("soundcloud-scraper.p.rapidapi.com"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  LYRICS_API_URL: z.string().url().optional(),
  LYRICS_API_KEY: z.string().optional(),
  SOURCE_SEPARATION_URL: z.string().url().optional(),
  SOURCE_SEPARATION_API_KEY: z.string().optional(),
  LIPSYNC_CREATE_URL: z.string().url().optional(),
  LIPSYNC_STATUS_URL: z.string().url().optional(),
  LIPSYNC_API_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const env = envSchema.parse(raw);

  if (env.MEDIA_PROVIDER_MODE === "real") {
    const missing = [
      ["RAPIDAPI_KEY", env.RAPIDAPI_KEY],
      ["ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY],
      ["ELEVENLABS_VOICE_ID", env.ELEVENLABS_VOICE_ID],
      ["LYRICS_API_URL", env.LYRICS_API_URL],
      ["SOURCE_SEPARATION_URL", env.SOURCE_SEPARATION_URL],
      ["LIPSYNC_CREATE_URL", env.LIPSYNC_CREATE_URL],
      ["LIPSYNC_STATUS_URL", env.LIPSYNC_STATUS_URL],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new Error(`Missing real media provider env: ${missing.map(([key]) => key).join(", ")}`);
    }
  }

  return env;
}
```

Create `.env.example` with the environment contract from this plan.

- [ ] **Step 5: Implement SoundCloud adapter**

Create `src/lib/adapters/soundcloud.ts`:

```ts
import { z } from "zod";
import type { NormalizedTrack, TrackProcessability } from "@/lib/domain/types";

const rawTrackSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().default("Untitled track"),
  user: z.object({ username: z.string().optional() }).optional(),
  duration: z.number().nullable().optional(),
  artwork_url: z.string().nullable().optional(),
  permalink_url: z.string().optional(),
  downloadable: z.boolean().optional(),
  download_url: z.string().nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
});

const searchResponseSchema = z.union([
  z.object({ collection: z.array(rawTrackSchema) }),
  z.array(rawTrackSchema),
]);

function getCollection(payload: unknown): z.infer<typeof rawTrackSchema>[] {
  const parsed = searchResponseSchema.parse(payload);
  return Array.isArray(parsed) ? parsed : parsed.collection;
}

function getProcessability(track: z.infer<typeof rawTrackSchema>): TrackProcessability {
  const downloadUrl = track.download_url ?? track.downloadUrl ?? null;

  if (track.downloadable === true && downloadUrl) {
    return { processable: true, reason: "downloadable", audioUrl: downloadUrl };
  }

  if (downloadUrl) {
    return { processable: true, reason: "direct_audio_url", audioUrl: downloadUrl };
  }

  return { processable: false, reason: "not_permitted", audioUrl: null };
}

export function normalizeSoundCloudSearch(payload: unknown): NormalizedTrack[] {
  return getCollection(payload).map((track) => ({
    id: String(track.id),
    title: track.title,
    artist: track.user?.username ?? "Unknown artist",
    durationMs: track.duration ?? null,
    artworkUrl: track.artwork_url ?? null,
    sourceUrl: track.permalink_url ?? "",
    processability: getProcessability(track),
  }));
}

export async function searchSoundCloudTracks(input: {
  query: string;
  searchUrl: string;
  rapidApiKey?: string;
  rapidApiHost: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedTrack[]> {
  if (!input.query.trim()) return [];

  const fetcher = input.fetchImpl ?? fetch;
  const url = new URL(input.searchUrl);
  url.searchParams.set("q", input.query);

  const response = await fetcher(url, {
    headers: {
      "x-rapidapi-key": input.rapidApiKey ?? "",
      "x-rapidapi-host": input.rapidApiHost,
    },
  });

  if (!response.ok) {
    throw new Error(`SoundCloud search failed: ${response.status}`);
  }

  return normalizeSoundCloudSearch(await response.json());
}
```

- [ ] **Step 6: Add SoundCloud search route**

Create `src/app/api/soundcloud/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { searchSoundCloudTracks } from "@/lib/adapters/soundcloud";
import { readEnv } from "@/lib/config/env";

export async function GET(request: Request) {
  const env = readEnv();
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const tracks = await searchSoundCloudTracks({
    query,
    searchUrl: env.SOUNDCLOUD_SEARCH_URL,
    rapidApiKey: env.RAPIDAPI_KEY,
    rapidApiHost: env.SOUNDCLOUD_RAPIDAPI_HOST,
  });

  return NextResponse.json({ tracks });
}
```

- [ ] **Step 7: Verify SoundCloud tests**

Run:

```bash
npm run test:run -- src/lib/adapters/soundcloud.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add .env.example src/lib/config/env.ts src/lib/adapters/soundcloud.ts src/lib/adapters/soundcloud.test.ts src/test/fixtures/soundcloud-search.json src/app/api/soundcloud
git commit -m "feat: add soundcloud search eligibility"
```

## Task 6: Session APIs And Uploads

**Files:**
- Create: `src/app/api/sessions/route.ts`
- Create: `src/app/api/sessions/[sessionId]/route.ts`
- Create: `src/app/api/sessions/[sessionId]/assets/route.ts`
- Create: `src/app/api/sessions/[sessionId]/select-job/route.ts`
- Create: `src/app/api/sessions/[sessionId]/select-song/route.ts`
- Create: `src/app/api/sessions/[sessionId]/upload-track/route.ts`
- Create: `src/lib/server/stores.ts`

- [ ] **Step 1: Add shared store factory**

Create `src/lib/server/stores.ts`:

```ts
import { readEnv } from "@/lib/config/env";
import { createArtifactStore } from "@/lib/storage/artifacts";
import { createSessionStore } from "@/lib/storage/sessions";

export function getStores() {
  const env = readEnv();
  return {
    sessions: createSessionStore(env.ARTIFACT_ROOT),
    artifacts: createArtifactStore(env.ARTIFACT_ROOT),
  };
}
```

- [ ] **Step 2: Add session create/read routes**

Create `src/app/api/sessions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStores } from "@/lib/server/stores";

export async function POST() {
  const { sessions } = getStores();
  const session = await sessions.create();
  return NextResponse.json({ session }, { status: 201 });
}
```

Create `src/app/api/sessions/[sessionId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStores } from "@/lib/server/stores";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
```

- [ ] **Step 3: Add asset upload route**

Create `src/app/api/sessions/[sessionId]/assets/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { ArtifactKind } from "@/lib/domain/types";
import { getNextStatusAfterAssetUpload } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

const allowedKinds = new Set<ArtifactKind>(["resume", "voice_sample", "face_media"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions, artifacts } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const form = await request.formData();
  const kind = String(form.get("kind")) as ArtifactKind;
  const file = form.get("file");

  if (!allowedKinds.has(kind) || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid asset upload" }, { status: 400 });
  }

  const artifact = await artifacts.putBuffer(sessionId, {
    kind,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterAssetUpload(),
    artifacts: [...session.artifacts.filter((item) => item.kind !== kind), artifact],
  });

  return NextResponse.json({ session: nextSession });
}
```

- [ ] **Step 4: Add job selection route**

Create `src/app/api/sessions/[sessionId]/select-job/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { NormalizedJob } from "@/lib/domain/types";
import { getNextStatusAfterJobSelection } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = (await request.json()) as { job?: NormalizedJob };

  if (!body.job?.id || !body.job.title || !body.job.boardToken) {
    return NextResponse.json({ error: "Invalid job selection" }, { status: 400 });
  }

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterJobSelection(),
    selectedCompany: { company: body.job.company, boardToken: body.job.boardToken },
    selectedJob: body.job,
  });

  return NextResponse.json({ session: nextSession });
}
```

- [ ] **Step 5: Add song selection and upload fallback routes**

Create `src/app/api/sessions/[sessionId]/select-song/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { NormalizedTrack } from "@/lib/domain/types";
import { getNextStatusAfterSongSelection } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = (await request.json()) as { track?: NormalizedTrack };

  if (!body.track?.processability.processable) {
    return NextResponse.json({ error: "Track is not processable" }, { status: 400 });
  }

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterSongSelection(),
    selectedSong: { type: "soundcloud", track: body.track },
  });

  return NextResponse.json({ session: nextSession });
}
```

Create `src/app/api/sessions/[sessionId]/upload-track/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getNextStatusAfterSongSelection } from "@/lib/domain/session-state";
import { getStores } from "@/lib/server/stores";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions, artifacts } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
  }

  const artifact = await artifacts.putBuffer(sessionId, {
    kind: "uploaded_track",
    filename: file.name,
    contentType: file.type || "audio/mpeg",
    buffer: Buffer.from(await file.arrayBuffer()),
  });

  const nextSession = await sessions.update(sessionId, {
    status: getNextStatusAfterSongSelection(),
    artifacts: [...session.artifacts, artifact],
    selectedSong: { type: "upload", artifact, title: file.name },
  });

  return NextResponse.json({ session: nextSession });
}
```

- [ ] **Step 6: Verify build catches route type errors**

Run:

```bash
npm run build
```

Expected: build completes without TypeScript errors.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/api/sessions src/lib/server/stores.ts
git commit -m "feat: add creation session api"
```

## Task 7: Generation Contracts And Mock Providers

**Files:**
- Create: `src/lib/generation/contracts.ts`
- Create: `src/lib/generation/mock-providers.ts`
- Create: `src/lib/generation/orchestrator.ts`
- Create: `src/lib/generation/orchestrator.test.ts`
- Create: `src/test/fixtures/sample-resume.txt`

- [ ] **Step 1: Add resume fixture**

Create `src/test/fixtures/sample-resume.txt`:

```text
Alex Rivera
Senior Product Engineer
Built onboarding workflows, API integrations, and media processing tools.
```

- [ ] **Step 2: Write failing orchestration test**

Create `src/lib/generation/orchestrator.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactStore } from "@/lib/storage/artifacts";
import { createSessionStore } from "@/lib/storage/sessions";
import { createMockProviders } from "./mock-providers";
import { runGeneration } from "./orchestrator";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-generation-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("generation orchestrator", () => {
  it("creates expected artifacts and marks the session ready", async () => {
    const sessions = createSessionStore(root);
    const artifacts = createArtifactStore(root);
    const session = await sessions.create();

    const readySession = await sessions.update(session.id, {
      status: "song_selected",
      parsedResumeText: "Senior Product Engineer",
      selectedJob: {
        id: "job-1",
        title: "Product Engineer",
        company: "Example",
        boardToken: "example",
        location: "Remote",
        content: "Build onboarding systems.",
        absoluteUrl: "https://example.com/job",
        updatedAt: null,
      },
      selectedSong: {
        type: "upload",
        title: "demo.mp3",
        artifact: await artifacts.putBuffer(session.id, {
          kind: "uploaded_track",
          filename: "demo.mp3",
          contentType: "audio/mpeg",
          buffer: Buffer.from("fake song"),
        }),
      },
    });

    const result = await runGeneration({
      session: readySession,
      sessions,
      artifacts,
      providers: createMockProviders(),
    });

    expect(result.status).toBe("ready");
    expect(result.finalVideo?.kind).toBe("final_video");
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain("lyrics");
    expect(result.artifacts.map((artifact) => artifact.kind)).toContain("final_video");
  });
});
```

- [ ] **Step 3: Run failing orchestrator test**

Run:

```bash
npm run test:run -- src/lib/generation/orchestrator.test.ts
```

Expected: FAIL because generation modules do not exist.

- [ ] **Step 4: Add generation contracts**

Create `src/lib/generation/contracts.ts`:

```ts
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { createArtifactStore } from "@/lib/storage/artifacts";

export type ArtifactStore = ReturnType<typeof createArtifactStore>;

export type LyricsResult = {
  brief: string;
  lyrics: string;
};

export type GenerationProviders = {
  generateLyrics(session: CreationSession): Promise<LyricsResult>;
  separateInstrumental(session: CreationSession, artifacts: ArtifactStore): Promise<ArtifactRef>;
  createGuideVocal(session: CreationSession, lyrics: string, artifacts: ArtifactStore): Promise<ArtifactRef>;
  convertVoice(session: CreationSession, guideVocal: ArtifactRef, artifacts: ArtifactStore): Promise<ArtifactRef>;
  createLipSyncVideo(session: CreationSession, convertedVocal: ArtifactRef, artifacts: ArtifactStore): Promise<ArtifactRef>;
  renderFinalVideo(session: CreationSession, lipSyncVideo: ArtifactRef, convertedVocal: ArtifactRef, artifacts: ArtifactStore): Promise<ArtifactRef>;
};
```

- [ ] **Step 5: Add mock providers**

Create `src/lib/generation/mock-providers.ts`:

```ts
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore, GenerationProviders } from "./contracts";

async function putTextArtifact(
  artifacts: ArtifactStore,
  sessionId: string,
  kind: ArtifactRef["kind"],
  filename: string,
  text: string,
): Promise<ArtifactRef> {
  return artifacts.putBuffer(sessionId, {
    kind,
    filename,
    contentType: "text/plain",
    buffer: Buffer.from(text),
  });
}

export function createMockProviders(): GenerationProviders {
  return {
    async generateLyrics(session: CreationSession) {
      const title = session.selectedJob?.title ?? "the role";
      return {
        brief: `A confident application parody for ${title}.`,
        lyrics: `Hire me for ${title}\nI ship the flows that make teams glow\nMy resume says I can build\nThe product dreams you need fulfilled`,
      };
    },

    async separateInstrumental(session, artifacts) {
      return putTextArtifact(artifacts, session.id, "instrumental_track", "instrumental.txt", "mock instrumental");
    },

    async createGuideVocal(session, _lyrics, artifacts) {
      return putTextArtifact(artifacts, session.id, "guide_vocal", "guide-vocal.txt", "mock guide vocal");
    },

    async convertVoice(session, _guideVocal, artifacts) {
      return putTextArtifact(artifacts, session.id, "converted_vocal", "converted-vocal.txt", "mock converted vocal");
    },

    async createLipSyncVideo(session, _convertedVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "lip_sync_video",
        filename: "lip-sync.mp4",
        contentType: "video/mp4",
        buffer: Buffer.from("mock lip sync video"),
      });
    },

    async renderFinalVideo(session, _lipSyncVideo, _convertedVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "final_video",
        filename: "capapply-demo.mp4",
        contentType: "video/mp4",
        buffer: Buffer.from("mock final video"),
      });
    },
  };
}
```

- [ ] **Step 6: Add orchestrator**

Create `src/lib/generation/orchestrator.ts`:

```ts
import type { CreationSession } from "@/lib/domain/types";
import type { createSessionStore } from "@/lib/storage/sessions";
import type { ArtifactStore, GenerationProviders } from "./contracts";

type SessionStore = ReturnType<typeof createSessionStore>;

export async function runGeneration(input: {
  session: CreationSession;
  sessions: SessionStore;
  artifacts: ArtifactStore;
  providers: GenerationProviders;
}): Promise<CreationSession> {
  const { session, sessions, artifacts, providers } = input;

  if (session.status !== "song_selected") {
    throw new Error(`Generation requires song_selected status, received ${session.status}`);
  }

  let current = await sessions.update(session.id, { status: "generating", generationStep: "writing_lyrics" });

  const lyricResult = await providers.generateLyrics(current);
  const briefArtifact = await artifacts.putBuffer(current.id, {
    kind: "parody_brief",
    filename: "parody-brief.txt",
    contentType: "text/plain",
    buffer: Buffer.from(lyricResult.brief),
  });
  const lyricsArtifact = await artifacts.putBuffer(current.id, {
    kind: "lyrics",
    filename: "lyrics.txt",
    contentType: "text/plain",
    buffer: Buffer.from(lyricResult.lyrics),
  });

  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, briefArtifact, lyricsArtifact],
    generationStep: "separating_instrumental",
  });

  const instrumental = await providers.separateInstrumental(current, artifacts);
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, instrumental],
    generationStep: "creating_guide_vocal",
  });

  const guideVocal = await providers.createGuideVocal(current, lyricResult.lyrics, artifacts);
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, guideVocal],
    generationStep: "converting_voice",
  });

  const convertedVocal = await providers.convertVoice(current, guideVocal, artifacts);
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, convertedVocal],
    generationStep: "creating_lipsync_video",
  });

  const lipSyncVideo = await providers.createLipSyncVideo(current, convertedVocal, artifacts);
  current = await sessions.update(current.id, {
    artifacts: [...current.artifacts, lipSyncVideo],
    generationStep: "rendering_final_video",
  });

  const finalVideo = await providers.renderFinalVideo(current, lipSyncVideo, convertedVocal, artifacts);

  return sessions.update(current.id, {
    status: "ready",
    generationStep: "complete",
    artifacts: [...current.artifacts, finalVideo],
    finalVideo,
    error: null,
  });
}
```

- [ ] **Step 7: Verify orchestrator tests**

Run:

```bash
npm run test:run -- src/lib/generation/orchestrator.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/generation src/test/fixtures/sample-resume.txt
git commit -m "feat: add generation orchestration contracts"
```

## Task 8: FFmpeg Renderer Smoke Path

**Files:**
- Create: `src/lib/generation/ffmpeg-renderer.ts`
- Create: `src/lib/generation/ffmpeg-renderer.test.ts`
- Modify: `src/lib/generation/mock-providers.ts`

- [ ] **Step 1: Verify FFmpeg is installed**

Run:

```bash
ffmpeg -version
```

Expected: version output appears. On macOS, install with `brew install ffmpeg` if the command is missing.

- [ ] **Step 2: Write failing FFmpeg renderer test**

Create `src/lib/generation/ffmpeg-renderer.test.ts`:

```ts
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSilentAudio, createSolidVideo, renderFinalMp4 } from "./ffmpeg-renderer";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "capapply-ffmpeg-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ffmpeg renderer", () => {
  it("combines video and audio into an mp4", async () => {
    const videoPath = path.join(root, "video.mp4");
    const audioPath = path.join(root, "audio.m4a");
    const outputPath = path.join(root, "final.mp4");

    await createSolidVideo(videoPath, 2);
    await createSilentAudio(audioPath, 2);
    await renderFinalMp4({ videoPath, audioPath, outputPath });

    expect((await stat(outputPath)).size).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 3: Run failing FFmpeg test**

Run:

```bash
npm run test:run -- src/lib/generation/ffmpeg-renderer.test.ts
```

Expected: FAIL because `ffmpeg-renderer.ts` does not exist.

- [ ] **Step 4: Implement FFmpeg renderer**

Create `src/lib/generation/ffmpeg-renderer.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function createSolidVideo(outputPath: string, seconds: number): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x111827:s=1280x720:d=${seconds}`,
    "-vf",
    "format=yuv420p",
    outputPath,
  ]);
}

export async function createSilentAudio(outputPath: string, seconds: number): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-t",
    String(seconds),
    outputPath,
  ]);
}

export async function renderFinalMp4(input: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input.videoPath,
    "-i",
    input.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    input.outputPath,
  ]);
}
```

- [ ] **Step 5: Update mock providers to create real media files**

Modify `src/lib/generation/mock-providers.ts` so mock audio/video artifacts are valid files and `final_video` is a real MP4:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore, GenerationProviders } from "./contracts";
import { createSilentAudio, createSolidVideo, renderFinalMp4 } from "./ffmpeg-renderer";

async function putTextArtifact(
  artifacts: ArtifactStore,
  sessionId: string,
  kind: ArtifactRef["kind"],
  filename: string,
  text: string,
): Promise<ArtifactRef> {
  return artifacts.putBuffer(sessionId, {
    kind,
    filename,
    contentType: "text/plain",
    buffer: Buffer.from(text),
  });
}

async function putGeneratedFile(input: {
  artifacts: ArtifactStore;
  sessionId: string;
  kind: ArtifactRef["kind"];
  filename: string;
  contentType: string;
  build(filePath: string): Promise<void>;
}): Promise<ArtifactRef> {
  const dir = await mkdtemp(path.join(tmpdir(), "capapply-mock-media-"));
  const filePath = path.join(dir, input.filename);

  try {
    await input.build(filePath);
    return input.artifacts.putBuffer(input.sessionId, {
      kind: input.kind,
      filename: input.filename,
      contentType: input.contentType,
      buffer: await readFile(filePath),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function createMockProviders(): GenerationProviders {
  return {
    async generateLyrics(session: CreationSession) {
      const title = session.selectedJob?.title ?? "the role";
      return {
        brief: `A confident application parody for ${title}.`,
        lyrics: `Hire me for ${title}\nI ship the flows that make teams glow\nMy resume says I can build\nThe product dreams you need fulfilled`,
      };
    },

    async separateInstrumental(session, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "instrumental_track",
        filename: "instrumental.m4a",
        contentType: "audio/mp4",
        build: (filePath) => createSilentAudio(filePath, 3),
      });
    },

    async createGuideVocal(session, _lyrics, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "guide_vocal",
        filename: "guide-vocal.m4a",
        contentType: "audio/mp4",
        build: (filePath) => createSilentAudio(filePath, 3),
      });
    },

    async convertVoice(session, guideVocal, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "converted_vocal",
        filename: "converted-vocal.m4a",
        contentType: "audio/mp4",
        buffer: await readFile(guideVocal.path),
      });
    },

    async createLipSyncVideo(session, _convertedVocal, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "lip_sync_video",
        filename: "lip-sync.mp4",
        contentType: "video/mp4",
        build: (filePath) => createSolidVideo(filePath, 3),
      });
    },

    async renderFinalVideo(session, lipSyncVideo, convertedVocal, artifacts) {
      return putGeneratedFile({
        artifacts,
        sessionId: session.id,
        kind: "final_video",
        filename: "capapply-demo.mp4",
        contentType: "video/mp4",
        build: (filePath) =>
          renderFinalMp4({
            videoPath: lipSyncVideo.path,
            audioPath: convertedVocal.path,
            outputPath: filePath,
          }),
      });
    },
  };
}
```

- [ ] **Step 6: Verify FFmpeg and orchestrator tests**

Run:

```bash
npm run test:run -- src/lib/generation/ffmpeg-renderer.test.ts
npm run test:run -- src/lib/generation/orchestrator.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/generation/ffmpeg-renderer.ts src/lib/generation/ffmpeg-renderer.test.ts src/lib/generation/mock-providers.ts
git commit -m "feat: add ffmpeg final renderer"
```

## Task 9: Generation API And Download Route

**Files:**
- Create: `src/lib/generation/providers.ts`
- Create: `src/app/api/sessions/[sessionId]/generate/route.ts`
- Create: `src/app/api/sessions/[sessionId]/download/route.ts`

- [ ] **Step 1: Add provider factory**

Create `src/lib/generation/providers.ts`:

```ts
import { readEnv } from "@/lib/config/env";
import type { GenerationProviders } from "./contracts";
import { createMockProviders } from "./mock-providers";

export function createGenerationProviders(): GenerationProviders {
  const env = readEnv();

  if (env.MEDIA_PROVIDER_MODE === "mock") {
    return createMockProviders();
  }

  throw new Error("MEDIA_PROVIDER_MODE=real requires Task 12 provider adapters to be implemented before use");
}
```

- [ ] **Step 2: Add generation route**

Create `src/app/api/sessions/[sessionId]/generate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { runGeneration } from "@/lib/generation/orchestrator";
import { createGenerationProviders } from "@/lib/generation/providers";
import { getStores } from "@/lib/server/stores";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions, artifacts } = getStores();
  const session = await sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const nextSession = await runGeneration({
      session,
      sessions,
      artifacts,
      providers: createGenerationProviders(),
    });

    return NextResponse.json({ session: nextSession });
  } catch (error) {
    const failedSession = await sessions.update(sessionId, {
      status: "failed",
      error: {
        step: session.generationStep,
        message: error instanceof Error ? error.message : "Generation failed",
        retryable: true,
        occurredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ session: failedSession }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add download route**

Create `src/app/api/sessions/[sessionId]/download/route.ts`:

```ts
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getStores } from "@/lib/server/stores";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { sessions } = getStores();
  const session = await sessions.get(sessionId);

  if (!session?.finalVideo) {
    return NextResponse.json({ error: "Final video not ready" }, { status: 404 });
  }

  const bytes = await readFile(session.finalVideo.path);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${session.finalVideo.filename}"`,
    },
  });
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: build completes without route or type errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/generation/providers.ts src/app/api/sessions/[sessionId]/generate src/app/api/sessions/[sessionId]/download
git commit -m "feat: add generation and export api"
```

## Task 10: Frontend Creation Flow

**Files:**
- Create: `src/lib/client/api.ts`
- Create: `src/components/creator/CreatorFlow.tsx`
- Create: `src/components/creator/AssetStep.tsx`
- Create: `src/components/creator/JobStep.tsx`
- Create: `src/components/creator/SongStep.tsx`
- Create: `src/components/creator/ProgressStep.tsx`
- Create: `src/components/creator/ExportStep.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add typed client API**

Create `src/lib/client/api.ts`:

```ts
import type { CompanyConfig, CreationSession, NormalizedJob, NormalizedTrack } from "@/lib/domain/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function createSession(): Promise<CreationSession> {
  const data = await parseJson<{ session: CreationSession }>(await fetch("/api/sessions", { method: "POST" }));
  return data.session;
}

export async function getCompanies(): Promise<CompanyConfig[]> {
  const data = await parseJson<{ companies: CompanyConfig[] }>(await fetch("/api/companies"));
  return data.companies;
}

export async function getJobs(boardToken: string): Promise<NormalizedJob[]> {
  const data = await parseJson<{ jobs: NormalizedJob[] }>(await fetch(`/api/companies/${boardToken}/jobs`));
  return data.jobs;
}

export async function searchTracks(query: string): Promise<NormalizedTrack[]> {
  const data = await parseJson<{ tracks: NormalizedTrack[] }>(await fetch(`/api/soundcloud/search?q=${encodeURIComponent(query)}`));
  return data.tracks;
}

export async function uploadAsset(sessionId: string, kind: string, file: File): Promise<CreationSession> {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  const data = await parseJson<{ session: CreationSession }>(await fetch(`/api/sessions/${sessionId}/assets`, { method: "POST", body: form }));
  return data.session;
}

export async function selectJob(sessionId: string, job: NormalizedJob): Promise<CreationSession> {
  const data = await parseJson<{ session: CreationSession }>(await fetch(`/api/sessions/${sessionId}/select-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job }),
  }));
  return data.session;
}

export async function selectSong(sessionId: string, track: NormalizedTrack): Promise<CreationSession> {
  const data = await parseJson<{ session: CreationSession }>(await fetch(`/api/sessions/${sessionId}/select-song`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track }),
  }));
  return data.session;
}

export async function startGeneration(sessionId: string): Promise<CreationSession> {
  const data = await parseJson<{ session: CreationSession }>(await fetch(`/api/sessions/${sessionId}/generate`, { method: "POST" }));
  return data.session;
}
```

- [ ] **Step 2: Add CreatorFlow skeleton**

Create `src/components/creator/CreatorFlow.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { CreationSession } from "@/lib/domain/types";
import { createSession } from "@/lib/client/api";
import { AssetStep } from "./AssetStep";
import { ExportStep } from "./ExportStep";
import { JobStep } from "./JobStep";
import { ProgressStep } from "./ProgressStep";
import { SongStep } from "./SongStep";

export function CreatorFlow() {
  const [session, setSession] = useState<CreationSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createSession().then(setSession).catch((err) => setError(String(err)));
  }, []);

  if (error) return <main className="mx-auto max-w-4xl p-8">Something failed: {error}</main>;
  if (!session) return <main className="mx-auto max-w-4xl p-8">Preparing your session...</main>;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-slate-500">Capapply</p>
        <h1 className="text-3xl font-semibold text-slate-950">Create your application parody video</h1>
      </header>
      <AssetStep session={session} onSessionChange={setSession} />
      <JobStep session={session} onSessionChange={setSession} />
      <SongStep session={session} onSessionChange={setSession} />
      <ProgressStep session={session} onSessionChange={setSession} />
      <ExportStep session={session} />
    </main>
  );
}
```

- [ ] **Step 3: Add page entry**

Replace `src/app/page.tsx` with:

```tsx
import { CreatorFlow } from "@/components/creator/CreatorFlow";

export default function Home() {
  return <CreatorFlow />;
}
```

- [ ] **Step 4: Add step components**

Create `AssetStep`, `JobStep`, `SongStep`, `ProgressStep`, and `ExportStep` with these exact UI responsibilities:

- `AssetStep`: three file inputs for resume, voice sample, face media; calls `uploadAsset`; marks each uploaded artifact by checking `session.artifacts`.
- `JobStep`: loads companies, fetches jobs after company selection, calls `selectJob`; hides board tokens from visible labels.
- `SongStep`: text input for search, result list with disabled state for non-processable tracks, calls `selectSong`; shows upload recovery only when no processable result is selected.
- `ProgressStep`: enabled after `song_selected`; calls `startGeneration`; displays `session.generationStep`.
- `ExportStep`: enabled when `session.status === "ready"`; renders a `<video>` element with `/api/sessions/${session.id}/download` and a download link to the same URL.

Use this prop type in each component:

```ts
import type { CreationSession } from "@/lib/domain/types";

type StepProps = {
  session: CreationSession;
  onSessionChange(session: CreationSession): void;
};
```

- [ ] **Step 5: Verify app build**

Run:

```bash
npm run build
```

Expected: build completes without TypeScript errors.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/page.tsx src/components/creator src/lib/client/api.ts
git commit -m "feat: add guided creation flow"
```

## Task 11: End-To-End Browser Test With Mock Providers

**Files:**
- Create: `e2e/creator-flow.spec.ts`

- [ ] **Step 1: Write e2e test**

Create `e2e/creator-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import path from "node:path";

test("creates a mock parody export", async ({ page }) => {
  await page.route("**/api/companies", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ companies: [{ company: "Stripe", boardToken: "stripe" }] }),
    });
  });

  await page.route("**/api/companies/stripe/jobs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [
          {
            id: "job-1",
            title: "Product Engineer",
            company: "Stripe",
            boardToken: "stripe",
            location: "New York, NY",
            content: "Build payment products and developer workflows.",
            absoluteUrl: "https://boards.greenhouse.io/stripe/jobs/job-1",
            updatedAt: null,
          },
        ],
      }),
    });
  });

  await page.route("**/api/soundcloud/search**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tracks: [
          {
            id: "track-1",
            title: "Downloadable Pop Instrumental",
            artist: "Beat Maker",
            durationMs: 24000,
            artworkUrl: null,
            sourceUrl: "https://soundcloud.com/beat-maker/downloadable-pop",
            processability: {
              processable: true,
              reason: "downloadable",
              audioUrl: "https://api.soundcloud.com/tracks/1/download",
            },
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /create your application parody video/i })).toBeVisible();

  await page.getByLabel(/resume/i).setInputFiles(path.join(process.cwd(), "src/test/fixtures/sample-resume.txt"));
  await page.getByLabel(/voice/i).setInputFiles({
    name: "voice.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("voice sample"),
  });
  await page.getByLabel(/face/i).setInputFiles({
    name: "face.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("face media"),
  });

  await page.getByRole("button", { name: /stripe/i }).click();
  await page.getByRole("button", { name: /product engineer/i }).click();

  await page.getByRole("textbox", { name: /search soundcloud/i }).fill("pop instrumental");
  await page.getByRole("button", { name: /search/i }).click();
  await page.getByRole("button", { name: /downloadable/i }).click();

  await page.getByRole("button", { name: /generate/i }).click();
  await expect(page.getByRole("link", { name: /download mp4/i })).toBeVisible({ timeout: 60_000 });
});
```

- [ ] **Step 2: Run e2e test**

Run:

```bash
npm run test:e2e -- e2e/creator-flow.spec.ts
```

Expected: PASS with Greenhouse and SoundCloud responses mocked by Playwright route handlers.

- [ ] **Step 3: Commit**

Run:

```bash
git add e2e/creator-flow.spec.ts
git commit -m "test: cover mock creation flow"
```

## Task 12: Real Provider Adapter Wiring

**Files:**
- Create: `src/lib/generation/providers/http-lyrics.ts`
- Create: `src/lib/generation/providers/http-source-separation.ts`
- Create: `src/lib/generation/providers/elevenlabs-voice-conversion.ts`
- Create: `src/lib/generation/providers/http-lipsync.ts`
- Modify: `src/lib/generation/providers.ts`
- Create: `docs/demo/manual-real-provider-check.md`

- [ ] **Step 1: Add HTTP lyrics adapter**

Create `src/lib/generation/providers/http-lyrics.ts`:

```ts
import type { CreationSession } from "@/lib/domain/types";
import type { LyricsResult } from "../contracts";

export async function generateLyricsWithHttp(input: {
  session: CreationSession;
  url: string;
  apiKey?: string;
}): Promise<LyricsResult> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      resume: input.session.parsedResumeText,
      job: input.session.selectedJob,
      song: input.session.selectedSong,
      clipSeconds: 30,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lyrics provider failed: ${response.status}`);
  }

  return response.json() as Promise<LyricsResult>;
}
```

- [ ] **Step 2: Add source-separation adapter**

Create `src/lib/generation/providers/http-source-separation.ts`:

```ts
import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

export async function separateInstrumentalWithHttp(input: {
  session: CreationSession;
  artifacts: ArtifactStore;
  url: string;
  apiKey?: string;
}): Promise<ArtifactRef> {
  const source = input.session.selectedSong?.type === "upload" ? input.session.selectedSong.artifact : null;
  if (!source) throw new Error("HTTP source separation currently requires uploaded audio artifact");

  const form = new FormData();
  form.set("file", new Blob([await readFile(source.path)], { type: source.contentType }), source.filename);

  const response = await fetch(input.url, {
    method: "POST",
    headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Source separation provider failed: ${response.status}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  return input.artifacts.putBuffer(input.session.id, {
    kind: "instrumental_track",
    filename: "instrumental.wav",
    contentType: "audio/wav",
    buffer: audio,
  });
}
```

- [ ] **Step 3: Add ElevenLabs voice conversion adapter**

Create `src/lib/generation/providers/elevenlabs-voice-conversion.ts`:

```ts
import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

export async function convertVoiceWithElevenLabs(input: {
  session: CreationSession;
  guideVocal: ArtifactRef;
  artifacts: ArtifactStore;
  apiKey: string;
  voiceId: string;
}): Promise<ArtifactRef> {
  const form = new FormData();
  form.set("audio", new Blob([await readFile(input.guideVocal.path)], { type: input.guideVocal.contentType }), input.guideVocal.filename);
  form.set("model_id", "eleven_multilingual_sts_v2");
  form.set("remove_background_noise", "true");

  const response = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${input.voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": input.apiKey },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voice conversion failed: ${response.status}`);
  }

  return input.artifacts.putBuffer(input.session.id, {
    kind: "converted_vocal",
    filename: "converted-vocal.mp3",
    contentType: "audio/mpeg",
    buffer: Buffer.from(await response.arrayBuffer()),
  });
}
```

- [ ] **Step 4: Add lip-sync adapter**

Create `src/lib/generation/providers/http-lipsync.ts`:

```ts
import { readFile } from "node:fs/promises";
import type { ArtifactRef, CreationSession } from "@/lib/domain/types";
import type { ArtifactStore } from "../contracts";

export async function createLipSyncVideoWithHttp(input: {
  session: CreationSession;
  convertedVocal: ArtifactRef;
  artifacts: ArtifactStore;
  createUrl: string;
  statusUrl: string;
  apiKey?: string;
}): Promise<ArtifactRef> {
  const face = input.session.artifacts.find((artifact) => artifact.kind === "face_media");
  if (!face) throw new Error("Face media is required for lip-sync generation");

  const form = new FormData();
  form.set("face", new Blob([await readFile(face.path)], { type: face.contentType }), face.filename);
  form.set("audio", new Blob([await readFile(input.convertedVocal.path)], { type: input.convertedVocal.contentType }), input.convertedVocal.filename);

  const createResponse = await fetch(input.createUrl, {
    method: "POST",
    headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : undefined,
    body: form,
  });

  if (!createResponse.ok) {
    throw new Error(`Lip-sync provider create failed: ${createResponse.status}`);
  }

  const created = (await createResponse.json()) as { videoUrl?: string };
  if (!created.videoUrl) throw new Error("Lip-sync provider did not return videoUrl");

  const videoResponse = await fetch(created.videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Lip-sync video download failed: ${videoResponse.status}`);
  }

  return input.artifacts.putBuffer(input.session.id, {
    kind: "lip_sync_video",
    filename: "lip-sync.mp4",
    contentType: "video/mp4",
    buffer: Buffer.from(await videoResponse.arrayBuffer()),
  });
}
```

- [ ] **Step 5: Wire real provider mode**

Modify `src/lib/generation/providers.ts` so `MEDIA_PROVIDER_MODE=real` returns a `GenerationProviders` object that calls the HTTP lyrics/source-separation/lip-sync adapters and ElevenLabs adapter. Keep `createMockProviders()` unchanged for local development.

Use this structure:

```ts
if (env.MEDIA_PROVIDER_MODE === "real") {
  return {
    async generateLyrics(session) {
      return generateLyricsWithHttp({ session, url: env.LYRICS_API_URL!, apiKey: env.LYRICS_API_KEY });
    },
    async separateInstrumental(session, artifacts) {
      return separateInstrumentalWithHttp({ session, artifacts, url: env.SOURCE_SEPARATION_URL!, apiKey: env.SOURCE_SEPARATION_API_KEY });
    },
    async createGuideVocal(session, lyrics, artifacts) {
      return artifacts.putBuffer(session.id, {
        kind: "guide_vocal",
        filename: "guide-vocal.txt",
        contentType: "text/plain",
        buffer: Buffer.from(lyrics),
      });
    },
    async convertVoice(session, guideVocal, artifacts) {
      return convertVoiceWithElevenLabs({
        session,
        guideVocal,
        artifacts,
        apiKey: env.ELEVENLABS_API_KEY!,
        voiceId: env.ELEVENLABS_VOICE_ID!,
      });
    },
    async createLipSyncVideo(session, convertedVocal, artifacts) {
      return createLipSyncVideoWithHttp({
        session,
        convertedVocal,
        artifacts,
        createUrl: env.LIPSYNC_CREATE_URL!,
        statusUrl: env.LIPSYNC_STATUS_URL!,
        apiKey: env.LIPSYNC_API_KEY,
      });
    },
    async renderFinalVideo(session, lipSyncVideo, convertedVocal, artifacts) {
      return createMockProviders().renderFinalVideo(session, lipSyncVideo, convertedVocal, artifacts);
    },
  };
}
```

- [ ] **Step 6: Add manual real-provider script**

Create `docs/demo/manual-real-provider-check.md`:

```markdown
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
```

- [ ] **Step 7: Verify unit tests and build**

Run:

```bash
npm run test:run
npm run build
```

Expected: all unit tests pass and build succeeds.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/generation/providers.ts src/lib/generation/providers docs/demo/manual-real-provider-check.md
git commit -m "feat: wire real media provider adapters"
```

## Task 13: Final Verification

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run full unit test suite**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Run browser test**

Run:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Run local mock demo**

Run:

```bash
npm run dev
```

Open `http://localhost:3000`, complete the flow in mock provider mode, and download the MP4.

Expected: the final screen shows the video preview and a download link.

- [ ] **Step 5: Commit verification fixes**

If any fixes were required, run:

```bash
git add .
git commit -m "fix: stabilize capapply demo verification"
```

If no fixes were required, do not create an empty commit.

## Self-Review Notes

- Spec coverage: asset upload, curated Greenhouse jobs, SoundCloud search/eligibility, upload recovery, async generation, MP4 export, provider adapters, privacy-local storage, and tests are covered.
- Type consistency: session, artifact, job, track, provider, and status names are introduced before downstream tasks use them.
- Risk: exact RapidAPI response fields may differ. The adapter accepts both array and `{ collection }` response shapes and keeps all processability decisions inside `src/lib/adapters/soundcloud.ts`.
- Risk: real source-separation, lyrics, and lip-sync providers need endpoints that match the HTTP adapter contracts. If a provider uses a different request shape, add a provider-specific adapter under `src/lib/generation/providers/` without changing orchestrator or frontend code.

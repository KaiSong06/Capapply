import type {
  ArtifactKind,
  CompanyConfig,
  CreationSession,
  NormalizedJob,
  NormalizedTrack,
} from "@/lib/domain/types";

export class ApiError extends Error {
  readonly status: number;
  readonly session: CreationSession | null;

  constructor(message: string, status: number, session: CreationSession | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.session = session;
  }
}

type ErrorResponseBody = {
  error?: string;
  session?: CreationSession;
};

type SessionResponseBody = {
  session: CreationSession;
};

type CompaniesResponseBody = {
  companies: CompanyConfig[];
};

type JobsResponseBody = {
  jobs: NormalizedJob[];
};

type TracksResponseBody = {
  tracks: NormalizedTrack[];
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  const body = await readJson<ErrorResponseBody>(response);
  throw new ApiError(
    body.error ?? `Request failed with ${response.status}`,
    response.status,
    body.session ?? null,
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  await assertOk(response);
  return readJson<T>(response);
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  await assertOk(response);
  return readJson<T>(response);
}

async function postForm<T>(url: string, form: FormData): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });

  await assertOk(response);
  return readJson<T>(response);
}

export async function createSession(): Promise<CreationSession> {
  const body = await postJson<SessionResponseBody>("/api/sessions");
  return body.session;
}

export async function getCompanies(): Promise<CompanyConfig[]> {
  const body = await getJson<CompaniesResponseBody>("/api/companies");
  return body.companies;
}

export async function getJobs(boardToken: string): Promise<NormalizedJob[]> {
  const body = await getJson<JobsResponseBody>(
    `/api/companies/${encodeURIComponent(boardToken)}/jobs`,
  );
  return body.jobs;
}

export async function searchTracks(query: string): Promise<NormalizedTrack[]> {
  const params = new URLSearchParams({ q: query });
  const body = await getJson<TracksResponseBody>(
    `/api/soundcloud/search?${params.toString()}`,
  );
  return body.tracks;
}

export async function uploadAsset(
  sessionId: string,
  kind: Extract<ArtifactKind, "resume" | "voice_sample" | "face_media">,
  file: File,
): Promise<CreationSession> {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);

  const body = await postForm<SessionResponseBody>(
    `/api/sessions/${sessionId}/assets`,
    form,
  );
  return body.session;
}

export async function uploadTrack(
  sessionId: string,
  file: File,
): Promise<CreationSession> {
  const form = new FormData();
  form.set("file", file);

  const body = await postForm<SessionResponseBody>(
    `/api/sessions/${sessionId}/upload-track`,
    form,
  );
  return body.session;
}

export async function selectJob(
  sessionId: string,
  job: NormalizedJob,
): Promise<CreationSession> {
  const body = await postJson<SessionResponseBody>(
    `/api/sessions/${sessionId}/select-job`,
    { job },
  );
  return body.session;
}

export async function selectSong(
  sessionId: string,
  track: NormalizedTrack,
): Promise<CreationSession> {
  const body = await postJson<SessionResponseBody>(
    `/api/sessions/${sessionId}/select-song`,
    { track },
  );
  return body.session;
}

export async function startGeneration(
  sessionId: string,
): Promise<CreationSession> {
  const body = await postJson<SessionResponseBody>(
    `/api/sessions/${sessionId}/generate`,
  );
  return body.session;
}

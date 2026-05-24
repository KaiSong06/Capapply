import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreationSession } from "@/lib/domain/types";

export type SessionPatch = Partial<Omit<CreationSession, "id" | "createdAt">>;

const sessionIdPattern = /^[a-f0-9-]{36}$/i;

export function assertSafeSessionId(sessionId: string): string {
  if (!sessionIdPattern.test(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  return sessionId;
}

function sessionPath(root: string, sessionId: string): string {
  return path.join(
    root,
    "sessions",
    assertSafeSessionId(sessionId),
    "session.json",
  );
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

  async function create(): Promise<CreationSession> {
    return save(createEmptySession());
  }

  async function get(sessionId: string): Promise<CreationSession | null> {
    try {
      const raw = await readFile(sessionPath(root, sessionId), "utf8");
      return JSON.parse(raw) as CreationSession;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async function update(
    sessionId: string,
    patch: SessionPatch,
  ): Promise<CreationSession> {
    const current = await get(sessionId);
    if (!current) throw new Error(`Session not found: ${sessionId}`);

    return save({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    create,
    get,
    update,
  };
}

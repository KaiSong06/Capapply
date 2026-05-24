import { z } from "zod";
import type { CreationSession } from "@/lib/domain/types";
import type { LyricsResult } from "../contracts";

const lyricsResultSchema = z.object({
  brief: z.string().min(1),
  lyrics: z.string().min(1),
});

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

  return lyricsResultSchema.parse(await response.json());
}

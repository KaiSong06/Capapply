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

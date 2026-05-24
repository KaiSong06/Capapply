import { describe, expect, it, vi } from "vitest";
import { fetchGreenhouseJobs, normalizeGreenhouseJobs } from "./greenhouse";
import fixture from "../../test/fixtures/greenhouse-jobs.json";

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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/example/jobs?content=true",
    );
    expect(jobs[0]?.title).toBe("Product Engineer");
  });
});

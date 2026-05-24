import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGreenhouseJobs } from "../../../lib/adapters/greenhouse";
import { GET } from "./[boardToken]/jobs/route";

vi.mock("../../../lib/adapters/greenhouse", () => ({
  fetchGreenhouseJobs: vi.fn(),
}));

const fetchGreenhouseJobsMock = vi.mocked(fetchGreenhouseJobs);

function callRoute(boardToken: string) {
  return GET(new Request("http://localhost/api/companies/test/jobs"), {
    params: Promise.resolve({ boardToken }),
  });
}

describe("company jobs route", () => {
  beforeEach(() => {
    fetchGreenhouseJobsMock.mockReset();
  });

  it("returns 404 for an unknown board token", async () => {
    const response = await callRoute("unknown-company");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Unknown company" });
    expect(fetchGreenhouseJobsMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Greenhouse jobs cannot be fetched", async () => {
    fetchGreenhouseJobsMock.mockRejectedValue(new Error("provider unavailable"));

    const response = await callRoute("stripe");

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Unable to fetch jobs" });
  });
});

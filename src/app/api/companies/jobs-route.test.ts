import { describe, expect, it } from "vitest";
import { GET } from "./[boardToken]/jobs/route";

function callRoute(boardToken: string) {
  return GET(new Request("http://localhost/api/companies/test/jobs"), {
    params: Promise.resolve({ boardToken }),
  });
}

describe("company jobs route", () => {
  it("returns hard-coded Stripe internship postings without Greenhouse", async () => {
    const response = await callRoute("stripe");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Software Engineer Intern",
          company: "Stripe",
          boardToken: "stripe",
        }),
        expect.objectContaining({
          title: "Product Manager Intern",
          company: "Stripe",
          boardToken: "stripe",
        }),
      ]),
    );
    expect(body.jobs.every((job: { title: string }) => job.title.includes("Intern"))).toBe(
      true,
    );
  });

  it("returns 404 for an unknown board token", async () => {
    const response = await callRoute("unknown-company");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Unknown company" });
  });
});

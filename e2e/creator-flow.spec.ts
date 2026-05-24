import { expect, test } from "@playwright/test";
import path from "node:path";

test("creates a mock parody export", async ({ page }) => {
  await page.route("**/api/companies", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        companies: [{ company: "Stripe", boardToken: "stripe" }],
      }),
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

  await expect(
    page.getByRole("heading", {
      name: /create your application parody video/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /upload source assets/i }),
  ).toBeVisible({ timeout: 20_000 });

  await page
    .getByLabel(/resume/i)
    .setInputFiles(path.join(process.cwd(), "src/test/fixtures/sample-resume.txt"));
  await page.getByLabel(/voice sample/i).setInputFiles({
    name: "voice.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("voice sample"),
  });
  await page.getByLabel(/face media/i).setInputFiles({
    name: "face.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("face media"),
  });

  await page.getByRole("button", { name: "Stripe", exact: true }).click();
  await page.getByRole("button", { name: /product engineer/i }).click();

  await page
    .getByRole("textbox", { name: /search soundcloud/i })
    .fill("pop instrumental");
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByRole("button", { name: /downloadable pop instrumental/i }).click();

  await page.getByRole("button", { name: /generate/i }).click();

  await expect(page.getByRole("link", { name: /download mp4/i })).toBeVisible({
    timeout: 60_000,
  });
});

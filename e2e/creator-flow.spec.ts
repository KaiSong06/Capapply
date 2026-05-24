import { expect, test } from "@playwright/test";
import path from "node:path";

test("creates an audio-only Top Tier export", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /create your application parody audio/i,
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

  await expect(page.getByRole("heading", { name: /choose the song/i })).toBeVisible();
  await page.getByRole("button", { name: /top tier/i }).click();

  await page.getByRole("button", { name: /generate/i }).click();

  await expect(page.getByRole("link", { name: /download mp3/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("audio[src='/top-tier.mp3']")).toBeVisible();
});

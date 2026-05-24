import { expect, test } from "@playwright/test";
import path from "node:path";

test("creates a mock parody export", async ({ page }) => {
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
  await page.getByRole("button", { name: /software engineer intern/i }).click();
  await page.getByRole("button", { name: /hotline bling/i }).click();

  await page.getByRole("button", { name: /generate/i }).click();

  await expect(page.getByRole("link", { name: /download mp4/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("video[src='/demo-output.mp4']")).toBeVisible();
});

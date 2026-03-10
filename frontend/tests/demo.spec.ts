import { expect, test } from "@playwright/test";

test("replays a no-trigger update and then a threshold-hit update", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Energy data becomes a cross-chain action surface." })
  ).toBeVisible();

  await expect(page.getByText("Below threshold")).toBeVisible();
  await page.getByRole("button", { name: "Replay Next Update" }).click();
  await expect(page.getByText("Threshold hit")).toBeVisible();
  await expect(page.getByText("Reward credited").first()).toBeVisible();
});

test("opens proof drawer and exposes local adapter unavailability state", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "View Proof" }).click();
  await expect(page.getByRole("region", { name: "Proof drawer" })).toBeVisible();

  await page.getByRole("button", { name: "Local Anvil" }).click();
  await expect(page.getByText(/local anvil adapter unavailable/i)).toBeVisible();
});

import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { THEMES } from "../../lib/themeLayouts";
import { TRAVEL_TEMPLATES } from "../../lib/travelTemplates";
const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function upload(page: Page) {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(
    page.getByRole("heading", {
      name: "Find your favorite story.",
      exact: true,
    }),
  ).toBeVisible();
}
async function hash(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (c) => {
    // Closing inline editing restores the text in the canvas on its next frame.
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const canvas = c as HTMLCanvasElement;
    const bytes = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  });
}
test("five photos become a personalized travel post through three simple steps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await upload(page);
  await expect(
    page.getByRole("button", { name: "Quick Create", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Add text", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".quick-theme-gallery canvas")).toHaveCount(
    Object.keys(TRAVEL_TEMPLATES).length,
  );
  await page.getByRole("button", { name: "Beach", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await page.locator(".trip-details-form summary").click();
  await page.getByLabel("Trip destination", { exact: true }).fill("Goa");
  await page.getByLabel("Trip date", { exact: true }).fill("2026-10-28");
  await page
    .getByRole("button", { name: "Salt air. Slow days.", exact: true })
    .click();
  await expect(
    page.locator(".text-layer-content").filter({ hasText: /^Goa$/ }),
  ).toHaveCount(1);
  await expect(
    page.locator(".text-layer-content").filter({ hasText: "28 Oct 2026" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Choose size & download", exact: true })
    .click();
  await page.getByRole("button", { name: /WhatsApp Status/ }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const download = await pending,
    bytes = await fs.readFile((await download.path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1080, 1920,
  ]);
  expect(download.suggestedFilename()).toContain("sea-breeze");
  await expect(
    page.getByText("Your collage is ready.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/quick-create-desktop.png" });
  expect(errors).toEqual([]);
});
test("Quick Create and the full editor share the same work and preview", async ({
  page,
}) => {
  await upload(page);
  await expect.poll(() => hash(page)).not.toBe("");
  const before = await hash(page);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Full editor", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Add text", exact: true }),
  ).toBeVisible();
  await expect.poll(() => hash(page)).toBe(before);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const text = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await text.fill("OUR WEEKEND AWAY");
  await text.press("Escape");
  const edited = await hash(page);
  await page.getByRole("button", { name: "Quick Create", exact: true }).click();
  await expect.poll(() => hash(page)).toBe(edited);
  await page.getByRole("button", { name: "All designs", exact: true }).click();
  await expect(page.locator(".quick-theme-gallery canvas")).toHaveCount(
    THEMES.length,
  );
});
test.describe("phone Quick Create", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("the preview stays visible while controls scroll inside the phone workspace", async ({
    page,
  }) => {
    await upload(page);
    await page.getByRole("button", { name: "Mountains", exact: true }).tap();
    await page
      .getByRole("button", { name: "Select Let’s Hike", exact: true })
      .tap();
    await page
      .getByRole("button", { name: "Choose size & download", exact: true })
      .tap();
    for (const [width, height] of [
      [390, 844],
      [320, 640],
      [768, 950],
    ]) {
      await page.setViewportSize({ width, height });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
      expect(
        (await page.locator(".canvas-stage").boundingBox())!.height,
      ).toBeGreaterThan(height * 0.32);
      await expect(
        page.getByRole("button", { name: "Download collage", exact: true }),
      ).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/quick-create-mobile.png" });
  });
});

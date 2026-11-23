import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
const themes = [
  { id: "route-diary", name: "Route Diary", texts: 8 },
  { id: "coastal-exposure", name: "Coastal Exposure", texts: 4 },
  { id: "golden-roadtrip", name: "Golden Road Trip", texts: 5 },
  { id: "heritage-reverie", name: "Heritage Reverie", texts: 5 },
  { id: "departure-club", name: "Departure Club", texts: 9 },
  { id: "alpine-atlas", name: "Alpine Atlas", texts: 6 },
  { id: "off-grid-zine", name: "Off Grid Zine", texts: 4 },
  { id: "horizon-cinema", name: "Horizon Cinema", texts: 5 },
  { id: "browser-getaway", name: "Browser Getaway", texts: 5 },
];
async function select(page: Page, name: string) {
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  await page
    .getByRole("button", { name: `Select ${name}`, exact: true })
    .click();
  await expect(page.getByTestId("collage-preview")).toHaveAttribute(
    "aria-label",
    new RegExp(name),
  );
}

test("all nine Trip designs produce distinct previews with editable wording and photo layers", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?mode=editor");
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  await expect(page.locator(".theme-card")).toHaveCount(themes.length);
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  const previews = new Set<string>();
  for (const theme of themes) {
    await select(page, theme.name);
    await page
      .getByTestId("collage-preview")
      .evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    const png = await page
      .getByTestId("collage-preview")
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
    previews.add(png);
    await fs.writeFile(
      `test-results/${theme.id}.png`,
      Buffer.from(png.split(",")[1], "base64"),
    );
    await page.screenshot({ path: `test-results/${theme.id}-workspace.png` });
    const copy = page.locator(".template-copy");
    if ((await copy.getAttribute("open")) === null)
      await copy.locator("summary").click();
    const wording = copy.locator("textarea");
    await expect(wording).toHaveCount(theme.texts);
    for (let i = 0; i < theme.texts; i++)
      await wording.nth(i).fill(`My trip memory ${i + 1}`);
    await page.getByRole("button", { name: /Photos/ }).click();
    for (let i = 0; i < files.length; i++) {
      await page
        .getByRole("button", { name: new RegExp(`^Select photo ${i + 1}:`) })
        .click();
      await expect(page.getByTestId("photo-selection")).toBeVisible();
      await page
        .getByLabel("Photo shape", { exact: true })
        .selectOption(i % 2 ? "arch" : "rounded");
      await expect(
        page
          .getByLabel("Selected photo", { exact: true })
          .locator("option:checked"),
      ).toHaveText(`${i + 1}. ${path.basename(files[i])}`);
    }
    await page.locator(".photo-effects summary").click();
    const opacity = page.getByLabel("Photo opacity", { exact: true });
    await opacity.focus();
    await opacity.press("End");
    await opacity.press("ArrowLeft");
    await expect(opacity).toHaveValue("99");
    const feather = page.getByLabel("Photo soft edge", { exact: true });
    await feather.focus();
    await feather.press("Home");
    await feather.press("ArrowRight");
    await expect(feather).toHaveValue("1");
    await page
      .getByLabel("Photo blend mode", { exact: true })
      .selectOption("soft-light");
    await expect(page.locator(".preview-error, .toast.error")).toHaveCount(0);
  }
  expect(previews.size).toBe(themes.length);
  expect(errors).toEqual([]);
});

test("edited blended Trip designs export the same composition as the preview", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  for (const theme of themes) {
    await select(page, theme.name);
    await page.getByRole("button", { name: /Photos/ }).click();
    await page
      .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
      .click();
    await page.getByLabel("Photo width percent").fill("40");
    await page
      .getByRole("button", { name: "Adjust photo", exact: true })
      .click();
    await page.getByLabel("Photo zoom", { exact: true }).focus();
    await page.getByLabel("Photo zoom", { exact: true }).press("End");
    await page
      .getByRole("button", { name: "Align photo top", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Align photo right", exact: true })
      .click();
    await page.getByRole("button", { name: "Move frame", exact: true }).click();
    await page
      .getByRole("button", { name: "Deselect photo", exact: true })
      .click();
    const title = page.locator(".text-layer-content").first();
    await title.click();
    const editor = page.getByRole("textbox", {
      name: "Text content",
      exact: true,
    });
    await editor.fill("MY CUSTOM TRIP");
    await editor.press("Escape");
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download collage", exact: true })
      .click();
    const download = await pending,
      bytes = await fs.readFile((await download.path())!);
    expect(download.suggestedFilename()).toContain(theme.id);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
      1280, 1600,
    ]);
    const difference = await page
      .getByTestId("collage-preview")
      .evaluate(async (canvas, base64) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const c = canvas as HTMLCanvasElement,
          other = document.createElement("canvas");
        other.width = c.width;
        other.height = c.height;
        const ctx = other.getContext("2d")!;
        ctx.drawImage(image, 0, 0, other.width, other.height);
        const a = ctx.getImageData(0, 0, other.width, other.height).data,
          b = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let difference = 0;
        for (let i = 0; i < a.length; i += 4)
          difference +=
            Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]);
        return difference / ((a.length / 4) * 3);
      }, bytes.toString("base64"));
    expect(difference, theme.name).toBeLessThan(1);
  }
});

test.describe("mobile Trip gallery", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("all Trip themes are selectable on a phone without page scrolling", async ({
    page,
  }) => {
    await page.goto("/?mode=editor");
    await page.getByTestId("photo-input").setInputFiles(files);
    for (const theme of themes) {
      await select(page, theme.name);
      await expect(page.getByTestId("collage-preview")).toBeVisible();
      await page
        .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
        .tap();
      await expect(
        page.getByLabel("Photo shape", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Deselect photo", exact: true })
        .tap();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
    }
    await page.screenshot({ path: "test-results/trip-mobile.png" });
  });
});

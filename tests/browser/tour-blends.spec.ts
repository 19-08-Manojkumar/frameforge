import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BLENDED_TOUR_THEMES,
  BLENDED_TOUR_TEXT,
  TOUR_BLEND_LABELS,
} from "../../lib/blendedTourThemes";
import {
  isBlendedTour,
  type BlendedTourId,
} from "../../lib/blendedTourLayouts";
import { TOUR_THEME_IDS } from "../../lib/travelLayouts";
import { TRAVEL_TEMPLATES } from "../../lib/travelTemplates";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Tour", exact: true }).click();
}
async function select(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Select ${name}`, exact: true })
    .click();
  await expect(page.getByTestId("collage-preview")).toHaveAttribute(
    "aria-label",
    new RegExp(name),
  );
}
async function imageData(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (element) => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return (element as HTMLCanvasElement).toDataURL();
  });
}
async function download(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const file = await pending;
  return {
    name: file.suggestedFilename(),
    bytes: await fs.readFile((await file.path())!),
  };
}
async function compareExport(page: Page, bytes: Buffer) {
  return page
    .getByTestId("collage-preview")
    .evaluate(async (element, encoded) => {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      const canvas = element as HTMLCanvasElement,
        other = document.createElement("canvas");
      other.width = canvas.width;
      other.height = canvas.height;
      const ctx = other.getContext("2d")!;
      ctx.drawImage(image, 0, 0, other.width, other.height);
      const a = ctx.getImageData(0, 0, other.width, other.height).data;
      const b = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let error = 0;
      for (let i = 0; i < a.length; i += 4)
        error +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return error / ((a.length / 4) * 3);
    }, bytes.toString("base64"));
}

test("five blended Tour compositions have distinct live previews; create a comparison sheet", async ({
  page,
}) => {
  await prepare(page);
  await expect(page.locator(".theme-card")).toHaveCount(TOUR_THEME_IDS.length);
  const samples: { name: string; blend: string; data: string }[] = [];
  for (const theme of BLENDED_TOUR_THEMES) {
    await select(page, theme.name);
    await expect(
      page
        .getByRole("button", { name: `Select ${theme.name}`, exact: true })
        .locator(".theme-blend-label"),
    ).toBeVisible();
    const data = await imageData(page),
      id = theme.id as BlendedTourId;
    samples.push({ name: theme.name, blend: TOUR_BLEND_LABELS[id], data });
    await fs.writeFile(
      `test-results/${id}-portrait.png`,
      Buffer.from(data.split(",")[1], "base64"),
    );
  }
  expect(new Set(samples.map((sample) => sample.data)).size).toBe(5);
  const sheet = await page.evaluate(async (samples) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1640;
    canvas.height = 570;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#edf3f1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1d443f";
    ctx.font = "bold 28px Arial";
    ctx.fillText(
      "Five new Tour themes. Five ways to blend the journey.",
      32,
      42,
    );
    ctx.fillStyle = "#5d756e";
    ctx.font = "15px Arial";
    ctx.fillText(
      "Same five photos. Soft transitions, clear focal points, and editable photos, colors, and titles.",
      32,
      70,
    );
    for (let i = 0; i < samples.length; i++) {
      const image = new Image();
      image.src = samples[i].data;
      await image.decode();
      const x = 32 + i * 320;
      ctx.drawImage(image, x, 94, 296, 370);
      ctx.fillStyle = "#1d443f";
      ctx.font = "bold 19px Arial";
      ctx.fillText(samples[i].name, x, 501);
      ctx.fillStyle = "#5d756e";
      ctx.font = "14px Arial";
      ctx.fillText(samples[i].blend, x, 528);
    }
    return canvas.toDataURL();
  }, samples);
  await fs.writeFile(
    "test-results/tour-blends-comparison.png",
    Buffer.from(sheet.split(",")[1], "base64"),
  );
  await page.screenshot({ path: "test-results/tour-blends-workspace.png" });
});

for (const theme of BLENDED_TOUR_THEMES) {
  test(`${theme.name}: edit text, crop and edge blend, then export the exact preview`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await prepare(page);
    await select(page, theme.name);
    const id = theme.id as BlendedTourId,
      copy = page.locator(".template-copy");
    if ((await copy.getAttribute("open")) === null)
      await copy.locator("summary").click();
    const fields = copy.locator("textarea");
    await expect(fields).toHaveCount(BLENDED_TOUR_TEXT[id].length);
    const title = BLENDED_TOUR_TEXT[id].findIndex((layer) =>
      TRAVEL_TEMPLATES[id]!.destination.includes(layer.id),
    );
    await fields.nth(title).fill("THE GOA EDIT");
    await page.getByRole("button", { name: /Photos/ }).click();
    await page
      .getByRole("button", {
        name: "Select photo 2: mountains.jpg",
        exact: true,
      })
      .click();
    const effects = page.locator(".photo-effects");
    if ((await effects.getAttribute("open")) === null)
      await effects.locator("summary").click();
    await page
      .getByLabel("Photo edge blend", { exact: true })
      .selectOption("wave");
    await page.getByLabel("Photo blend softness", { exact: true }).focus();
    await page.getByLabel("Photo blend softness", { exact: true }).press("End");
    await expect(
      page.getByLabel("Photo blend softness", { exact: true }),
    ).toHaveValue("50");
    const geometry = await page
      .getByTestId("photo-selection")
      .getAttribute("style");
    await page
      .getByRole("button", { name: "Adjust photo", exact: true })
      .click();
    await page.getByLabel("Photo zoom", { exact: true }).focus();
    await page.getByLabel("Photo zoom", { exact: true }).press("End");
    await page
      .getByRole("button", { name: "Align photo top", exact: true })
      .click();
    expect(
      await page.getByTestId("photo-selection").getAttribute("style"),
    ).toBe(geometry);
    await page
      .getByRole("button", { name: "Deselect photo", exact: true })
      .click();
    await page
      .getByLabel("Section color hex", { exact: true })
      .fill(
        id === "cloudline-escape" || id === "tidal-reverie"
          ? "#e4eee7"
          : "#20323e",
      );
    await page
      .getByLabel("Canvas size", { exact: true })
      .selectOption("custom");
    await page.getByLabel("Output width", { exact: true }).fill("1280");
    await page.getByLabel("Output height", { exact: true }).fill("1600");
    const file = await download(page);
    expect(file.name).toContain(id);
    expect([file.bytes.readUInt32BE(16), file.bytes.readUInt32BE(20)]).toEqual([
      1280, 1600,
    ]);
    expect(await compareExport(page, file.bytes)).toBeLessThan(1);
    await expect(page.locator(".preview-error, .toast.error")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("blended Tours export exact social sizes in PNG, JPG and WEBP and recover custom blending from a draft", async ({
  page,
}) => {
  await prepare(page);
  const choices = [
    { preset: "square", format: "png", width: 1080, height: 1080 },
    { preset: "portrait", format: "jpeg", width: 1080, height: 1350 },
    { preset: "story", format: "webp", width: 1080, height: 1920 },
    { preset: "whatsapp", format: "png", width: 1080, height: 1920 },
    { preset: "landscape", format: "webp", width: 1920, height: 1080 },
  ];
  for (let i = 0; i < BLENDED_TOUR_THEMES.length; i++) {
    const theme = BLENDED_TOUR_THEMES[i],
      choice = choices[i];
    await select(page, theme.name);
    await page
      .getByLabel("Canvas size", { exact: true })
      .selectOption(choice.preset);
    await page
      .getByRole("button", {
        name: choice.format === "jpeg" ? "JPG" : choice.format.toUpperCase(),
        exact: true,
      })
      .click();
    const file = await download(page);
    const decoded = await page.evaluate(async (encoded) => {
      const image = await createImageBitmap(
        new Blob([Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))]),
      );
      return [image.width, image.height];
    }, file.bytes.toString("base64"));
    expect(decoded).toEqual([choice.width, choice.height]);
  }
  await page.getByRole("button", { name: /Photos/ }).click();
  await page
    .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
    .click();
  const effects = page.locator(".photo-effects");
  if ((await effects.getAttribute("open")) === null)
    await effects.locator("summary").click();
  await page
    .getByLabel("Photo edge blend", { exact: true })
    .selectOption("diagonal");
  await page
    .getByRole("button", { name: "Deselect photo", exact: true })
    .click();
  await expect(
    page.locator('[data-testid="draft-status"]:visible'),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const before = await imageData(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(page.getByTestId("collage-preview")).toHaveAttribute(
    "aria-label",
    /Tidal Reverie/,
  );
  await expect.poll(() => imageData(page)).toBe(before);
});

test.describe("phone blended Tours", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("all five designs are accessible and blend controls fit the phone", async ({
    page,
  }) => {
    await prepare(page);
    for (const theme of BLENDED_TOUR_THEMES) {
      // Selecting a design closes the phone gallery to reveal its large preview.
      await page.getByRole("button", { name: /Templates/ }).tap();
      await page.getByRole("button", { name: "Tour", exact: true }).tap();
      await select(page, theme.name);
      await expect(page.getByTestId("collage-preview")).toBeVisible();
    }
    await page.getByRole("button", { name: /Photos/ }).click();
    await page
      .getByRole("button", {
        name: "Select photo 2: mountains.jpg",
        exact: true,
      })
      .tap();
    const effects = page.locator(".photo-effects");
    if ((await effects.getAttribute("open")) === null)
      await effects.locator("summary").tap();
    await page
      .getByLabel("Photo edge blend", { exact: true })
      .selectOption("oval");
    await expect(
      page.getByLabel("Photo blend softness", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await page.screenshot({ path: "test-results/tour-blends-phone.png" });
    expect(isBlendedTour("tidal-reverie")).toBe(true);
  });
});

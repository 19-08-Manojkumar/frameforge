import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { NEW_TRIP_THEMES } from "../../lib/newTripThemes";
import { PRESETS } from "../../lib/settings";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);

test("five original Trip designs fit every social size and export exact pixels; build a visual comparison", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  const images: { name: string; data: string }[] = [];
  for (const theme of NEW_TRIP_THEMES) {
    await page
      .getByRole("button", { name: `Select ${theme.name}`, exact: true })
      .click();
    for (const preset of PRESETS.filter((preset) => preset.id !== "custom")) {
      await page
        .getByLabel("Canvas size", { exact: true })
        .selectOption(preset.id);
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download collage", exact: true })
        .click();
      const download = await pending,
        bytes = await fs.readFile((await download.path())!);
      expect(
        [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
        `${theme.name}: ${preset.name}`,
      ).toEqual([preset.width, preset.height]);
      expect(download.suggestedFilename()).toContain(theme.id);
      await expect(page.locator(".photo-hit-target")).toHaveCount(5);
      if (preset.id === "portrait") {
        const data = `data:image/png;base64,${bytes.toString("base64")}`;
        images.push({ name: theme.name, data });
        await fs.writeFile(`test-results/${theme.id}-portrait.png`, bytes);
      }
      if (preset.id === "landscape")
        await fs.writeFile(`test-results/${theme.id}-landscape.png`, bytes);
    }
  }
  const comparison = await page.evaluate(async (images) => {
    const sheet = document.createElement("canvas");
    sheet.width = 1640;
    sheet.height = 570;
    const ctx = sheet.getContext("2d")!;
    ctx.fillStyle = "#eef3ef";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = "#21463f";
    ctx.font = "bold 28px Arial";
    ctx.fillText("Five new ways to remember the trip.", 32, 42);
    ctx.font = "15px Arial";
    ctx.fillStyle = "#5b7168";
    ctx.fillText(
      "Same five photos. Five distinct compositions. Every photo and text layer stays editable.",
      32,
      70,
    );
    for (let i = 0; i < images.length; i++) {
      const image = new Image();
      image.src = images[i].data;
      await image.decode();
      const x = 32 + i * 320;
      ctx.drawImage(image, x, 94, 296, 370);
      ctx.fillStyle = "#21463f";
      ctx.font = "bold 19px Arial";
      ctx.fillText(images[i].name, x, 501);
      ctx.font = "14px Arial";
      ctx.fillStyle = "#5b7168";
      ctx.fillText(
        [
          "Boarding pass + itinerary",
          "Arch + circular detail crops",
          "Cut-paper editorial cover",
          "Panorama + memory reel",
          "Retro desktop photo windows",
        ][i],
        x,
        528,
      );
    }
    return sheet.toDataURL();
  }, images);
  await fs.writeFile(
    "test-results/new-trip-comparison.png",
    Buffer.from(comparison.split(",")[1], "base64"),
  );
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("portrait");
  await page.screenshot({ path: "test-results/new-trip-workspace.png" });
  expect(errors).toEqual([]);
});

test("a new Trip design keeps its editable wording and photo crop after draft recovery", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Alpine Atlas", exact: true })
    .click();
  const copy = page.locator(".template-copy");
  if ((await copy.getAttribute("open")) === null)
    await copy.locator("summary").click();
  await copy.locator("textarea").nth(2).fill("MY MOUNTAIN WEEKEND");
  await page.getByRole("button", { name: /Photos/ }).click();
  await page
    .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
    .click();
  await page.getByRole("button", { name: "Adjust photo", exact: true }).click();
  await page.getByLabel("Photo zoom", { exact: true }).focus();
  await page.getByLabel("Photo zoom", { exact: true }).press("End");
  await page
    .getByRole("button", { name: "Align photo top", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Deselect photo", exact: true })
    .click();
  await expect(
    page.locator('[data-testid="draft-status"]:visible'),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const pixels = () =>
    page.getByTestId("collage-preview").evaluate(async (canvas) => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const c = canvas as HTMLCanvasElement;
      return c.toDataURL();
    });
  const before = await pixels();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(page.getByTestId("collage-preview")).toHaveAttribute(
    "aria-label",
    /Alpine Atlas/,
  );
  await expect.poll(pixels).toBe(before);
});

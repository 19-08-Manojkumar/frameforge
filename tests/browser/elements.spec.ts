import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { moveLayer } from "./layerHelpers";
import manifest from "../../lib/flagManifest.json";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function geometry(page: Page) {
  return page
    .locator('.photo-hit-target[data-layer-kind="photo"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const s = (node as HTMLElement).style;
        return [s.left, s.top, s.width, s.height, s.transform];
      }),
    );
}
async function parity(page: Page, width = 1080, height = 1350) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    width,
    height,
  ]);
  const difference = await page
    .getByTestId("collage-preview")
    .evaluate(async (c, base64) => {
      const original = c as HTMLCanvasElement,
        image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const result = document.createElement("canvas");
      result.width = original.width;
      result.height = original.height;
      const ctx = result.getContext("2d")!;
      ctx.drawImage(image, 0, 0, result.width, result.height);
      const a = ctx.getImageData(0, 0, result.width, result.height).data,
        b = original
          .getContext("2d")!
          .getImageData(0, 0, original.width, original.height).data;
      let sum = 0;
      for (let i = 0; i < a.length; i += 4)
        sum +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return sum / ((a.length / 4) * 3);
    }, bytes.toString("base64"));
  expect(difference).toBeLessThan(1);
}
async function emojiPicker(page: Page) {
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Add stickers and emoji",
    exact: true,
  });
  await picker.getByRole("button", { name: /^Emoji / }).click();
  await picker
    .getByLabel("Emoji category", { exact: true })
    .selectOption("Flags");
  return picker;
}

test("all flag choices have real local artwork and flags stay colorful in the canvas and downloaded PNG", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files[0]);
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  const picker = await emojiPicker(page);
  await picker.getByLabel("Search emoji", { exact: true }).fill("flag india");
  const india = picker.getByRole("button", {
    name: "Add flag: India emoji",
    exact: true,
  });
  const artwork = india.locator("img");
  await expect(artwork).toHaveAttribute("src", /1f1ee-1f1f3.svg$/);
  await expect
    .poll(() =>
      artwork.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const decoded = await page.evaluate(async (names) => {
    const results = await Promise.all(
      names.map(async (filename) => {
        const image = new Image();
        image.src = `/emoji/flags/${filename}`;
        await image.decode();
        return image.naturalWidth > 0;
      }),
    );
    return results.every(Boolean);
  }, Object.values(manifest));
  expect(decoded).toBe(true);
  await page.screenshot({ path: "test-results/flags-picker-desktop.png" });
  await india.click();
  await expect(
    page.getByRole("button", { name: "Cycle emoji layer", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId("collage-preview").evaluate((c) => {
        const canvas = c as HTMLCanvasElement,
          ctx = canvas.getContext("2d")!;
        return [0.46, 0.54].map((y) =>
          Array.from(
            ctx.getImageData(canvas.width * 0.5, canvas.height * y, 1, 1).data,
          ).slice(0, 3),
        );
      }),
    )
    .toEqual([
      [255, 153, 51],
      [19, 136, 8],
    ]);
  await moveLayer(page, "emoji", "bottom");
  await moveLayer(page, "emoji", "middle");
  await moveLayer(page, "emoji", "top");
  await parity(page, 1280, 1600);
});

test("extra images stay separate from the five theme photos and have crop, frame, and single-button layer controls", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  const before = await geometry(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add image", exact: true }).click();
  await (await chooser).setFiles(files[2]);
  await expect(
    page.getByLabel("Select added image").locator("option"),
  ).toHaveCount(2);
  const id = await page.getByLabel("Select added image").inputValue();
  expect(id).not.toBe("");
  await expect(page.locator(".photo-item")).toHaveCount(5);
  expect(await geometry(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Cycle image layer", exact: true }),
  ).toBeVisible();
  await moveLayer(page, "image", "bottom");
  await moveLayer(page, "image", "middle");
  await moveLayer(page, "image", "top");
  await page.getByLabel("Photo shape", { exact: true }).selectOption("rounded");
  await page.getByLabel("Photo width percent").fill("36");
  await page.getByLabel("Photo height percent").fill("28");
  await page.getByTestId("collage-preview").focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Adjust photo", exact: true }).click();
  const frame = await page.getByTestId("photo-selection").getAttribute("style");
  await page.getByLabel("Photo zoom", { exact: true }).focus();
  await page.keyboard.press("End");
  await page.getByLabel("Horizontal photo position", { exact: true }).focus();
  await page.keyboard.press("End");
  expect(await page.getByTestId("photo-selection").getAttribute("style")).toBe(
    frame,
  );
  expect(await geometry(page)).toEqual(before);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await parity(page, 1280, 1600);
  await page.screenshot({ path: "test-results/independent-image-desktop.png" });
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await expect(page.getByLabel("Select added image")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .click();
  await page.getByLabel("Select added image").selectOption(id);
  await expect(page.getByTestId("photo-selection")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cycle image layer", exact: true }),
  ).toHaveAttribute("data-position", "top");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new collage", exact: true })
    .click();
  await expect(page.getByLabel("Select added image")).toHaveCount(0);
});

test("a separate image can be added, replaced, removed, and exported with no template uploads", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Clean Grid", exact: true })
    .click();
  await page.getByTestId("extra-image-input").setInputFiles(files[0]);
  await expect(
    page.locator('.photo-hit-target[data-layer-kind="image"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.photo-hit-target[data-layer-kind="photo"]'),
  ).toHaveCount(0);
  await expect(page.locator(".photo-item")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download collage", exact: true }),
  ).toBeEnabled();
  const before = await page
    .getByTestId("photo-selection")
    .getAttribute("style");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await (await chooser).setFiles(files[1]);
  await expect(
    page
      .getByLabel("Selected photo", { exact: true })
      .locator("option:checked"),
  ).toContainText("mountains.jpg");
  expect(await page.getByTestId("photo-selection").getAttribute("style")).toBe(
    before,
  );
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await parity(page, 1280, 1600);
  await page
    .getByRole("button", { name: "Remove selected photo", exact: true })
    .click();
  await expect(
    page.locator('.photo-hit-target[data-layer-kind="image"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download collage", exact: true }),
  ).toBeDisabled();
});

test.describe("touch elements", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("single layer buttons and independent images are accessible on a phone", async ({
    page,
  }) => {
    await page.goto("/?mode=editor");
    await page.getByTestId("photo-input").setInputFiles(files[0]);
    await expect(page.locator(".photo-item")).toHaveCount(1);
    await page.getByTestId("extra-image-input").setInputFiles(files[1]);
    await expect(
      page.getByRole("button", { name: "Cycle image layer", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Cycle image layer", exact: true })
      .tap();
    await expect(
      page.getByRole("button", { name: "Cycle image layer", exact: true }),
    ).toHaveAttribute("data-position", "bottom");
    await page
      .getByRole("button", { name: "Cycle image layer", exact: true })
      .tap();
    await expect(
      page.getByRole("button", { name: "Cycle image layer", exact: true }),
    ).toHaveAttribute("data-position", "middle");
    await page
      .getByRole("button", { name: "Cycle image layer", exact: true })
      .tap();
    await expect(
      page.getByRole("button", { name: "Cycle image layer", exact: true }),
    ).toHaveAttribute("data-position", "top");
    await page.screenshot({
      path: "test-results/independent-image-mobile.png",
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    expect(
      (await page.locator(".canvas-stage").boundingBox())!.height,
    ).toBeGreaterThan(190);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(
        page.getByRole("button", { name: "Add image", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
});

import { moveLayer } from "./layerHelpers";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";

async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 400;
    c.getContext("2d")!.fillStyle = "#153e73";
    c.getContext("2d")!.fillRect(0, 0, 400, 400);
    return c.toDataURL().split(",")[1];
  });
  await page.getByTestId("photo-input").setInputFiles({
    name: "blue.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const editor = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await editor.fill("MMMMMMMM");
  await editor.press("Escape");
  return page.getByLabel("Select text layer", { exact: true }).inputValue();
}
async function region(page: Page) {
  return page.getByTestId("collage-preview").evaluate((c) => {
    const canvas = c as HTMLCanvasElement;
    const data = canvas
      .getContext("2d")!
      .getImageData(
        canvas.width * 0.3,
        canvas.height * 0.46,
        canvas.width * 0.4,
        canvas.height * 0.08,
      ).data;
    let white = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white++;
    return white;
  });
}
async function choose(page: Page, id: string) {
  await page.getByLabel("Select text layer", { exact: true }).selectOption(id);
}
async function exportParity(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  const result = await page
    .getByTestId("collage-preview")
    .evaluate(async (c, data) => {
      const preview = c as HTMLCanvasElement;
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = preview.width;
      canvas.height = preview.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const b = preview
        .getContext("2d")!
        .getImageData(0, 0, preview.width, preview.height).data;
      let sum = 0;
      for (let i = 0; i < a.length; i += 4)
        sum +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return {
        size: [image.width, image.height],
        difference: sum / ((a.length / 4) * 3),
      };
    }, bytes.toString("base64"));
  expect(result.size).toEqual([1280, 1600]);
  expect(result.difference).toBeLessThan(1);
}

test("text can sit behind photos, in the middle, and over stickers with matching export and theme persistence", async ({
  page,
}) => {
  const id = await prepare(page);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await expect.poll(() => region(page)).toBeGreaterThan(500);
  await moveLayer(page, "text", "bottom");
  await expect.poll(() => region(page)).toBe(0);
  await expect(
    page.getByRole("button", {
      name: "Move text backward one layer",
      exact: true,
    }),
  ).toBeDisabled();
  // The visible photo receives clicks instead of the hidden text hit target.
  const bounds = (await page.locator(".canvas-stage").boundingBox())!;
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(page.getByTestId("photo-selection")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Text content" })).toHaveCount(
    0,
  );
  // Re-select buried text without changing its depth; editing remains possible.
  await choose(page, id);
  await page
    .getByRole("button", { name: "Edit selected text", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await expect(editor).toBeFocused();
  await editor.press("Escape");
  await moveLayer(page, "text", "top");
  await expect.poll(() => region(page)).toBeGreaterThan(500);
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Heart sticker", exact: true })
    .click();
  const underSticker = await region(page);
  await choose(page, id);
  await moveLayer(page, "text", "top");
  await expect.poll(() => region(page)).toBeGreaterThan(underSticker + 100);
  const atTop = await region(page);
  await page
    .getByRole("button", { name: "Move text backward one layer", exact: true })
    .click();
  await expect.poll(() => region(page)).toBe(underSticker);
  await page
    .getByRole("button", { name: "Move text forward one layer", exact: true })
    .click();
  await expect.poll(() => region(page)).toBe(atTop);
  await moveLayer(page, "text", "middle");
  await expect(
    page.getByRole("button", { name: "Cycle text layer", exact: true }),
  ).toHaveAttribute("data-position", "middle");
  await exportParity(page);
  const middlePixels = await region(page);
  await page.screenshot({
    path: "test-results/text-layer-controls-desktop.png",
  });
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await expect(
    page.getByLabel("Select text layer").locator(`option[value="${id}"]`),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .click();
  await choose(page, id);
  await expect.poll(() => region(page)).toBe(middlePixels);
  await moveLayer(page, "text", "bottom");
  // The heart's white outline remains visible even when the text is covered.
  await expect.poll(() => region(page)).toBeLessThan(middlePixels);
  await exportParity(page);
});

test.describe("touch text layers", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("covered text remains accessible on a phone without page scrolling", async ({
    page,
  }) => {
    const id = await prepare(page);
    await moveLayer(page, "text", "bottom");
    await expect.poll(() => region(page)).toBe(0);
    await page.getByRole("button", { name: /^Select photo 1:/ }).tap();
    await choose(page, id);
    await moveLayer(page, "text", "middle");
    await moveLayer(page, "text", "top");
    await expect.poll(() => region(page)).toBeGreaterThan(500);
    await page
      .getByRole("button", { name: "Edit selected text", exact: true })
      .tap();
    const editor = page.getByRole("textbox", {
      name: "Text content",
      exact: true,
    });
    await expect(editor).toBeFocused();
    await editor.fill("PHONE MEMORIES");
    await editor.press("Escape");
    await page.screenshot({
      path: "test-results/text-layer-controls-mobile.png",
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
    ).toBeGreaterThan(200);
  });
});

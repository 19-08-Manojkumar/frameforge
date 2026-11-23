import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { THEMES } from "../../lib/themeLayouts";

const samplePaths = ["lake", "mountains", "coast", "forest", "river"].map((n) =>
  path.resolve(`public/samples/${n}.jpg`),
);
async function upload(page: Page, files = samplePaths) {
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(files.length);
  await expect(page.getByTestId("collage-preview")).toBeVisible();
}
async function exportedImage(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Download collage|Download again/ })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toContain(name);
  const bytes = await fs.readFile((await download.path())!);
  const encoded = bytes.toString("base64");
  return page.evaluate(
    async ({ encoded }) => {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes]);
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        signature: Array.from(bytes.slice(0, 12)),
        length: bytes.length,
      };
    },
    { encoded },
  );
}

test("five uploaded photographs render in all thirty-one themes and export in exact platform dimensions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?mode=editor");
  await upload(page);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "All themes", exact: true }).click();
  await page.getByLabel("Canvas size").selectOption("square");
  const fingerprints = new Map<string, string>();
  for (const theme of THEMES) {
    await page
      .getByRole("button", { name: `Select ${theme.name}`, exact: true })
      .click();
    await expect(page.getByTestId("collage-preview")).toHaveAttribute(
      "aria-label",
      new RegExp(theme.name),
    );
    const result = await exportedImage(page, theme.id);
    expect([result.width, result.height]).toEqual([1080, 1080]);
    expect(result.length).toBeGreaterThan(10000);
    expect(result.signature.slice(0, 4)).toEqual([137, 80, 78, 71]);
    // Export waits for the scheduled render; do not sample a canvas from the prior theme.
    const fingerprint = await page
      .getByTestId("collage-preview")
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
    expect(
      fingerprints.get(fingerprint),
      `${theme.name} should differ from ${fingerprints.get(fingerprint)}`,
    ).toBeUndefined();
    fingerprints.set(fingerprint, theme.name);
  }
  expect(fingerprints.size).toBe(THEMES.length);
  for (const [id, w, h] of [
    ["portrait", 1080, 1350],
    ["story", 1080, 1920],
    ["whatsapp", 1080, 1920],
    ["landscape", 1920, 1080],
  ] as const) {
    await page.getByLabel("Canvas size").selectOption(id);
    const result = await exportedImage(page, `${w}x${h}`);
    expect([result.width, result.height]).toEqual([w, h]);
  }
  expect(errors).toEqual([]);
});

test("PNG, JPG, WEBP and custom export; invalid dimensions cannot download", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await upload(page);
  await page.getByLabel("Canvas size").selectOption("custom");
  await page.getByLabel("Output width").fill("2048");
  await page.getByLabel("Output height").fill("1536");
  for (const format of ["PNG", "JPG", "WEBP"]) {
    await page.getByRole("button", { name: format, exact: true }).click();
    const image = await exportedImage(page, "2048x1536");
    expect([image.width, image.height]).toEqual([2048, 1536]);
    if (format === "JPG")
      expect(image.signature.slice(0, 3)).toEqual([255, 216, 255]);
    if (format === "WEBP")
      expect(String.fromCharCode(...image.signature.slice(8, 12))).toBe("WEBP");
  }
  await page.getByLabel("Output width").fill("0");
  await expect(
    page.getByRole("button", { name: /Download collage|Download again/ }),
  ).toBeDisabled();
  await expect(page.locator(".field-error")).toContainText("between 320");
  await page.getByLabel("Output width").fill("6000");
  await page.getByLabel("Output height").fill("6000");
  await expect(page.locator(".field-error")).toContainText("24 megapixels");
});

test("reordering, removal, sample replacement, and ten-image limit", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByRole("button", { name: /Photos/ }).click();
  await page.getByRole("button", { name: /Try sample photos/ }).click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(page.locator(".sample-banner")).toBeVisible();
  await upload(page);
  await expect(page.locator(".sample-banner")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Move lake.jpg later", exact: true })
    .click();
  await expect(page.locator(".photo-item img").nth(1)).toHaveAttribute(
    "alt",
    "lake.jpg",
  );
  await page
    .getByRole("button", { name: "Remove lake.jpg", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(4);
  await page
    .getByTestId("photo-input")
    .setInputFiles([...samplePaths, ...samplePaths]);
  await expect(page.locator(".photo-item")).toHaveCount(10);
  await expect(page.locator(".toast.error")).toContainText("up to 10");
  await expect(
    page.getByRole("button", { name: "Add more photos" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.locator(".photo-item")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Download collage/ }),
  ).toBeDisabled();
});

test("file validation, mixed batches, real drop events, and no image upload requests", async ({
  page,
}) => {
  const uploadRequests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") uploadRequests.push(`${r.method()} ${r.url()}`);
  });
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles([
    {
      name: "not-a-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("invalid"),
    },
    {
      name: "valid.jpg",
      mimeType: "image/jpeg",
      buffer: await fs.readFile(samplePaths[0]),
    },
  ]);
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await expect(page.locator(".toast.error")).toContainText("choose a JPG");
  await page.getByRole("button", { name: "Clear all" }).click();
  const data = Array.from(await fs.readFile(samplePaths[0]));
  await page.locator(".upload-zone").evaluate((zone, bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(bytes)], "dropped.jpg", { type: "image/jpeg" }),
    );
    zone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
    );
  }, data);
  await expect(page.locator(".photo-item")).toHaveCount(1);
  expect(uploadRequests).toEqual([]);
});

test("mobile workspace fits viewport and exposes touch ordering, themes, and export", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?mode=editor");
  await upload(page);
  await page.getByRole("button", { name: /Templates/ }).click();
  await expect(page.locator(".theme-card")).toHaveCount(7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Photos/ }).click();
  await page
    .getByRole("button", { name: "Move lake.jpg later", exact: true })
    .click();
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Creative", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Polaroid", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Export/ })
    .first()
    .click();
  await page.getByLabel("Canvas size").selectOption("whatsapp");
  const result = await exportedImage(page, "1080x1920");
  expect([result.width, result.height]).toEqual([1080, 1920]);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("preview composition matches exported pixels after downscaling", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await upload(page);
  // 1600px square makes preview and output exactly the same pixel dimensions.
  await page.getByLabel("Canvas size").selectOption("custom");
  await page.getByLabel("Output width").fill("1600");
  await page.getByLabel("Output height").fill("1600");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download collage" }).click();
  const download = await pending,
    buffer = await fs.readFile((await download.path())!);
  const difference = await page
    .getByTestId("collage-preview")
    .evaluate(async (canvas, b64) => {
      const preview = canvas as HTMLCanvasElement,
        original = new Image();
      original.src = `data:image/png;base64,${b64}`;
      await original.decode();
      const other = document.createElement("canvas");
      other.width = preview.width;
      other.height = preview.height;
      const ctx = other.getContext("2d")!;
      ctx.drawImage(original, 0, 0);
      const a = ctx.getImageData(0, 0, other.width, other.height).data,
        b = preview
          .getContext("2d")!
          .getImageData(0, 0, preview.width, preview.height).data;
      let difference = 0;
      for (let i = 0; i < a.length; i += 4)
        difference +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return difference / ((a.length / 4) * 3);
    }, buffer.toString("base64"));
  expect(difference).toBeLessThan(1);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});

test("responsive widths and keyboard dialogs remain usable", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await upload(page);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Collage preview" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Stickers & emoji", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByLabel("Select text layer", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Add photos to collage", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Add image", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Add text", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Customize", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Focus preview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Full screen", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(
    page.getByRole("dialog", { name: "Make a little magic." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Quick guide" })).toBeFocused();
});

test("template-first workflow, categories, and independently scrolling panels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?mode=editor");
  await expect(page.getByTestId("collage-preview")).toBeVisible();
  await expect(page.locator(".photo-item")).toHaveCount(0);
  await expect(page.locator(".theme-card")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Download collage" }),
  ).toBeDisabled();
  const scroll = page.locator(".theme-scroll");
  expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".theme-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Tour", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Torn Travel Diary", exact: true })
    .click();
  await upload(page);
  await page.locator(".template-copy summary").click();
  await page.getByLabel("Template wording 1").fill("Ooty memories");
  await page.getByLabel("Canvas size").selectOption("whatsapp");
  const image = await exportedImage(page, "torn-travel");
  expect([image.width, image.height]).toEqual([1080, 1920]);
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [768, 950],
    [390, 844],
    [320, 640],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
      `vertical overflow at ${width}x${height}`,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `horizontal overflow at ${width}x${height}`,
    ).toBe(true);
  }
});

test("short desktop viewports keep all three panels full-height and correctly ordered", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await expect(page.getByTestId("collage-preview")).toBeAttached();
  for (const [width, height] of [
    [1280, 590],
    [1920, 600],
    [1440, 640],
    [1024, 600],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    const panels = await page.evaluate(() => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect().toJSON();
      return {
        editor: rect(".editor-layout"),
        themes: rect(".theme-panel"),
        center: rect(".center-panel"),
        exports: rect(".export-panel"),
        preview: rect(".canvas-workspace"),
        gallery: rect(".theme-scroll"),
        download: rect(".download-button"),
      };
    });
    expect(
      panels.themes.right,
      `theme column at ${width}x${height}`,
    ).toBeLessThanOrEqual(panels.center.left + 1);
    expect(panels.center.right).toBeLessThanOrEqual(panels.exports.left + 1);
    for (const panel of [panels.themes, panels.center, panels.exports]) {
      expect(Math.abs(panel.top - panels.editor.top)).toBeLessThan(2);
      expect(panel.height).toBeGreaterThan(panels.editor.height - 3);
    }
    expect(panels.preview.height).toBeGreaterThan(140);
    expect(panels.gallery.height).toBeGreaterThan(150);
    expect(panels.download.bottom).toBeLessThanOrEqual(height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 590 });
  await page.screenshot({ path: "test-results/short-desktop-fixed.png" });
  await page.getByRole("button", { name: /Photos/ }).click();
  await page.getByRole("button", { name: /Try sample photos/ }).click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  const preview = await page.locator(".canvas-workspace").boundingBox();
  expect(preview!.height).toBeGreaterThan(140);
  const image = await exportedImage(page, "1080x1350");
  expect([image.width, image.height]).toEqual([1080, 1350]);
});

test("preview uses the full center height and focus mode expands the canvas without losing photos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 590 });
  await page.goto("/?mode=editor");
  await expect(page.getByTestId("collage-preview")).toBeVisible();
  await expect
    .poll(
      async () => (await page.locator(".canvas-stage").boundingBox())!.height,
    )
    .toBeGreaterThan(400);
  for (const [width, height] of [
    [1280, 590],
    [1440, 900],
    [390, 844],
    [320, 640],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(async () =>
        page.locator(".canvas-stage").evaluate((el) => {
          const stage = el.getBoundingClientRect(),
            workspace = document
              .querySelector(".canvas-workspace")!
              .getBoundingClientRect();
          return (
            stage.left >= workspace.left - 1 &&
            stage.right <= workspace.right + 1 &&
            stage.top >= workspace.top - 1 &&
            stage.bottom <= workspace.bottom + 1
          );
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /Photos/ }).click();
  await upload(page);
  await page.getByLabel("Canvas size").selectOption("landscape");
  const before = (await page.locator(".canvas-workspace").boundingBox())!.width;
  await page
    .getByRole("button", { name: "Focus preview", exact: true })
    .click();
  await expect(page.locator(".theme-panel")).toBeHidden();
  await expect(page.locator(".export-panel")).toBeHidden();
  await expect
    .poll(
      async () => (await page.locator(".canvas-stage").boundingBox())!.width,
    )
    .toBeGreaterThan(before * 1.3);
  await page.getByRole("button", { name: "Show panels", exact: true }).click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  const output = await exportedImage(page, "1920x1080");
  expect([output.width, output.height]).toEqual([1920, 1080]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Export/ }).click();
  await page
    .getByRole("button", { name: "Focus preview", exact: true })
    .click();
  await expect(page.locator(".export-panel")).toBeHidden();
  await page.getByRole("button", { name: "Show panels", exact: true }).click();
  await expect(page.locator(".export-panel")).toBeVisible();
});

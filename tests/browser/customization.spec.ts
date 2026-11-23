import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { createLayout } from "../../lib/themeLayouts";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function photos(page: Page) {
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
}
async function pixels(page: Page, points: number[][]) {
  return page.getByTestId("collage-preview").evaluate((canvas, points) => {
    const c = canvas as HTMLCanvasElement,
      ctx = c.getContext("2d")!;
    return points.map(([x, y]) =>
      Array.from(
        ctx.getImageData(
          Math.floor(x * c.width),
          Math.floor(y * c.height),
          1,
          1,
        ).data,
      ).slice(0, 3),
    );
  }, points);
}
async function color(page: Page, name: string, value: string) {
  await page.getByLabel(`${name} color hex`, { exact: true }).fill(value);
  await expect(page.getByLabel(`${name} color`, { exact: true })).toHaveValue(
    value,
  );
}

test("Scenic Fan colors independently change the footer, gaps, and background in preview, cards, and export", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await photos(page);
  const height = (await page.locator(".canvas-workspace").boundingBox())!
    .height;
  await color(page, "Background", "#14283c");
  await color(page, "Gap", "#edc917");
  await color(page, "Section", "#5e246a");
  const slot = createLayout("scenic-fan", 5, 1080, 1350).slots[0],
    end = slot.polygon![slot.polygon!.length - 1];
  const boundary = [
    slot.x + end[0] * slot.width,
    slot.y + end[1] * slot.height,
  ];
  const points = [
    [0.005, 0.5],
    [0.08, 0.9],
    [
      (1080 * 0.5 + boundary[0]) / 2 / 1080,
      (1350 * 0.77 + boundary[1]) / 2 / 1350,
    ],
  ];
  const wanted = [
    [20, 40, 60],
    [94, 36, 106],
    [237, 201, 23],
  ];
  await expect.poll(() => pixels(page, points)).toEqual(wanted);
  await page.getByRole("button", { name: /Templates/ }).click();
  const card = page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .locator("canvas");
  await expect
    .poll(() =>
      card.evaluate((canvas) => {
        const c = canvas as HTMLCanvasElement;
        return Array.from(
          c
            .getContext("2d")!
            .getImageData(
              Math.floor(0.08 * c.width),
              Math.floor(0.9 * c.height),
              1,
              1,
            ).data,
        ).slice(0, 3);
      }),
    )
    .toEqual(wanted[1]);
  expect((await page.locator(".canvas-workspace").boundingBox())!.height).toBe(
    height,
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download collage" }).click();
  const download = await pending,
    bytes = await fs.readFile((await download.path())!);
  const result = await page.evaluate(
    async ({ data, points }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      return {
        size: [canvas.width, canvas.height],
        pixels: points.map(([x, y]) =>
          Array.from(
            ctx.getImageData(
              Math.floor(x * canvas.width),
              Math.floor(y * canvas.height),
              1,
              1,
            ).data,
          ).slice(0, 3),
        ),
      };
    },
    { data: bytes.toString("base64"), points },
  );
  expect(result.size).toEqual([1080, 1350]);
  expect(result.pixels).toEqual(wanted);
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#f4f1e9");
  await color(page, "Background", "#ccddee");
  await page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .click();
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#14283c");
  await expect(page.getByLabel("Section color", { exact: true })).toHaveValue(
    "#5e246a",
  );
  await page.getByRole("button", { name: "Reset theme colors" }).click();
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#3d4e4d");
  await expect.poll(() => pixels(page, [[0.005, 0.5]])).toEqual([[61, 78, 77]]);
});

test("grid gutters and outer canvas have separate colors", async ({ page }) => {
  await page.goto("/?mode=editor");
  await photos(page);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Clean Grid", exact: true })
    .click();
  await color(page, "Background", "#102030");
  await color(page, "Gap", "#fc00ee");
  const [a, b] = createLayout("clean-grid", 5, 1080, 1350).slots;
  const between =
    a.y === b.y
      ? [(a.x + a.width + b.x) / 2 / 1080, (a.y + a.height / 2) / 1350]
      : [(a.x + a.width / 2) / 1080, (a.y + a.height + b.y) / 2 / 1350];
  await expect
    .poll(async () => {
      const [background, gap] = await pixels(page, [[0.005, 0.005], between]);
      // Photo shadows can shade the selected gap color, while its hue is retained.
      return (
        background.every((channel, i) => channel === [16, 32, 48][i]) &&
        gap.every((channel, i) => Math.abs(channel - [252, 0, 238][i]) <= 16)
      );
    })
    .toBe(true);
});

test("one click edits default text without Customize and dragging still moves it", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await photos(page);
  const customize = page.getByRole("button", {
    name: "Customize",
    exact: true,
  });
  await expect(customize).toHaveAttribute("aria-pressed", "false");
  const title = page.getByRole("button", {
    name: "Edit text: EVERY PATH LEADS SOMEWHERE",
    exact: true,
  });
  await title.click();
  const editor = page.getByRole("textbox", {
    name: "Text content",
  });
  await expect(editor).toBeFocused();
  await expect(customize).toHaveAttribute("aria-pressed", "false");
  await editor.fill("MY ROAD\nMY MEMORIES");
  await editor.press("Escape");
  await expect(editor).toHaveCount(0);
  const edited = page.getByRole("button", {
    name: "Edit text: MY ROAD MY MEMORIES",
    exact: true,
  });
  await expect(edited).toBeVisible();
  const before = (await edited.boundingBox())!;
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + 35,
    before.y + before.height / 2 - 20,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(editor).toHaveCount(0);
  await expect
    .poll(async () => Math.abs((await edited.boundingBox())!.x - before.x))
    .toBeGreaterThan(20);
  await edited.focus();
  await edited.press("Enter");
  await expect(editor).toBeFocused();
  await editor.fill("READY TO GO");
  await editor.press("Control+Enter");
  await expect(editor).toHaveCount(0);
  const imageBefore = await page
    .getByTestId("collage-preview")
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download collage" }).click();
  expect((await pending).suggestedFilename()).toContain("scenic-fan");
  expect(imageBefore.length).toBeGreaterThan(10000);
});

test("Tour gap colors preserve title panels and photographic backgrounds can be replaced", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await photos(page);
  await page.getByRole("button", { name: /Templates/ }).click();
  await page
    .getByRole("button", { name: "Select Let’s Hike", exact: true })
    .click();
  await color(page, "Background", "#14283c");
  await color(page, "Gap", "#edc917");
  await expect.poll(() => pixels(page, [[0.1, 0.62]])).toEqual([[20, 40, 60]]);
  await color(page, "Section", "#5e246a");
  await expect
    .poll(() =>
      pixels(page, [
        [0.1, 0.62],
        [0.01, 0.62],
      ]),
    )
    .toEqual([
      [94, 36, 106],
      [20, 40, 60],
    ]);
  await page
    .getByRole("button", { name: "Select Torn Travel Diary", exact: true })
    .click();
  await color(page, "Background", "#14283c");
  await color(page, "Gap", "#edc917");
  await expect.poll(() => pixels(page, [[0.01, 0.5]])).toEqual([[20, 40, 60]]);
  await page.getByRole("button", { name: "Reset theme colors" }).click();
  await expect
    .poll(() => pixels(page, [[0.01, 0.5]]))
    .not.toEqual([[20, 40, 60]]);
});

test.describe("touch text editing", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tapping template text edits in place inside the phone canvas", async ({
    page,
  }) => {
    await page.goto("/?mode=editor");
    const title = page.getByRole("button", {
      name: "Edit text: EVERY PATH LEADS SOMEWHERE",
      exact: true,
    });
    await title.tap();
    const editor = page.getByRole("textbox", {
      name: "Text content",
    });
    await expect(editor).toBeFocused();
    await editor.fill("WEEKEND AWAY");
    const field = (await editor.boundingBox())!;
    expect(field.width).toBeGreaterThan(40);
    expect(field.height).toBeGreaterThan(5);
    expect(field.x).toBeGreaterThanOrEqual(0);
    expect(field.x + field.width).toBeLessThanOrEqual(390);
    await expect(page.locator("dialog.text-edit-dialog")).toHaveCount(0);
    await expect(
      page.locator(".canvas-stage .inline-text-input"),
    ).toBeFocused();
    await editor.press("Escape");
    await expect(
      page.getByRole("button", {
        name: "Edit text: WEEKEND AWAY",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Customize", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    // Switching from selected photo controls to text must not move the touch
    // target until pointerup has delivered the edit click.
    await photos(page);
    await page.getByRole("button", { name: /^Select photo 1:/ }).tap();
    await expect(page.getByLabel("Photo shape", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Edit text: WEEKEND AWAY", exact: true })
      .tap();
    await expect(editor).toBeFocused();
  });
});

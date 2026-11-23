import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

const photos = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(photos);
  await expect(page.locator(".photo-item")).toHaveCount(5);
}
async function noPageScroll(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
}
async function fittedCanvas(page: Page) {
  await expect
    .poll(() =>
      page.locator(".canvas-workspace").evaluate((workspace) => {
        const stage = workspace.querySelector<HTMLElement>(".canvas-stage")!;
        const style = getComputedStyle(workspace);
        const [width, height] = stage.style.aspectRatio.split("/").map(Number);
        const availableWidth =
          workspace.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);
        const availableHeight =
          workspace.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom);
        const expectedWidth = Math.min(
          availableWidth,
          (availableHeight * width) / height,
        );
        return Math.abs(stage.getBoundingClientRect().width - expectedWidth);
      }),
    )
    .toBeLessThan(1);
  return (await page.getByTestId("collage-preview").boundingBox())!;
}

test("story tools use side space and keep the full-height preview large while editing", async ({
  page,
}) => {
  await prepare(page);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("story");
  await expect(page.locator(".preview-section")).toHaveAttribute(
    "data-tool-dock",
    "side",
  );
  const canvas = page.getByTestId("collage-preview");
  await expect
    .poll(async () => (await canvas.boundingBox())!.height)
    .toBeGreaterThan(850);
  const before = await fittedCanvas(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Big memories deserve a bigger preview.");
  const after = await fittedCanvas(page);
  expect(Math.abs(after.height - before.height)).toBeLessThan(3);
  const tools = (await page
    .getByRole("toolbar", { name: "Selected text style" })
    .boundingBox())!;
  expect(tools.x).toBeGreaterThanOrEqual(after.x + after.width - 2);
  await page.screenshot({ path: "test-results/large-story-preview.png" });
  await noPageScroll(page);
});

test("orientation keeps the outer columns fixed and moves only landscape editing tools above the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  const panels = [".theme-panel", ".center-panel", ".export-panel"];
  const original = await Promise.all(
    panels.map(
      async (selector) => (await page.locator(selector).boundingBox())!,
    ),
  );
  const fixedColumns = async () => {
    for (const [index, selector] of panels.entries()) {
      const box = (await page.locator(selector).boundingBox())!;
      for (const property of ["x", "y", "width", "height"] as const)
        expect(
          Math.abs(box[property] - original[index][property]),
        ).toBeLessThan(2);
    }
  };
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("landscape");
  await expect(page.locator(".preview-section")).toHaveAttribute(
    "data-tool-dock",
    "top",
  );
  await fixedColumns();
  const center = (await page.locator(".center-panel").boundingBox())!;
  const canvas = page.getByTestId("collage-preview");
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(center.width - 55);
  const before = (await canvas.boundingBox())!;
  expect(before.x).toBeGreaterThan(center.x);
  expect(before.x + before.width).toBeLessThan(center.x + center.width);
  expect(before.width).toBeGreaterThan(center.width - 55);
  expect(before.width / before.height).toBeCloseTo(16 / 9, 2);
  await page.getByRole("button", { name: /^Select photo 1:/ }).click();
  const controls = page.locator(".preview-section .photo-controls");
  await expect(controls).toBeVisible();
  await expect
    .poll(async () => {
      const workspace = (await page
        .locator(".canvas-workspace")
        .boundingBox())!;
      const maximum = Math.min(
        workspace.width - 10,
        ((workspace.height - 10) * 16) / 9,
      );
      return Math.abs((await canvas.boundingBox())!.width - maximum);
    })
    .toBeLessThan(5);
  const after = (await canvas.boundingBox())!;
  const tools = (await controls.boundingBox())!;
  expect(tools.y + tools.height).toBeLessThanOrEqual(after.y);
  expect(tools.x).toBeGreaterThanOrEqual(center.x);
  expect(tools.x + tools.width).toBeLessThanOrEqual(center.x + center.width);
  const workspace = (await page.locator(".canvas-workspace").boundingBox())!;
  const maxFit = Math.min(
    workspace.width - 10,
    ((workspace.height - 10) * 16) / 9,
  );
  expect(Math.abs(after.width - maxFit)).toBeLessThan(5);
  await expect(
    page.getByLabel("Background color hex", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Canvas size", { exact: true })).toBeVisible();
  await fixedColumns();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1920, 1080,
  ]);
  await page.screenshot({ path: "test-results/large-landscape-preview.png" });
  await noPageScroll(page);
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("portrait");
  await fixedColumns();
  await page.getByLabel("Canvas size", { exact: true }).selectOption("story");
  await expect(page.locator(".preview-section")).toHaveAttribute(
    "data-tool-dock",
    "side",
  );
  await expect(
    page.locator(".preview-section .preview-tool-dock"),
  ).toBeVisible();
  await fixedColumns();
});

test("Quick Create keeps its controls on the left while the preview changes orientation", async ({
  page,
}) => {
  await prepare(page);
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("landscape");
  await page.getByRole("button", { name: "Quick Create", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Quick Create", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const panel = (await page.locator(".quick-panel").boundingBox())!;
  const canvas = await fittedCanvas(page);
  expect(panel.width).toBeLessThanOrEqual(360);
  expect(panel.x + panel.width).toBeLessThan(canvas.x);
  expect(canvas.width).toBeGreaterThan(980);
  await expect(
    page.getByRole("button", { name: "Full screen", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/large-quick-landscape.png" });
  await noPageScroll(page);
});

test("zoom keeps every edge reachable and Fit returns to the complete composition", async ({
  page,
}) => {
  await prepare(page);
  const workspace = page.locator(".canvas-workspace"),
    canvas = page.getByTestId("collage-preview");
  const fit = await fittedCanvas(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(fit.width * 1.95);
  await workspace.evaluate((el) => {
    el.scrollLeft = 0;
    el.scrollTop = 0;
  });
  const bounds = (await workspace.boundingBox())!,
    start = (await canvas.boundingBox())!;
  expect(start.x).toBeGreaterThanOrEqual(bounds.x);
  expect(start.y).toBeGreaterThanOrEqual(bounds.y);
  await workspace.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
    el.scrollTop = el.scrollHeight;
  });
  const end = (await canvas.boundingBox())!;
  expect(end.x + end.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  expect(end.y + end.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
  await page.getByRole("button", { name: "Fit preview", exact: true }).click();
  await expect
    .poll(async () => Math.abs((await canvas.boundingBox())!.width - fit.width))
    .toBeLessThan(2);
  await noPageScroll(page);
});

test.describe("large mobile preview", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("Quick Create retains its stacked panels and supports a larger expanded preview", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("photo-input").setInputFiles(photos);
    await expect(page.locator(".photo-item")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Choose size & download", exact: true })
      .click();
    await page.getByRole("button", { name: /Instagram Story/ }).click();
    const canvas = page.getByTestId("collage-preview");
    const before = await fittedCanvas(page);
    expect(before.height).toBeGreaterThan(280);
    await page.getByRole("button", { name: "Full screen", exact: true }).tap();
    await expect(
      page.getByRole("dialog", { name: "Collage preview", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await canvas.boundingBox())!.height)
      .toBeGreaterThan(before.height + 50);
    await page.screenshot({ path: "test-results/expanded-mobile-preview.png" });
    await page
      .getByRole("button", { name: "Exit full screen", exact: true })
      .tap();
    await noPageScroll(page);
  });
});

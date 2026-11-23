import { moveLayer } from "./layerHelpers";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Select photo 2: mountains.jpg", exact: true })
    .click();
  await expect(page.getByTestId("photo-selection")).toBeVisible();
}
async function geometry(page: Page) {
  return page.getByTestId("photo-selection").evaluate((el) => ({
    x: parseFloat((el as HTMLElement).style.left),
    y: parseFloat((el as HTMLElement).style.top),
    width: parseFloat((el as HTMLElement).style.width),
    height: parseFloat((el as HTMLElement).style.height),
    rotation: (el as HTMLElement).style.transform,
  }));
}
async function drag(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  dx: number,
  dy: number,
) {
  const box = (await locator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + dx,
    box.y + box.height / 2 + dy,
    { steps: 12 },
  );
  await page.mouse.up();
}

test("photos move, resize, rotate, change masks, retain theme edits, and reset", async ({
  page,
}) => {
  await prepare(page);
  await page.getByLabel("Photo shape", { exact: true }).selectOption("rounded");
  await page.getByLabel("Photo width percent").fill("28");
  await page.getByLabel("Photo height percent").fill("22");
  const before = await geometry(page);
  await drag(page, page.getByTestId("photo-selection"), 35, 25);
  await expect
    .poll(async () => (await geometry(page)).x)
    .toBeGreaterThan(before.x + 2);
  await expect
    .poll(async () => (await geometry(page)).y)
    .toBeGreaterThan(before.y + 1);
  const moved = await geometry(page);
  await drag(
    page,
    page.getByRole("button", { name: "Resize photo e", exact: true }),
    30,
    0,
  );
  await expect
    .poll(async () => (await geometry(page)).width)
    .toBeGreaterThan(moved.width + 2);
  await moveLayer(page, "photo", "top");
  await page.getByRole("button", { name: "Adjust photo", exact: true }).click();
  const cropFrame = await geometry(page),
    cropBefore = await page
      .getByTestId("collage-preview")
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await drag(page, page.getByTestId("photo-selection"), 25, 0);
  expect(await geometry(page)).toEqual(cropFrame);
  await expect
    .poll(() =>
      page
        .getByTestId("collage-preview")
        .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(cropBefore);
  await page.getByRole("button", { name: "Move frame", exact: true }).click();
  await page.getByTestId("collage-preview").focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => (await geometry(page)).x)
    .toBeGreaterThan(cropFrame.x);
  await page
    .getByRole("button", { name: "Rotate photo right", exact: true })
    .click();
  await expect
    .poll(async () => (await geometry(page)).rotation)
    .toContain("0.261");
  await page.getByLabel("Photo shape", { exact: true }).selectOption("circle");
  const circle = await geometry(page);
  expect((circle.width * 1080) / (circle.height * 1350)).toBeCloseTo(1, 5);
  await moveLayer(page, "photo", "top");
  await moveLayer(page, "photo", "bottom");
  await page.screenshot({ path: "test-results/photo-editor-desktop.png" });
  const edited = await geometry(page);
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .click();
  await page.getByRole("button", { name: /Photos/ }).click();
  await page
    .getByRole("button", { name: "Select photo 2: mountains.jpg", exact: true })
    .click();
  expect(await geometry(page)).toEqual(edited);
  await page.getByRole("button", { name: "Reset layout", exact: true }).click();
  await expect(page.getByTestId("photo-selection")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select photo 2: mountains.jpg", exact: true })
    .click();
  await expect(page.getByLabel("Photo shape", { exact: true })).toHaveValue(
    "template",
  );
});

test("replacement preserves a frame and removal or addition leaves other edited frames in place", async ({
  page,
}) => {
  await prepare(page);
  await page.getByLabel("Photo shape", { exact: true }).selectOption("arch");
  await page.getByLabel("Photo width percent").fill("30");
  const before = await geometry(page);
  let chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await (await chooser).setFiles(files[0]);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(
    page
      .getByLabel("Selected photo", { exact: true })
      .locator("option:checked"),
  ).toHaveText("2. lake.jpg");
  expect(await geometry(page)).toEqual(before);
  chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("bad"),
  });
  await expect(page.locator(".toast.error")).toContainText(
    /invalid|supported|decode|image/i,
  );
  expect(await geometry(page)).toEqual(before);
  await page
    .getByRole("button", { name: "Select photo 3: coast.jpg", exact: true })
    .click();
  const survivor = await geometry(page);
  await page
    .getByRole("button", { name: "Select photo 2: lake.jpg", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove selected photo", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Select photo 2: coast.jpg", exact: true })
    .click();
  expect(await geometry(page)).toEqual(survivor);
  await page.getByTestId("photo-input").setInputFiles(files[1]);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  expect(await geometry(page)).toEqual(survivor);
});

test("all masks export with the edited geometry and added text, without selection controls", async ({
  page,
}) => {
  await prepare(page);
  // Match backing resolutions so the check measures composition, not font resampling.
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await page.getByLabel("Photo width percent").fill("30");
  await page.getByLabel("Photo height percent").fill("25");
  for (const shape of [
    "rectangle",
    "rounded",
    "circle",
    "diamond",
    "arch",
    "template",
  ]) {
    await page.getByLabel("Photo shape", { exact: true }).selectOption(shape);
    await expect(page.locator(".preview-error, .toast.error")).toHaveCount(0);
  }
  await page.getByLabel("Photo shape", { exact: true }).selectOption("diamond");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const text = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await text.fill("A CUSTOM ADVENTURE");
  await text.press("Escape");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page
    .getByRole("button", { name: "Select photo 2: mountains.jpg", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const download = await pending,
    data = (await fs.readFile((await download.path())!)).toString("base64");
  const result = await page
    .getByTestId("collage-preview")
    .evaluate(async (preview, data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = preview as HTMLCanvasElement,
        other = document.createElement("canvas");
      other.width = canvas.width;
      other.height = canvas.height;
      const context = other.getContext("2d")!;
      context.drawImage(image, 0, 0, other.width, other.height);
      const a = context.getImageData(0, 0, other.width, other.height).data,
        b = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
      let diff = 0;
      for (let i = 0; i < a.length; i += 4)
        diff +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return {
        size: [image.width, image.height],
        difference: diff / ((a.length / 4) * 3),
      };
    }, data);
  expect(result.size).toEqual([1280, 1600]);
  expect(result.difference).toBeLessThan(1);
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("whatsapp");
  const frame = (await page.getByTestId("photo-selection").boundingBox())!,
    canvas = (await page.getByTestId("collage-preview").boundingBox())!;
  expect(frame.x).toBeGreaterThanOrEqual(canvas.x - 1);
  expect(frame.y + frame.height).toBeLessThanOrEqual(
    canvas.y + canvas.height + 1,
  );
  const storyPending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const story = await storyPending,
    bytes = await fs.readFile((await story.path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1080, 1920,
  ]);
});

test.describe("touch photo editor", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("touch gestures move a photo and resize controls fit without page scrolling", async ({
    page,
  }) => {
    await prepare(page);
    await page
      .getByLabel("Photo shape", { exact: true })
      .selectOption("rounded");
    await page.getByLabel("Photo width percent").fill("30");
    await page.getByLabel("Photo height percent").fill("25");
    await moveLayer(page, "photo", "top");
    await expect
      .poll(async () => (await geometry(page)).width)
      .toBeCloseTo(30, 3);
    await expect
      .poll(async () => (await geometry(page)).height)
      .toBeCloseTo(25, 3);
    await page.getByTestId("collage-preview").focus();
    const before = await geometry(page),
      box = (await page.getByTestId("photo-selection").boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await expect(page.getByTestId("collage-preview")).toBeFocused();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 20, y: y + 15 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => (await geometry(page)).x)
      .toBeGreaterThan(before.x + 2);
    await page
      .getByRole("button", { name: "Resize photo e", exact: true })
      .focus();
    await page.keyboard.press("ArrowRight");
    expect((await geometry(page)).width).toBeGreaterThan(before.width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await page.screenshot({ path: "test-results/photo-editor-mobile.png" });
  });
});

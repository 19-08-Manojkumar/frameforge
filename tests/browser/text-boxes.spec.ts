import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs/promises";
const words =
  "Our favorite places and little adventures on the road become memories we will keep forever. Every stop has its own story.";
const fieldFor = (page: Page) =>
  page.getByRole("textbox", { name: "Text content", exact: true });
async function drag(page: Page, target: Locator, dx: number, dy: number) {
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}
async function bounds(page: Page) {
  return page.locator(".text-overlay-item.selected").boundingBox();
}
async function metadata(page: Page) {
  return page.locator(".text-overlay-item.selected").evaluate((e) => {
    const el = e as HTMLElement,
      stage = el.closest(".canvas-stage")!.getBoundingClientRect(),
      box = el.getBoundingClientRect();
    return {
      x: el.style.left,
      y: el.style.top,
      width: box.width / stage.width,
      height: box.height / stage.height,
    };
  });
}
async function hash(page: Page) {
  return page
    .getByTestId("collage-preview")
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
}
async function noScroll(field: Locator) {
  await expect
    .poll(() =>
      field.evaluate((e) => ({
        vertical: Math.max(0, e.scrollHeight - e.clientHeight - 1),
        horizontal: Math.max(0, e.scrollWidth - e.clientWidth - 1),
      })),
    )
    .toEqual({ vertical: 0, horizontal: 0 });
}

test("text automatically wraps at a fixed font size; moving, resizing, recovery, and export retain its box", async ({
  page,
}) => {
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
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const field = fieldFor(page);
  await field.fill("My trip");
  const font = await field.evaluate((e) =>
    parseFloat(getComputedStyle(e).fontSize),
  );
  const short = (await field.boundingBox())!.height;
  await field.fill(words);
  await noScroll(field);
  expect(
    await field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeCloseTo(font, 1);
  expect((await field.boundingBox())!.height).toBeGreaterThan(short * 2);
  const before = (await bounds(page))!;
  await drag(
    page,
    page.getByRole("button", { name: "Resize text box right", exact: true }),
    -60,
    0,
  );
  const narrow = (await bounds(page))!;
  expect(narrow.width).toBeLessThan(before.width - 35);
  expect(narrow.height).toBeGreaterThanOrEqual(before.height);
  expect(
    await field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeCloseTo(font, 1);
  await noScroll(field);
  await drag(
    page,
    page.getByRole("button", { name: "Move text box", exact: true }),
    55,
    -60,
  );
  const moved = (await bounds(page))!;
  expect(moved.x).toBeGreaterThan(narrow.x + 30);
  expect(moved.y).toBeLessThan(narrow.y - 35);
  await expect(field).toBeFocused();
  await drag(
    page,
    page.getByRole("button", {
      name: "Resize text box bottom right",
      exact: true,
    }),
    35,
    35,
  );
  const resized = (await bounds(page))!;
  expect(resized.width).toBeGreaterThan(moved.width + 20);
  expect(resized.height).toBeGreaterThan(moved.height + 20);
  const move = page.getByRole("button", { name: "Move text box", exact: true });
  await move.focus();
  await move.press("Shift+ArrowUp");
  expect((await bounds(page))!.y).toBeLessThan(resized.y - 5);
  await page.screenshot({ path: "test-results/text-box-desktop.png" });
  const original = await metadata(page);
  await field.press("Escape");
  await expect(
    page.getByTestId("draft-status").filter({ visible: true }),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const pixels = await hash(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect.poll(() => hash(page)).toBe(pixels);
  await page
    .getByRole("button", { name: "Edit text: " + words, exact: true })
    .click();
  const restored = await metadata(page);
  expect(restored.x).toBe(original.x);
  expect(restored.y).toBe(original.y);
  expect(restored.width).toBeCloseTo(original.width, 3);
  expect(restored.height).toBeCloseTo(original.height, 3);
  await expect(field).toHaveValue(words);
  await field.press("Escape");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  const difference = await page
    .getByTestId("collage-preview")
    .evaluate(async (c, data) => {
      const preview = c as HTMLCanvasElement,
        img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const out = document.createElement("canvas");
      out.width = preview.width;
      out.height = preview.height;
      const ctx = out.getContext("2d")!;
      ctx.drawImage(img, 0, 0, out.width, out.height);
      const a = ctx.getImageData(0, 0, out.width, out.height).data,
        b = preview
          .getContext("2d")!
          .getImageData(0, 0, preview.width, preview.height).data;
      let sum = 0;
      for (let i = 0; i < a.length; i += 4)
        sum +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return {
        size: [img.width, img.height],
        error: sum / ((a.length / 4) * 3),
      };
    }, bytes.toString("base64"));
  expect(difference.size).toEqual([1280, 1600]);
  expect(difference.error).toBeLessThan(1);
});

test.describe("touch text boxes in Quick Create", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("a user can drag and resize while typing without switching modes", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", {
        name: "Edit text: EVERY PATH LEADS SOMEWHERE",
        exact: true,
      })
      .tap();
    const field = fieldFor(page);
    await field.fill("Our favorite places and little adventures on the road.");
    const font = await field.evaluate((e) =>
      parseFloat(getComputedStyle(e).fontSize),
    );
    const before = (await bounds(page))!;
    const cdp = await page.context().newCDPSession(page);
    async function touchDrag(target: Locator, dx: number, dy: number) {
      const r = (await target.boundingBox())!;
      const x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + dx, y: y + dy }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await touchDrag(
      page.getByRole("button", { name: "Move text box", exact: true }),
      0,
      -65,
    );
    expect((await bounds(page))!.y).toBeLessThan(before.y - 35);
    const moved = (await bounds(page))!;
    await touchDrag(
      page.getByRole("button", { name: "Resize text box right", exact: true }),
      -35,
      0,
    );
    expect((await bounds(page))!.width).toBeLessThan(moved.width - 20);
    expect(
      await field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeCloseTo(font, 1);
    await noScroll(field);
    await expect(field).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Quick Create", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: "test-results/text-box-mobile.png" });
    await cdp.detach();
  });
});

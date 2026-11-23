import { moveLayer } from "./layerHelpers";
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  await page
    .getByTestId("photo-input")
    .setInputFiles(
      ["lake", "mountains", "coast", "forest", "river"].map((name) =>
        path.resolve(`public/samples/${name}.jpg`),
      ),
    );
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Select photo 2: mountains.jpg", exact: true })
    .click();
  await page
    .getByLabel("Photo shape", { exact: true })
    .selectOption("rectangle");
  await page.getByLabel("Photo width percent").fill("40");
  await page.getByLabel("Photo height percent").fill("35");
  await moveLayer(page, "photo", "top");
  await page.getByRole("button", { name: "Adjust photo", exact: true }).click();
  await page.getByLabel("Photo zoom", { exact: true }).focus();
  await page.getByLabel("Photo zoom", { exact: true }).press("End");
  await expect(page.getByLabel("Photo zoom", { exact: true })).toHaveValue(
    "300",
  );
}
const geometry = (page: Page) =>
  page.getByTestId("photo-selection").getAttribute("style");
const pixels = (page: Page) =>
  page
    .getByTestId("collage-preview")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());

test("photo alignment and zoom adjust image pixels while keeping the frame fixed", async ({
  page,
}) => {
  await prepare(page);
  const frame = await geometry(page);
  await expect(
    page.getByRole("button", { name: "Resize photo e", exact: true }),
  ).toHaveCount(0);
  for (const [direction, label, value] of [
    ["left", "Horizontal photo position", "0"],
    ["right", "Horizontal photo position", "100"],
    ["top", "Vertical photo position", "0"],
    ["bottom", "Vertical photo position", "100"],
  ]) {
    const before = await pixels(page);
    await page
      .getByRole("button", { name: `Align photo ${direction}`, exact: true })
      .click();
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    await expect.poll(() => pixels(page)).not.toBe(before);
    expect(await geometry(page)).toBe(frame);
  }
  await page
    .getByRole("button", { name: "Center photo in frame", exact: true })
    .click();
  await expect(
    page.getByLabel("Horizontal photo position", { exact: true }),
  ).toHaveValue("50");
  await expect(
    page.getByLabel("Vertical photo position", { exact: true }),
  ).toHaveValue("50");
  await page.getByTestId("collage-preview").focus();
  const box = (await page.getByTestId("photo-selection").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 15,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByLabel("Horizontal photo position", { exact: true })
          .inputValue(),
      ),
    )
    .toBeLessThan(50);
  await expect
    .poll(async () =>
      Number(
        await page
          .getByLabel("Vertical photo position", { exact: true })
          .inputValue(),
      ),
    )
    .toBeLessThan(50);
  expect(await geometry(page)).toBe(frame);
  await page
    .getByRole("button", { name: "Reset photo adjustment", exact: true })
    .click();
  await expect(page.getByLabel("Photo zoom", { exact: true })).toHaveValue(
    "100",
  );
  expect(await geometry(page)).toBe(frame);
  await page.getByRole("button", { name: "Move frame", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resize photo e", exact: true }),
  ).toBeVisible();
});

test.describe("touch adjustment", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("adjust controls and touch dragging keep the frame fixed without scrolling the page", async ({
    page,
  }) => {
    await prepare(page);
    const frame = await geometry(page);
    await page
      .getByRole("button", { name: "Align photo top", exact: true })
      .tap();
    await expect(
      page.getByLabel("Vertical photo position", { exact: true }),
    ).toHaveValue("0");
    await page
      .getByRole("button", { name: "Center photo in frame", exact: true })
      .tap();
    await page.getByTestId("collage-preview").focus();
    const box = (await page.getByTestId("photo-selection").boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 15, y: y + 10 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () =>
        Number(
          await page
            .getByLabel("Horizontal photo position", { exact: true })
            .inputValue(),
        ),
      )
      .toBeLessThan(50);
    expect(await geometry(page)).toBe(frame);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    const controls = (await page
      .getByRole("button", { name: "Adjust photo", exact: true })
      .boundingBox())!;
    expect(controls.x + controls.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: "test-results/photo-adjustments-mobile.png",
    });
  });
});

test("adjusting a selected Trip portrait does not select overlapping scenery", async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Golden Road Trip", exact: true })
    .click();
  await page.getByRole("button", { name: /Photos/ }).click();
  await page
    .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
    .click();
  await page.getByRole("button", { name: "Adjust photo", exact: true }).click();
  await page.getByLabel("Photo zoom", { exact: true }).focus();
  await page.getByLabel("Photo zoom", { exact: true }).press("End");
  const frame = await geometry(page);
  await page.getByTestId("collage-preview").focus();
  const box = (await page.getByTestId("collage-preview").boundingBox())!;
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 25, y, { steps: 8 });
  await page.mouse.up();
  await expect(
    page
      .getByLabel("Selected photo", { exact: true })
      .locator("option:checked"),
  ).toHaveText("1. lake.jpg");
  await expect
    .poll(async () =>
      Number(
        await page
          .getByLabel("Horizontal photo position", { exact: true })
          .inputValue(),
      ),
    )
    .toBeLessThan(50);
  expect(await geometry(page)).toBe(frame);
  await page.screenshot({ path: "test-results/photo-adjustments-desktop.png" });
});

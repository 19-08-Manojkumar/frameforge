import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException(
          "Storage is unavailable in this test.",
          "SecurityError",
        );
      },
    });
  });
});
async function upload(page: Page) {
  await page.goto("/?mode=editor");
  await page
    .getByTestId("photo-input")
    .setInputFiles(path.resolve("public/samples/lake.jpg"));
  await expect(page.locator(".photo-item")).toHaveCount(1);
}
async function unloadIsAllowed(page: Page) {
  return page.evaluate(() =>
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  );
}

test("refresh shortcuts show the friendly dialog and keeping edits preserves the collage", async ({
  page,
}) => {
  await upload(page);
  await page
    .getByRole("button", {
      name: "Edit text: EVERY PATH LEADS SOMEWHERE",
      exact: true,
    })
    .click();
  const text = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await text.fill("MY WEEKEND AWAY");
  await text.press("Escape");
  for (const shortcut of ["F5", "Control+r", "Control+Shift+r", "Meta+r"]) {
    await page.keyboard.press(shortcut);
    const dialog = page.getByRole("dialog", {
      name: "Refresh before your changes are saved?",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Refreshing now may lose those recent changes.",
    );
    await expect(
      dialog.getByRole("button", { name: "Keep editing", exact: true }),
    ).toBeFocused();
    await dialog
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".photo-item")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Edit text: MY WEEKEND AWAY",
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.keyboard.press("Control+r");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", {
      name: "Refresh before your changes are saved?",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("browser reload uses beforeunload and cancel keeps the uploaded image", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  expect(await unloadIsAllowed(page)).toBe(true);
  await page
    .getByTestId("photo-input")
    .setInputFiles(path.resolve("public/samples/lake.jpg"));
  await page
    .getByRole("button", { name: "Select photo 1: lake.jpg", exact: true })
    .click();
  expect(await unloadIsAllowed(page)).toBe(false);
  const pending = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await pending;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await expect(page.getByTestId("collage-preview")).toBeVisible();
});

test("confirming a refresh reloads once without a second browser warning", async ({
  page,
}) => {
  await upload(page);
  let nativeDialogs = 0;
  page.on("dialog", async (dialog) => {
    nativeDialogs++;
    await dialog.dismiss();
  });
  await page.keyboard.press("Control+r");
  const navigation = page.waitForEvent("domcontentloaded");
  await page
    .getByRole("button", { name: "Refresh anyway", exact: true })
    .click();
  await navigation;
  await expect(page.locator(".photo-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Full editor", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download collage", exact: true }),
  ).toBeDisabled();
  expect(nativeDialogs).toBe(0);
  expect(await unloadIsAllowed(page)).toBe(true);
});

test("Start over and logo navigation ask first, and confirmed reset clears the entire editor", async ({
  page,
}) => {
  await upload(page);
  await page
    .getByLabel("Background color hex", { exact: true })
    .fill("#112233");
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("whatsapp");
  await page.getByRole("button", { name: "JPG", exact: true }).click();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  let dialog = page.getByRole("dialog", {
    name: "Start a new collage?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await page
    .getByRole("link", { name: "FrameForge home", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Start a new collage?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Start new collage", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".photo-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Full editor", exact: true }).click();
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#3d4e4d");
  await expect(page.getByLabel("Canvas size", { exact: true })).toHaveValue(
    "portrait",
  );
  await expect(
    page.getByRole("button", { name: "PNG", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Customize", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Fit preview", exact: true }),
  ).toHaveText("Fit");
  expect(await unloadIsAllowed(page)).toBe(true);
});

test("Download first saves the image and leaves the editable collage open", async ({
  page,
}) => {
  await upload(page);
  await page.keyboard.press("Control+r");
  const dialog = page.getByRole("dialog", {
    name: "Refresh before your changes are saved?",
    exact: true,
  });
  const pending = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download first", exact: true })
    .click();
  const download = await pending,
    bytes = await fs.readFile((await download.path())!);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1080, 1350,
  ]);
  await expect(dialog.getByRole("status")).toContainText(
    "Your finished image has been downloaded.",
  );
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: "test-results/refresh-dialog-desktop.png" });
  await dialog
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(1);
  expect(await unloadIsAllowed(page)).toBe(false);
});

test("text or color edits are protected before upload, and restoring defaults removes the warning", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page
    .getByLabel("Background color hex", { exact: true })
    .fill("#112233");
  await page.keyboard.press("Control+r");
  const dialog = page.getByRole("dialog", {
    name: "Refresh before your changes are saved?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Download first", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset theme colors", exact: true })
    .click();
  expect(await unloadIsAllowed(page)).toBe(true);
});

test.describe("mobile session warning", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("restart confirmation stays inside the viewport and can be dismissed with touch", async ({
    page,
  }) => {
    await upload(page);
    await expect(page.locator(".sidebar-photos .session-notice")).toContainText(
      "Check the draft status before leaving.",
    );
    await page.getByRole("button", { name: "Start over", exact: true }).tap();
    const dialog = page.getByRole("dialog", {
      name: "Start a new collage?",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: "test-results/refresh-dialog-mobile.png" });
    await dialog
      .getByRole("button", { name: "Keep editing", exact: true })
      .tap();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".photo-item")).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
const status = (page: Page) =>
  page.locator('[data-testid="draft-status"]:visible');
async function saved(page: Page) {
  await expect(status(page)).toContainText("Draft saved on this device", {
    timeout: 20000,
  });
}
async function pixels(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (c) => {
    const canvas = c as HTMLCanvasElement,
      data = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  });
}
async function openQuick(page: Page) {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(
    page.getByRole("heading", { name: "Find your favorite story." }),
  ).toBeVisible();
}
test("refresh restores original photos, text, colors, masks, stickers, extra images, and output settings", async ({
  page,
}) => {
  await openQuick(page);
  await page.locator(".trip-details-form summary").click();
  await page.getByLabel("Trip destination", { exact: true }).fill("Kodaikanal");
  await page.getByLabel("Trip date", { exact: true }).fill("2026-10-28");
  await page
    .getByLabel("Trip caption", { exact: true })
    .fill("A weekend above the clouds.");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: /^Select photo 2:/ }).click();
  await page.getByLabel("Photo shape", { exact: true }).selectOption("circle");
  await page.getByLabel("Photo width percent").fill("30");
  await page.getByLabel("Photo height percent").fill("24");
  await page
    .getByLabel("Background color hex", { exact: true })
    .fill("#123456");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const text = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await text.fill("MADE OF LITTLE MOMENTS");
  await text.press("Escape");
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Add Mountain trail map sticker",
      exact: true,
    })
    .click();
  await page.getByTestId("extra-image-input").setInputFiles(files[2]);
  await expect(
    page.getByLabel("Select added image", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  await saved(page);
  expect(
    await page
      .getByTestId("collage-preview")
      .evaluate(
        (c) =>
          (c as HTMLCanvasElement).getContext("2d")!.getContextAttributes()
            .alpha,
      ),
  ).toBe(false);
  const before = await pixels(page);
  const originalHash = createHash("sha256")
    .update(await fs.readFile(files[0]))
    .digest("hex");
  const storedHash = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("frameforge-drafts", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const draft = await new Promise<any>((resolve) => {
      const r = db.transaction("drafts").objectStore("drafts").get("current");
      r.onsuccess = () => resolve(r.result);
    });
    const blob = await new Promise<Blob>((resolve) => {
      const r = db
        .transaction("assets")
        .objectStore("assets")
        .get(draft.photos[0].id);
      r.onsuccess = () => resolve(r.result.blob);
    });
    db.close();
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  });
  expect(storedHash).toBe(originalHash);
  await page.reload();
  const recovery = page.getByRole("dialog", {
    name: "Pick up where you left off.",
    exact: true,
  });
  await expect(recovery).toContainText("6 photos");
  const recoveryBox = (await recovery.boundingBox())!;
  expect(Math.abs(recoveryBox.x + recoveryBox.width / 2 - 720)).toBeLessThan(2);
  await page.screenshot({ path: "test-results/draft-recovery-desktop.png" });
  await recovery
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(recovery).toHaveCount(0);
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(page.getByLabel("Output width", { exact: true })).toHaveValue(
    "1280",
  );
  await expect(
    page.getByLabel("Background color hex", { exact: true }),
  ).toHaveValue("#123456");
  await expect(page.locator(".sticker-overlay-item")).toHaveCount(1);
  await expect(
    page.getByLabel("Select added image").locator("option"),
  ).toHaveCount(2);
  expect(
    await page
      .getByTestId("collage-preview")
      .evaluate(
        (c) =>
          (c as HTMLCanvasElement).getContext("2d")!.getContextAttributes()
            .alpha,
      ),
  ).toBe(false);
  await expect.poll(() => pixels(page), { timeout: 15000 }).toBe(before);
  await page.getByRole("button", { name: /^Select photo 2:/ }).click();
  await expect(page.getByLabel("Photo shape", { exact: true })).toHaveValue(
    "circle",
  );
  await saved(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1280, 1600,
  ]);
});
test("discarding a recovered draft starts empty and never brings removed photos back", async ({
  page,
}) => {
  await openQuick(page);
  await saved(page);
  await page.reload();
  const recovery = page.getByRole("dialog", {
    name: "Pick up where you left off.",
    exact: true,
  });
  await recovery
    .getByRole("button", { name: "Start a new collage instead", exact: true })
    .click();
  await expect(recovery).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Start with your moments.",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(recovery).toHaveCount(0);
  await page.getByTestId("photo-input").setInputFiles(files[0]);
  await saved(page);
  await page
    .getByRole("button", { name: "Manage photos", exact: true })
    .click();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve) => {
            const r = indexedDB.open("frameforge-drafts", 1);
            r.onsuccess = () => resolve(r.result);
          });
          const count = await new Promise<number>((resolve) => {
            const r = db.transaction("assets").objectStore("assets").count();
            r.onsuccess = () => resolve(r.result);
          });
          db.close();
          return count;
        }),
      { timeout: 15000 },
    )
    .toBe(0);
  await page.reload();
  await expect(recovery).toHaveCount(0);
});
test("a missing saved photo produces a recoverable error without silently deleting the draft", async ({
  page,
}) => {
  await openQuick(page);
  await saved(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("frameforge-drafts", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").clear();
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  const recovery = page.getByRole("dialog", {
    name: "Pick up where you left off.",
    exact: true,
  });
  await recovery
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(recovery.getByRole("alert")).toContainText("photo is missing");
  await expect(
    recovery.getByRole("button", { name: "Retry opening draft", exact: true }),
  ).toBeEnabled();
  await recovery
    .getByRole("button", { name: "Start a new collage instead", exact: true })
    .click();
  await expect(recovery).toHaveCount(0);
});
test("unavailable draft storage leaves editing and download usable and protects unsaved changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException(
          "Browser storage is blocked. Download your collage before leaving.",
          "SecurityError",
        );
      },
    });
  });
  await openQuick(page);
  await expect(status(page)).toContainText("Draft not saved");
  expect(
    await page.evaluate(() =>
      window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Choose size & download", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toContain("collage-");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new collage", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Start with your moments.",
      exact: true,
    }),
  ).toBeVisible();
});
test("a second tab cannot silently overwrite a newer draft", async ({
  page,
  context,
}) => {
  await openQuick(page);
  await saved(page);
  const other = await context.newPage();
  await other.goto("/");
  await other
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await other.locator(".trip-details-form summary").click();
  await other.getByLabel("Trip destination", { exact: true }).fill("Goa");
  await saved(other);
  await page.bringToFront();
  await page.locator(".trip-details-form summary").click();
  await page.getByLabel("Trip destination", { exact: true }).fill("Mumbai");
  await expect(status(page)).toContainText("Draft not saved", {
    timeout: 20000,
  });
  await expect(status(page).locator("p")).toHaveText(
    /Another studio tab has a newer draft/,
  );
  await other.reload();
  await other
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(
    other.getByLabel("Trip destination", { exact: true }),
  ).toHaveValue("Goa");
});
test.describe("phone draft recovery", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("draft recovery fits the phone and returns to Quick Create", async ({
    page,
  }) => {
    await openQuick(page);
    await saved(page);
    await page.reload();
    const recovery = page.getByRole("dialog", {
      name: "Pick up where you left off.",
      exact: true,
    });
    await expect(recovery).toBeVisible();
    await page.screenshot({ path: "test-results/draft-recovery-mobile.png" });
    const box = (await recovery.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 195)).toBeLessThan(2);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await recovery
      .getByRole("button", { name: "Continue editing", exact: true })
      .tap();
    await expect(
      page.getByRole("heading", {
        name: "Find your favorite story.",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

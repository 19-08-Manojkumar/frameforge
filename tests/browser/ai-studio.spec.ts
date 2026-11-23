import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
const files = ["lake", "mountains", "coast", "forest", "river"].map((name) =>
  path.resolve(`public/samples/${name}.jpg`),
);
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "AI Studio by Cloudflare" });
const configured = {
  configured: true,
  remaining: 60,
  personalRemaining: 10,
  dailyLimit: 60,
  resetAt: "2026-10-31T00:00:00Z",
  model: "FLUX.2 klein 4B",
};

async function mockAI(
  page: Page,
  options: {
    error?: string;
    delay?: number;
    invalid?: boolean;
    status?: number;
    providerCode?: number;
  } = {},
) {
  const posts: FormData[] = [];
  await page.route("**/api/ai/images", async (route) => {
    const req = route.request();
    if (req.method() === "GET")
      return route.fulfill({
        json: {
          ...configured,
          remaining: 60 - posts.length,
          personalRemaining: 10 - posts.length,
        },
      });
    expect(req.headers()["x-studio-ai"]).toBe("1");
    const form = await new Response(
      new Uint8Array(req.postDataBuffer()!).buffer,
      { headers: { "content-type": req.headers()["content-type"] } },
    ).formData();
    posts.push(form);
    expect(form.get("consent")).toBe("cloudflare");
    expect(form.has("token")).toBe(false);
    if (options.delay)
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    if (page.isClosed() || req.failure()) return;
    if (options.error)
      return route
        .fulfill({
          status: options.status ?? 429,
          json: {
            error: options.error,
            retryAfter: 15,
            providerCode: options.providerCode,
          },
        })
        .catch(() => {});
    if (options.invalid)
      return route.fulfill({
        contentType: "image/png",
        body: "not an actual PNG",
      });
    const base64 = await page.evaluate(
      ({ width, height }) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!,
          gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#a8e5d1");
        gradient.addColorStop(0.5, "#b3a4df");
        gradient.addColorStop(1, "#efb282");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffffa0";
        ctx.beginPath();
        ctx.arc(width * 0.68, height * 0.32, width * 0.15, 0, Math.PI * 2);
        ctx.fill();
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { width: Number(form.get("width")), height: Number(form.get("height")) },
    );
    await route
      .fulfill({
        contentType: "image/png",
        body: Buffer.from(base64, "base64"),
      })
      .catch(() => {});
  });
  return posts;
}
async function open(page: Page) {
  await page.getByRole("button", { name: "AI Studio", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(
    dialog(page).getByText("10 studio attempts left today", { exact: true }),
  ).toBeVisible();
}
async function generate(page: Page, edit = false) {
  const modal = dialog(page);
  await modal
    .getByLabel(edit ? "What would you like to change?" : "Your description", {
      exact: true,
    })
    .fill("Warm golden light with soft mountain mist");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", {
      name: edit ? "Create edited version" : "Generate image",
      exact: true,
    })
    .click();
  await expect(modal.getByAltText("AI generated result")).toBeVisible();
}
async function hash(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (c) => {
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    const canvas = c as HTMLCanvasElement,
      bytes = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ).join(",");
  });
}
async function upload(page: Page) {
  await page.goto("/?mode=editor");
  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.locator(".photo-item")).toHaveCount(5);
}

test("generate, add to a collage, export exact dimensions and recover the result from a local draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const posts = await mockAI(page);
  await page.goto("/?mode=editor");
  await open(page);
  const modal = dialog(page);
  await expect(
    modal.getByRole("button", { name: "Generate image", exact: true }),
  ).toBeDisabled();
  await generate(page);
  expect(posts).toHaveLength(1);
  expect(posts[0].has("image")).toBe(false);
  const downloaded = page.waitForEvent("download");
  await modal.getByRole("link", { name: "Download image" }).click();
  const raw = await fs.readFile((await (await downloaded).path())!);
  expect([raw.readUInt32BE(16), raw.readUInt32BE(20)]).toEqual([1024, 1024]);
  await page.screenshot({ path: "test-results/ai-studio-generated.png" });
  await modal
    .getByRole("button", { name: "Add to photos", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await expect(
    page.getByTestId("draft-status").filter({ visible: true }),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const before = await hash(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1080, 1350,
  ]);
  page.once("dialog", (d) => d.accept());
  await page.reload();
  await page
    .getByRole("dialog", { name: "Pick up where you left off." })
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(1);
  await expect.poll(() => hash(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("photo editing sends a resized reference, compares before/after and preserves the edited frame on Apply", async ({
  page,
}) => {
  const posts = await mockAI(page);
  await upload(page);
  await page.getByRole("button", { name: /^Select photo 2:/ }).click();
  await page.getByLabel("Photo shape", { exact: true }).selectOption("circle");
  await page.getByLabel("Photo width percent").fill("32");
  const frame = await page.getByTestId("photo-selection").getAttribute("style");
  const photoId = await page
    .getByLabel("Selected photo", { exact: true })
    .inputValue();
  const originalHash = await hash(page);
  await page
    .getByRole("button", { name: "Edit photo with AI", exact: true })
    .click();
  await expect(dialog(page).getByLabel("Photo to edit")).toContainText(
    "Photo 2",
  );
  await generate(page, true);
  await dialog(page).getByRole("button", { name: "Close AI Studio" }).focus();
  await dialog(page)
    .getByRole("button", { name: "Close AI Studio" })
    .press("Control+z");
  const ref = posts[0].get("image") as File;
  expect(ref.size).toBeLessThan(1_200_000);
  const dimensions = await page.evaluate(
    async ({ bytes, type }) => {
      const image = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type }),
      );
      const size = [image.width, image.height];
      image.close();
      return size;
    },
    {
      bytes: Array.from(new Uint8Array(await ref.arrayBuffer())),
      type: ref.type,
    },
  );
  expect(Math.max(...dimensions)).toBeLessThan(512);
  await dialog(page)
    .getByRole("button", { name: "Before", exact: true })
    .click();
  await expect(
    dialog(page).getByAltText("Original reference photo"),
  ).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "After", exact: true })
    .click();
  await expect(dialog(page).getByAltText("AI generated result")).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Apply to photo", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(page.getByLabel("Photo shape", { exact: true })).toHaveValue(
    "circle",
  );
  expect(await page.getByTestId("photo-selection").getAttribute("style")).toBe(
    frame,
  );
  await expect.poll(() => hash(page)).not.toBe(originalHash);
  await expect(
    page.getByTestId("draft-status").filter({ visible: true }),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const editedHash = await hash(page);
  const storedType = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("frameforge-drafts", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const asset = await new Promise<{ blob: Blob }>((resolve) => {
      const r = db.transaction("assets").objectStore("assets").get(id);
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return asset.blob.type;
  }, photoId);
  expect(storedType).toBe("image/png");
  page.once("dialog", (d) => d.accept());
  await page.reload();
  await page
    .getByRole("dialog", { name: "Pick up where you left off." })
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect.poll(() => hash(page)).toBe(editedHash);
  await page.getByRole("button", { name: /^Select photo 2:/ }).click();
  await expect(page.getByLabel("Selected photo", { exact: true })).toHaveValue(
    photoId,
  );
  await expect(page.getByLabel("Photo shape", { exact: true })).toHaveValue(
    "circle",
  );
});

test("adding a generated layer keeps template photos intact and that layer can be AI edited", async ({
  page,
}) => {
  await mockAI(page);
  await upload(page);
  await open(page);
  await generate(page);
  await dialog(page)
    .getByRole("button", { name: "Add as a layer", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(
    page.getByLabel("Select added image").locator("option"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Edit photo with AI", exact: true })
    .click();
  expect(
    await dialog(page)
      .getByLabel("Photo to edit")
      .locator("option:checked")
      .textContent(),
  ).toMatch(/Added image 1/);
  await generate(page, true);
  await dialog(page)
    .getByRole("button", { name: "Apply to photo", exact: true })
    .click();
  await expect(page.locator(".photo-item")).toHaveCount(5);
  await expect(
    page.getByLabel("Select added image").locator("option"),
  ).toHaveCount(2);
});

test("errors, cancellation and closing AI Studio leave the original collage untouched", async ({
  page,
}) => {
  let posts = await mockAI(page, {
    error: "Please wait a few seconds before creating another image.",
  });
  await upload(page);
  const before = await hash(page);
  await open(page);
  const modal = dialog(page);
  await modal
    .getByLabel("Your description", { exact: true })
    .fill("Mountain valley");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", { name: "Generate image", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toContainText("Please wait");
  await modal.getByRole("button", { name: "Close AI Studio" }).click();
  expect(await hash(page)).toBe(before);
  await page.unroute("**/api/ai/images");
  posts = await mockAI(page, { delay: 1000 });
  await open(page);
  await modal
    .getByLabel("Your description", { exact: true })
    .fill("Another mountain valley");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", { name: "Generate image", exact: true })
    .click();
  await expect.poll(() => posts.length).toBe(1);
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Generate image", exact: true }),
  ).toBeEnabled();
  await modal.press("Escape");
  await expect(modal).toHaveCount(0);
  expect(await hash(page)).toBe(before);
});

test("a provider safety block is visible with its code and does not silently regenerate or change the collage", async ({
  page,
}) => {
  const posts = await mockAI(page, {
    status: 422,
    providerCode: 3030,
    error:
      "Cloudflare's safety filter flagged the generated image, so it did not return a result. Your collage is unchanged. Try a different description or reference photo. (Cloudflare code 3030)",
  });
  await upload(page);
  const before = await hash(page);
  await open(page);
  const modal = dialog(page);
  await modal
    .getByLabel("Your description", { exact: true })
    .fill("An anime action illustration");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", { name: "Generate image", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toContainText(
    "safety filter flagged the generated image",
  );
  await expect(modal.getByRole("alert")).toContainText("3030");
  await expect(modal.getByAltText("AI generated result")).toHaveCount(0);
  expect(posts).toHaveLength(1);
  await modal.getByRole("button", { name: "Close AI Studio" }).click();
  await expect.poll(() => hash(page)).toBe(before);
  expect(posts).toHaveLength(1);
});

test("a separately uploaded reference is not added until accepted and corrupt AI results are rejected", async ({
  page,
}) => {
  await mockAI(page, { invalid: true });
  await page.goto("/?mode=editor");
  await open(page);
  const modal = dialog(page);
  await modal.getByRole("button", { name: "Edit photo", exact: true }).click();
  await modal
    .getByLabel("AI reference photo", { exact: true })
    .setInputFiles(files[0]);
  await expect(modal.getByAltText("Original reference photo")).toBeVisible();
  await modal
    .getByLabel("What would you like to change?", { exact: true })
    .fill("A warmer sunset");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", { name: "Create edited version", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toContainText("choose a JPG");
  await modal.getByRole("button", { name: "Close AI Studio" }).click();
  await expect(page.locator(".photo-item")).toHaveCount(0);
});

test("unconfigured AI displays setup while normal editing remains usable", async ({
  page,
}) => {
  // Real local route: no provider calls are made in this test.
  await page.goto("/?mode=editor");
  await page.getByRole("button", { name: "AI Studio", exact: true }).click();
  await expect(
    dialog(page).getByText("Connect Cloudflare to start creating", {
      exact: true,
    }),
  ).toBeVisible();
  await dialog(page).getByText("Setup instructions", { exact: true }).click();
  await expect(dialog(page)).toContainText("CLOUDFLARE_ACCOUNT_ID");
  await expect(
    dialog(page).getByRole("button", { name: "Generate image", exact: true }),
  ).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Close AI Studio" }).click();
  await page.getByTestId("photo-input").setInputFiles(files[0]);
  await expect(page.locator(".photo-item")).toHaveCount(1);
});

test("AI Studio fits phones and tablets and result actions remain reachable", async ({
  page,
}) => {
  await mockAI(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  await generate(page);
  for (const [width, height] of [
    [390, 844],
    [320, 640],
    [768, 950],
    [1100, 720],
  ]) {
    await page.setViewportSize({ width, height });
    const modal = dialog(page),
      bounds = (await modal.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect(
      await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await modal
      .getByRole("button", { name: "Add as a layer", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      modal.getByRole("button", { name: "Add as a layer", exact: true }),
    ).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog(page)
    .getByRole("button", { name: "Add to photos", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/ai-studio-mobile.png" });
});

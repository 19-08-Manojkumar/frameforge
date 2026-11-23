import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs/promises";
import { NOTE_CHARMS } from "../../lib/newCreativeCharms";
import { LINE_PRESETS } from "../../lib/lineCatalog";

async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#56798d";
    ctx.fillRect(0, 0, 400, 400);
    return c.toDataURL().split(",")[1];
  });
  await page
    .getByTestId("photo-input")
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(page.locator(".photo-item")).toHaveCount(1);
}
async function library(page: Page, tab: "Creative Charms" | "Lines") {
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Add stickers and emoji",
    exact: true,
  });
  await picker.getByRole("button", { name: new RegExp(`^${tab} `) }).click();
  return picker;
}
async function change(input: Locator, value: string) {
  await input.evaluate((el, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function hash(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (el) => {
    const c = el as HTMLCanvasElement;
    const bytes = c
      .getContext("2d")!
      .getImageData(0, 0, c.width, c.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  });
}
async function exportMatches(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
    1080, 1350,
  ]);
  const error = await page
    .getByTestId("collage-preview")
    .evaluate(async (element, encoded) => {
      const c = element as HTMLCanvasElement,
        image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      const other = document.createElement("canvas");
      other.width = c.width;
      other.height = c.height;
      const ctx = other.getContext("2d")!;
      ctx.drawImage(image, 0, 0, c.width, c.height);
      const a = ctx.getImageData(0, 0, c.width, c.height).data,
        b = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < a.length; i += 4)
        sum +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return sum / ((a.length / 4) * 3);
    }, bytes.toString("base64"));
  expect(error).toBeLessThan(1);
}

test("all ten notes accept readable independent text using Add text", async ({
  page,
}) => {
  await prepare(page);
  for (const [i, note] of NOTE_CHARMS.entries()) {
    const picker = await library(page, "Creative Charms");
    await picker
      .getByLabel("Charm collection")
      .selectOption("Notes & journals");
    await expect(picker.locator(".decoration-grid button")).toHaveCount(10);
    if (i === 0)
      await page.screenshot({ path: "test-results/note-charms-desktop.png" });
    await picker
      .getByRole("button", { name: `Add ${note.name} sticker`, exact: true })
      .click();
    await expect(page.getByLabel("Sticker size", { exact: true })).toHaveValue(
      "46",
    );
    const noteBox = (await page
      .getByTestId("sticker-selection")
      .boundingBox())!;
    await page.getByRole("button", { name: "Add text", exact: true }).click();
    const field = page.getByRole("textbox", {
      name: "Text content",
      exact: true,
    });
    await field.fill("Our weekend");
    await expect(field).toHaveCSS("color", "rgb(53, 62, 55)");
    const box = (await field.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(noteBox.x - 2);
    expect(box.x + box.width).toBeLessThanOrEqual(
      noteBox.x + noteBox.width + 2,
    );
    expect(box.y).toBeGreaterThanOrEqual(noteBox.y - 2);
    expect(box.y + box.height).toBeLessThanOrEqual(
      noteBox.y + noteBox.height + 2,
    );
    expect(
      await field.evaluate((e) => e.scrollHeight - e.clientHeight),
    ).toBeLessThanOrEqual(1);
    await field.press("Escape");
    if (i === 1) {
      await page.screenshot({
        path: "test-results/spring-notebook-caption.png",
      });
      await exportMatches(page);
    }
    await page
      .getByRole("button", { name: "Delete selected text", exact: true })
      .click();
    await page
      .getByLabel("Edit a sticker", { exact: true })
      .selectOption({ index: 1 });
    await page
      .getByRole("button", { name: "Delete sticker", exact: true })
      .click();
  }
});

test("ten paper tears separate photos, resize, rotate, recolor, export, and recover", async ({
  page,
}) => {
  await prepare(page);
  let picker = await library(page, "Lines");
  await picker.getByLabel("Line collection").selectOption("Torn paper");
  await expect(picker.locator(".line-preset-preview")).toHaveCount(10);
  await page.screenshot({
    path: "test-results/torn-paper-dividers-desktop.png",
  });
  const designs = new Set<string>();
  for (const [i, preset] of LINE_PRESETS.filter((p) =>
    p.layer.effect?.startsWith("paper-"),
  ).entries()) {
    if (i > 0) {
      picker = await library(page, "Lines");
      await picker.getByLabel("Line collection").selectOption("Torn paper");
    }
    const before = await hash(page);
    await picker
      .getByRole("button", { name: `Add ${preset.name}`, exact: true })
      .click();
    await expect.poll(() => hash(page)).not.toBe(before);
    designs.add(await hash(page));
    await page
      .getByRole("button", { name: "Delete line", exact: true })
      .click();
    await expect.poll(() => hash(page)).toBe(before);
  }
  expect(designs.size).toBe(10);
  picker = await library(page, "Lines");
  await picker
    .getByRole("button", { name: "Add Spiral page tear", exact: true })
    .click();
  await change(page.getByLabel("Line width", { exact: true }), "55");
  await change(page.getByLabel("Line length", { exact: true }), "70");
  await change(page.getByLabel("Line angle", { exact: true }), "90");
  await change(page.getByLabel("Line color", { exact: true }), "#ead7be");
  await change(
    page.getByLabel("Line accent color", { exact: true }),
    "#6e8579",
  );
  const hit = page.getByRole("button", { name: "Select line 1", exact: true });
  await expect
    .poll(async () => {
      const b = (await hit.boundingBox())!;
      return b.height > b.width * 4;
    })
    .toBe(true);
  await exportMatches(page);
  await page.screenshot({
    path: "test-results/torn-paper-divider-editing.png",
  });
  await expect(
    page.locator('[data-testid="draft-status"]:visible'),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  const saved = await hash(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect.poll(() => hash(page)).toBe(saved);
  await page
    .getByLabel("Select a line", { exact: true })
    .selectOption({ index: 1 });
  await expect(page.getByLabel("Line effect", { exact: true })).toHaveValue(
    "paper-notebook",
  );
  await expect(page.getByLabel("Line angle", { exact: true })).toHaveValue(
    "90",
  );
  await expect(page.getByLabel("Line length", { exact: true })).toHaveValue(
    "70",
  );
});

test.describe("phone notes and paper tears", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("the new collections fit small phones and note text stays editable", async ({
    page,
  }) => {
    await prepare(page);
    let picker = await library(page, "Creative Charms");
    await picker
      .getByLabel("Charm collection")
      .selectOption("Notes & journals");
    await page.screenshot({ path: "test-results/note-charms-mobile.png" });
    await picker
      .getByRole("button", {
        name: "Add Spring notebook page sticker",
        exact: true,
      })
      .tap();
    await page.getByRole("button", { name: "Add text", exact: true }).tap();
    const field = page.getByRole("textbox", {
      name: "Text content",
      exact: true,
    });
    await field.fill("Travel notes");
    await field.press("Escape");
    picker = await library(page, "Lines");
    await picker.getByLabel("Line collection").selectOption("Torn paper");
    await expect(picker.locator(".decoration-grid button")).toHaveCount(10);
    await page.setViewportSize({ width: 320, height: 568 });
    const bounds = (await picker.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(560);
    await page.screenshot({
      path: "test-results/torn-paper-dividers-mobile.png",
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  });
});

import { moveLayer } from "./layerHelpers";
import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { FONT_OPTIONS } from "../../lib/fonts";
import { STICKERS, EMOJIS } from "../../lib/stickers";
import emojiData from "../../lib/emojiCatalog.json";
import { EMOJI_COUNT } from "../../lib/emojiMetadata";
import { LINE_PRESETS } from "../../lib/lineCatalog";
import { CREATIVE_CHARMS } from "../../lib/creativeCharms";

async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  await page
    .getByTestId("photo-input")
    .setInputFiles(path.resolve("public/samples/lake.jpg"));
  await expect(page.locator(".photo-item")).toHaveCount(1);
  const phone = (page.viewportSize()?.width ?? 1440) <= 900;
  if (phone)
    await page
      .getByRole("button", { name: /Export/ })
      .first()
      .click();
  await page.getByLabel("Canvas size", { exact: true }).selectOption("custom");
  await page.getByLabel("Output width", { exact: true }).fill("1280");
  await page.getByLabel("Output height", { exact: true }).fill("1600");
  if (phone) await page.getByRole("button", { name: /Photos/ }).click();
}
async function open(page: Page, emoji = false) {
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Add stickers and emoji",
    exact: true,
  });
  await expect(picker).toBeVisible();
  if (emoji) {
    await picker.getByRole("button", { name: /^Emoji / }).click();
    await picker
      .getByLabel("Emoji category", { exact: true })
      .selectOption("Popular");
  }
  await expect(picker.locator(".decoration-grid button")).toHaveCount(
    emoji ? 50 : 100,
  );
  return picker;
}
async function pixels(page: Page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return page.getByTestId("collage-preview").evaluate((c) => {
    const small = document.createElement("canvas");
    small.width = 128;
    small.height = 160;
    small.getContext("2d")!.drawImage(c as HTMLCanvasElement, 0, 0, 128, 160);
    return small.toDataURL();
  });
}
async function color(input: Locator, value: string) {
  await input.evaluate((el, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function canvasHash(page: Page) {
  return page.getByTestId("collage-preview").evaluate(async (c) => {
    const canvas = c as HTMLCanvasElement;
    const data = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  });
}
async function parity(page: Page, dimensions = [1280, 1600]) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const bytes = await fs.readFile((await (await pending).path())!);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(dimensions);
  const difference = await page
    .getByTestId("collage-preview")
    .evaluate(async (preview, encoded) => {
      const img = new Image();
      img.src = `data:image/png;base64,${encoded}`;
      await img.decode();
      const c = preview as HTMLCanvasElement,
        other = document.createElement("canvas");
      other.width = c.width;
      other.height = c.height;
      const ctx = other.getContext("2d")!;
      ctx.drawImage(img, 0, 0, other.width, other.height);
      const a = ctx.getImageData(0, 0, c.width, c.height).data,
        b = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let difference = 0;
      for (let i = 0; i < a.length; i += 4)
        difference +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return difference / ((a.length / 4) * 3);
    }, bytes.toString("base64"));
  expect(difference).toBeLessThan(1);
}

test("twenty-three font choices include sixteen distinct locally served faces and export correctly", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== "localhost")
      external.push(r.url());
  });
  await prepare(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const editor = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await editor.fill("Adventure memories 2026");
  await editor.press("Escape");
  await expect(
    page.getByLabel("Text font", { exact: true }).locator("option"),
  ).toHaveCount(23);
  const widths = new Set<number>();
  for (const font of FONT_OPTIONS.slice(7)) {
    await page
      .getByLabel("Text font", { exact: true })
      .selectOption(font.family);
    const result = await page.evaluate(async (family) => {
      await document.fonts.load(
        `400 32px ${family}`,
        "Adventure memories 2026",
      );
      const c = document.createElement("canvas").getContext("2d")!;
      c.font = `32px ${family}`;
      return {
        loaded: document.fonts.check(`400 32px ${family}`),
        width: c.measureText("Adventure memories 2026").width,
      };
    }, font.family);
    expect(result.loaded).toBe(true);
    widths.add(result.width);
  }
  expect(widths.size).toBe(16);
  await parity(page);
  expect(external).toEqual([]);
  await page.screenshot({ path: "test-results/fonts-desktop.png" });
});

test("all one hundred sixty vector stickers render distinctly and support editing and export", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await prepare(page);
  const designs = new Set<string>();
  const firstPicker = await open(page);
  await page.keyboard.press("Escape");
  await expect(firstPicker).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stickers & emoji", exact: true }),
  ).toBeFocused();
  for (const sticker of STICKERS) {
    const picker = await open(page);
    if (sticker.category === "Creative Charms")
      await picker.getByRole("button", { name: /^Creative Charms / }).click();
    await picker
      .getByRole("button", { name: `Add ${sticker.name} sticker`, exact: true })
      .click();
    designs.add(await pixels(page));
    await page
      .getByRole("button", { name: "Delete sticker", exact: true })
      .click();
  }
  expect(designs.size).toBe(160);
  await (
    await open(page)
  )
    .getByRole("button", { name: "Add Heart sticker", exact: true })
    .click();
  await color(page.getByLabel("Sticker color", { exact: true }), "#14aa77");
  await color(
    page.getByLabel("Sticker accent color", { exact: true }),
    "#ffeeaa",
  );
  await expect
    .poll(() =>
      page.getByTestId("collage-preview").evaluate((el) => {
        const c = el as HTMLCanvasElement;
        return Array.from(
          c.getContext("2d")!.getImageData(c.width / 2, c.height / 2, 1, 1)
            .data,
        ).slice(0, 3);
      }),
    )
    .toEqual([20, 170, 119]);
  const selected = page.getByTestId("sticker-selection");
  const before = await selected.getAttribute("style");
  const box = (await selected.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 25,
    box.y + box.height / 2 + 15,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(selected).not.toHaveAttribute("style", before!);
  await page
    .getByRole("button", { name: "Resize sticker", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Sticker size", { exact: true })).toHaveValue(
    "19",
  );
  await page
    .getByRole("button", { name: "Rotate sticker right", exact: true })
    .click();
  await expect(selected).toHaveCSS("transform", /matrix/);
  expect(await selected.getAttribute("style")).toContain("rotate(15deg)");
  await page
    .getByRole("button", { name: "Flip sticker horizontally", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Flip sticker horizontally",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Sticker opacity", { exact: true }).focus();
  await page.getByLabel("Sticker opacity", { exact: true }).press("ArrowLeft");
  await expect(page.getByLabel("Sticker opacity", { exact: true })).toHaveValue(
    "99",
  );
  await page
    .getByRole("button", { name: "Duplicate sticker", exact: true })
    .click();
  await expect(
    page.getByLabel("Selected sticker", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await moveLayer(page, "sticker", "bottom");
  await moveLayer(page, "sticker", "top");
  await parity(page);
  await page.screenshot({ path: "test-results/stickers-desktop.png" });
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const editor = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });

  await editor.fill("Text above a sticker");
  await editor.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Edit text: Text above a sticker",
      exact: true,
    }),
  ).toHaveCount(1);
});

test("line presets can be styled and stepped backward and forward", async ({
  page,
}) => {
  await prepare(page);
  const picker = await open(page);
  await picker.getByRole("button", { name: /^Lines / }).click();
  await expect(picker.locator(".decoration-grid button")).toHaveCount(
    LINE_PRESETS.length,
  );
  await picker.getByRole("button", { name: "Add Prismatic facets" }).click();
  await expect(
    page.getByRole("toolbar", { name: "Selected line controls" }),
  ).toBeVisible();
  await page.getByLabel("Line effect").selectOption("classic");
  await page.getByLabel("Line style").selectOption("wavy");
  await page.getByLabel("Line curve").focus();
  await page.getByLabel("Line curve").press("End");
  for (let step = 0; step < 12; step++)
    await page.getByLabel("Line curve").press("ArrowLeft");
  await color(page.getByLabel("Line color"), "#c33661");
  await expect(page.locator(".line-overlay path")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".line-overlay path")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".line-overlay path")).toHaveCount(3);
});

test("Creative Charms contains sixty designs that can be added as stickers", async ({
  page,
}) => {
  await prepare(page);
  const picker = await open(page);
  await picker.getByRole("button", { name: /^Creative Charms / }).click();
  await expect(picker.locator(".decoration-grid button")).toHaveCount(
    CREATIVE_CHARMS.length,
  );
  await page.screenshot({ path: "test-results/creative-charms-desktop.png" });
  await picker.getByLabel("Search charms", { exact: true }).fill("Silk ribbon");
  await expect(picker.locator(".decoration-grid button")).toHaveCount(1);
  await expect(
    picker.getByRole("button", {
      name: "Add Silk ribbon bow sticker",
      exact: true,
    }),
  ).toBeVisible();
  await picker.getByLabel("Search charms", { exact: true }).fill("");
  await picker
    .getByRole("button", { name: "Add Disco cherries sticker" })
    .click();
  await expect(
    page.getByLabel("Selected sticker").locator("option").last(),
  ).toHaveText(/Disco cherries/);
  await expect(
    page.getByRole("button", { name: "Delete sticker" }),
  ).toBeVisible();
  const before = await pixels(page);
  await color(page.getByLabel("Sticker color", { exact: true }), "#9556c9");
  await color(
    page.getByLabel("Sticker accent color", { exact: true }),
    "#edca4f",
  );
  await expect.poll(() => pixels(page)).not.toBe(before);
  await parity(page);
});

test("forty decorative effects have distinct live artwork, editable colors, and matching exports", async ({
  page,
}) => {
  await prepare(page);
  let picker = await open(page);
  await picker.getByRole("button", { name: /^Lines / }).click();
  await expect(picker.locator(".line-preset-preview")).toHaveCount(
    LINE_PRESETS.length,
  );
  const previews = await picker
    .locator(".line-preset-preview")
    .evaluateAll((items) =>
      items.map((item) => {
        const c = item as HTMLCanvasElement;
        const data = c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height).data;
        return {
          pixels: c.toDataURL(),
          ink: Array.from(data).filter((n, i) => i % 4 === 3 && n > 0).length,
        };
      }),
    );
  expect(new Set(previews.map((p) => p.pixels)).size).toBe(LINE_PRESETS.length);
  expect(previews.every((p) => p.ink > 150)).toBe(true);
  await page.screenshot({ path: "test-results/decorative-lines-desktop.png" });
  await picker.getByLabel("Search lines").fill("leaf");
  await expect(picker.locator(".decoration-grid button")).toHaveCount(11);
  await picker.getByLabel("Search lines").fill("");
  const designs = new Set<string>();
  for (const [index, preset] of LINE_PRESETS.entries()) {
    if (index > 0) {
      picker = await open(page);
      await picker.getByRole("button", { name: /^Lines / }).click();
    }
    await picker
      .getByRole("button", { name: `Add ${preset.name}`, exact: true })
      .click();
    await expect(page.getByLabel("Line effect", { exact: true })).toHaveValue(
      preset.layer.effect!,
    );
    designs.add(await pixels(page));
    if (["neon", "gold-glitter", "fern"].includes(preset.layer.effect!))
      await parity(page);
    if (preset.layer.effect === "neon") {
      await page.getByLabel("Output width", { exact: true }).fill("1920");
      await page.getByLabel("Output height", { exact: true }).fill("2400");
      await parity(page, [1920, 2400]);
      await page.getByLabel("Output width", { exact: true }).fill("1280");
      await page.getByLabel("Output height", { exact: true }).fill("1600");
    }
    await page
      .getByRole("button", { name: "Delete line", exact: true })
      .click();
  }
  expect(designs.size).toBe(LINE_PRESETS.length);
  picker = await open(page);
  await picker.getByRole("button", { name: /^Lines / }).click();
  await picker
    .getByRole("button", { name: "Add Golden glitter dust", exact: true })
    .click();
  const before = await pixels(page);
  await color(page.getByLabel("Line color", { exact: true }), "#be49cf");
  await color(page.getByLabel("Line accent color", { exact: true }), "#46b7ca");
  await page.getByLabel("Line width", { exact: true }).press("End");
  await page.getByLabel("Line curve", { exact: true }).press("ArrowRight");
  await color(page.getByLabel("Line opacity", { exact: true }), "76");
  await expect.poll(() => pixels(page)).not.toBe(before);
  const hit = page.getByRole("button", { name: "Select line 1", exact: true });
  const originalPath = await hit.getAttribute("d");
  const box = (await hit.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 24,
    box.y + box.height / 2 + 15,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(hit).not.toHaveAttribute("d", originalPath!);
  await parity(page);
  const savedPixels = await canvasHash(page);
  await expect(
    page.locator('[data-testid="draft-status"]:visible'),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  await page.reload();
  await page
    .getByRole("dialog", { name: "Pick up where you left off.", exact: true })
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect.poll(() => canvasHash(page)).toBe(savedPixels);
  await page
    .getByLabel("Select a line", { exact: true })
    .selectOption({ index: 1 });
  await expect(page.getByLabel("Line effect", { exact: true })).toHaveValue(
    "gold-glitter",
  );
  await expect(page.getByLabel("Line color", { exact: true })).toHaveValue(
    "#be49cf",
  );
  await expect(
    page.getByLabel("Line accent color", { exact: true }),
  ).toHaveValue("#46b7ca");
  await expect(page.getByLabel("Line opacity", { exact: true })).toHaveValue(
    "76",
  );
  await page.screenshot({ path: "test-results/decorative-line-editing.png" });
});

test("fifty native emojis export and sticker edits persist per theme and reset with Start over", async ({
  page,
}) => {
  await prepare(page);
  const designs = new Set<string>();
  for (const [emoji, name] of EMOJIS) {
    const picker = await open(page, true);
    const officialName = emojiData.find((e) => e.emoji === emoji)!.name;
    await picker
      .getByRole("button", { name: `Add ${officialName} emoji`, exact: true })
      .click();
    designs.add(await pixels(page));
    await expect(page.getByLabel("Sticker color", { exact: true })).toHaveCount(
      0,
    );
    if (emoji !== EMOJIS.at(-1)![0])
      await page
        .getByRole("button", { name: "Delete sticker", exact: true })
        .click();
  }
  expect(designs.size).toBe(50);
  await parity(page);
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Sea Breeze", exact: true })
    .click();
  await expect(page.locator(".sticker-overlay-item")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select Scenic Fan", exact: true })
    .click();
  await expect(page.locator(".sticker-overlay-item")).toHaveCount(1);
  const id = await page
    .getByLabel("Edit a sticker", { exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await page.getByLabel("Edit a sticker", { exact: true }).selectOption(id!);
  await expect(page.getByTestId("sticker-selection")).toBeVisible();
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new collage", exact: true })
    .click();
  await expect(page.locator(".sticker-overlay-item")).toHaveCount(0);
});

test("search and separate categories find all emoji and the twenty-five dotted Trip routes", async ({
  page,
}) => {
  await prepare(page);
  const picker = await open(page);
  await picker
    .getByLabel("Sticker category", { exact: true })
    .selectOption("Trip routes");
  await expect(picker.locator(".decoration-grid button")).toHaveCount(25);
  await page.screenshot({
    path: "test-results/trip-route-library-desktop.png",
  });
  await picker
    .getByLabel("Search stickers", { exact: true })
    .fill("mountain-trail");
  await expect(
    picker.getByRole("button", {
      name: "Add Mountain trail map sticker",
      exact: true,
    }),
  ).toBeVisible();
  await picker.getByLabel("Search stickers", { exact: true }).fill("coffee");
  await expect(
    picker.getByText("No matches. Try another word or category."),
  ).toBeVisible();
  await picker
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(picker.locator(".decoration-grid button")).toHaveCount(100);
  await picker
    .getByLabel("Sticker category", { exact: true })
    .selectOption("Food & drink");
  await picker.getByLabel("Search stickers", { exact: true }).fill("coffee");
  await expect(picker.locator(".decoration-grid button")).toHaveCount(1);
  await picker.getByRole("button", { name: /^Emoji / }).click();
  await expect(picker.locator(".decoration-grid button")).toHaveCount(120);
  await expect(picker.getByRole("status")).toContainText(
    EMOJI_COUNT.toLocaleString(),
  );
  await picker.locator(".decoration-results").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect
    .poll(() => picker.locator(".decoration-grid button").count())
    .toBeGreaterThan(120);
  expect(await picker.locator(".decoration-grid button").count()).toBeLessThan(
    EMOJI_COUNT,
  );
  await picker
    .getByLabel("Emoji category", { exact: true })
    .selectOption("Flags");
  await picker.getByLabel("Search emoji", { exact: true }).fill("flag india");
  await expect(
    picker.getByRole("button", { name: "Add flag: India emoji", exact: true }),
  ).toBeVisible();
  await picker
    .getByLabel("Search emoji", { exact: true })
    .fill("flag zimbabwe");
  await expect(
    picker.getByRole("button", {
      name: "Add flag: Zimbabwe emoji",
      exact: true,
    }),
  ).toBeVisible();
  await picker
    .getByLabel("Emoji category", { exact: true })
    .selectOption("Animals & Nature");
  await picker.getByLabel("Search emoji", { exact: true }).fill("🦋");
  await expect(
    picker.getByRole("button", { name: "Add butterfly emoji", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/emoji-search-desktop.png" });
  await picker
    .getByRole("button", { name: "Stickers 100", exact: true })
    .click();
  await expect(
    picker.getByLabel("Search stickers", { exact: true }),
  ).toHaveValue("coffee");
  await expect(
    picker.getByLabel("Sticker category", { exact: true }),
  ).toHaveValue("Food & drink");
  await picker.getByLabel("Search stickers", { exact: true }).fill("");
  await picker
    .getByLabel("Sticker category", { exact: true })
    .selectOption("Trip routes");
  await picker
    .getByRole("button", {
      name: "Add Mountain trail map sticker",
      exact: true,
    })
    .click();
  await color(page.getByLabel("Sticker color", { exact: true }), "#255c4d");
  await color(
    page.getByLabel("Sticker accent color", { exact: true }),
    "#f3d8a2",
  );
  await page.getByLabel("Sticker size", { exact: true }).focus();
  await page.getByLabel("Sticker size", { exact: true }).press("End");
  await parity(page);
  await page.screenshot({
    path: "test-results/trip-route-editing-desktop.png",
  });
});

test.describe("touch stickers", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("decorative branches and Creative Charms have readable galleries on phones", async ({
    page,
  }) => {
    await prepare(page);
    let picker = await open(page);
    await picker.getByRole("button", { name: /^Lines / }).tap();
    await expect(picker.locator(".line-preset-preview")).toHaveCount(
      LINE_PRESETS.length,
    );
    await page.screenshot({ path: "test-results/decorative-lines-mobile.png" });
    const lineBounds = (await picker
      .locator(".line-preset-preview")
      .first()
      .boundingBox())!;
    expect(lineBounds.width).toBeGreaterThan(120);
    await picker.getByLabel("Search lines").fill("sakura");
    await picker
      .getByRole("button", { name: "Add Sakura blossom branch", exact: true })
      .tap();
    await expect(page.getByLabel("Line effect", { exact: true })).toHaveValue(
      "sakura",
    );
    picker = await open(page);
    await picker.getByRole("button", { name: /^Creative Charms / }).tap();
    await expect(picker.locator(".decoration-grid button")).toHaveCount(
      CREATIVE_CHARMS.length,
    );
    await page.screenshot({ path: "test-results/creative-charms-mobile.png" });
    await page.setViewportSize({ width: 320, height: 568 });
    const bounds = (await picker.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(560);
    await picker.getByLabel("Search charms").fill("crystal");
    await picker
      .getByRole("button", { name: "Add Crystal cluster sticker", exact: true })
      .tap();
    await expect(page.getByTestId("sticker-selection")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  });
  test("searchable categories and one hundred choices fit on a phone and support touch", async ({
    page,
  }) => {
    await prepare(page);
    const picker = await open(page);
    const bounds = (await picker.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844 - 8);
    await expect(
      picker.locator(".decoration-library-heading"),
    ).toBeInViewport();
    await expect(picker.locator(":scope > p").first()).toBeInViewport();
    await page.setViewportSize({ width: 320, height: 568 });
    const smallBounds = (await picker.boundingBox())!;
    expect(smallBounds.x).toBeGreaterThanOrEqual(0);
    expect(smallBounds.x + smallBounds.width).toBeLessThanOrEqual(320);
    expect(smallBounds.y + smallBounds.height).toBeLessThanOrEqual(568 - 8);
    await expect(
      picker.getByLabel("Search stickers", { exact: true }),
    ).toBeInViewport();
    await expect(picker.locator(":scope > p").first()).toBeInViewport();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/sticker-picker-mobile.png" });
    const last = picker.getByRole("button", {
      name: "Add Peace hand sticker",
      exact: true,
    });
    await last.scrollIntoViewIfNeeded();
    await expect(
      picker.getByRole("button", { name: /^Emoji / }),
    ).toBeInViewport();
    expect(
      await picker
        .locator(".decoration-results")
        .evaluate((el) => el.scrollTop),
    ).toBeGreaterThan(0);
    await page.screenshot({
      path: "test-results/sticker-picker-more-mobile.png",
    });
    await picker.getByRole("button", { name: /^Emoji / }).tap();
    expect(
      await picker
        .locator(".decoration-results")
        .evaluate((el) => el.scrollTop),
    ).toBe(0);
    await picker
      .getByLabel("Emoji category", { exact: true })
      .selectOption("Animals & Nature");
    await picker.getByLabel("Search emoji", { exact: true }).fill("butterfly");
    const lastEmoji = picker.getByRole("button", {
      name: "Add butterfly emoji",
      exact: true,
    });
    await lastEmoji.scrollIntoViewIfNeeded();
    await expect(lastEmoji).toBeInViewport();
    await picker
      .getByRole("button", { name: "Stickers 100", exact: true })
      .tap();
    expect(
      await picker
        .locator(".decoration-results")
        .evaluate((el) => el.scrollTop),
    ).toBe(0);
    await last.scrollIntoViewIfNeeded();
    await last.tap();
    const selected = page.getByTestId("sticker-selection"),
      original = await selected.getAttribute("style");
    const box = (await selected.boundingBox())!;
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
    await expect(selected).not.toHaveAttribute("style", original!);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await page.screenshot({ path: "test-results/stickers-mobile.png" });
  });
});

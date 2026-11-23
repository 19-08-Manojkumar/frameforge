import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs/promises";
import { STICKERS } from "../../lib/stickers";
import { NOTE_CHARMS } from "../../lib/newCreativeCharms";
import { STICKER_STYLES } from "../../lib/stickerStyles";

async function prepare(page: Page) {
  await page.goto("/?mode=editor");
  const solid = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#345c70";
    ctx.fillRect(0, 0, 400, 400);
    return canvas.toDataURL().split(",")[1];
  });
  await page.getByTestId("photo-input").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(solid, "base64"),
  });
  await expect(page.locator(".photo-item")).toHaveCount(1);
}
async function library(
  page: Page,
  collection: "Stickers" | "Creative Charms" = "Stickers",
) {
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Add stickers and emoji",
    exact: true,
  });
  await picker
    .getByRole("button", { name: new RegExp(`^${collection} `) })
    .click();
  return picker;
}
async function hash(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return page.getByTestId("collage-preview").evaluate(async (element) => {
    const c = element as HTMLCanvasElement;
    const pixels = c
      .getContext("2d")!
      .getImageData(0, 0, c.width, c.height).data;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", pixels)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
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
async function exportMatches(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download collage", exact: true })
    .click();
  const file = await fs.readFile((await (await pending).path())!);
  expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([1080, 1350]);
  const difference = await page
    .getByTestId("collage-preview")
    .evaluate(async (element, bytes) => {
      const source = element as HTMLCanvasElement;
      const image = new Image();
      image.src = `data:image/png;base64,${bytes}`;
      await image.decode();
      const other = document.createElement("canvas");
      other.width = source.width;
      other.height = source.height;
      const ctx = other.getContext("2d")!;
      ctx.drawImage(image, 0, 0, other.width, other.height);
      const a = ctx.getImageData(0, 0, other.width, other.height).data;
      const b = source
        .getContext("2d")!
        .getImageData(0, 0, source.width, source.height).data;
      let total = 0;
      for (let i = 0; i < a.length; i += 4)
        total +=
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
      return total / ((a.length / 4) * 3);
    }, file.toString("base64"));
  expect(difference).toBeLessThan(1);
}

test("every one of 160 stickers and charms has four distinct rendered styles, with Classic preserving original artwork", async ({
  page,
}) => {
  await prepare(page);
  const picker = await library(page);
  const byItem = new Map<string, Set<number>>();
  const comparison: Record<string, Record<string, string>> = {};
  const examples = [
    "heart",
    "palm",
    "camera",
    "mountain-trail",
    NOTE_CHARMS[0].id,
    NOTE_CHARMS[2].id,
  ];
  for (const collection of ["Stickers", "Creative Charms"] as const) {
    await picker
      .getByRole("button", { name: new RegExp(`^${collection} `) })
      .click();
    const definitions = STICKERS.filter(
      (item) =>
        (item.category === "Creative Charms") ===
        (collection === "Creative Charms"),
    );
    for (const style of STICKER_STYLES) {
      await picker
        .getByRole("group", { name: "Sticker collection style", exact: true })
        .getByRole("button", { name: style.name, exact: true })
        .click();
      await expect(
        picker.locator(
          `.decoration-grid canvas[data-sticker-style="${style.id}"]`,
        ),
      ).toHaveCount(definitions.length);
      await expect
        .poll(() =>
          picker.locator(".decoration-grid .sticker-art-preview").evaluateAll(
            (elements) =>
              elements.filter((element) => {
                const c = element as HTMLCanvasElement;
                return c
                  .getContext("2d")!
                  .getImageData(0, 0, c.width, c.height)
                  .data.some((n, i) => i % 4 === 3 && n > 0);
              }).length,
          ),
        )
        .toBe(definitions.length);
      const art = await picker
        .locator(".decoration-grid .sticker-art-preview")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const c = element as HTMLCanvasElement;
            const data = c
              .getContext("2d")!
              .getImageData(0, 0, c.width, c.height).data;
            let hash = 2166136261;
            for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
            return { id: c.dataset.stickerKind!, hash: hash >>> 0 };
          }),
        );
      for (const item of art) {
        if (!byItem.has(item.id)) byItem.set(item.id, new Set());
        byItem.get(item.id)!.add(item.hash);
      }
      for (const id of examples.filter((id) =>
        definitions.some((item) => item.id === id),
      )) {
        comparison[id] ??= {};
        comparison[id][style.id] = await picker
          .locator(`.decoration-grid canvas[data-sticker-kind="${id}"]`)
          .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
      }
      if (style.id === "classic") {
        const mismatches = await picker.evaluate(
          (root, definitions) =>
            definitions
              .map((definition) => {
                const actual = root.querySelector<HTMLCanvasElement>(
                  `.decoration-grid canvas[data-sticker-kind="${definition.id}"]`,
                )!;
                const original = document.createElement("canvas");
                original.width = original.height = 112;
                const ctx = original.getContext("2d")!;
                ctx.scale(4, 4);
                ctx.translate(2, 2);
                ctx.lineJoin = "round";
                ctx.lineCap = "round";
                if (definition.defaultOutline ?? true)
                  for (const path of definition.paths) {
                    ctx.setLineDash(path.dash ?? []);
                    ctx.strokeStyle = "#fffdf7";
                    ctx.lineWidth = (path.width ?? 0) + 2;
                    ctx.stroke(new Path2D(path.d));
                  }
                for (const path of definition.paths) {
                  ctx.globalAlpha = path.opacity ?? 1;
                  ctx.setLineDash(path.dash ?? []);
                  const shape = new Path2D(path.d);
                  if (path.fill) {
                    ctx.fillStyle =
                      path.fill === "primary"
                        ? definition.color
                        : definition.secondary;
                    ctx.fill(shape);
                  }
                  if (path.stroke) {
                    ctx.strokeStyle =
                      path.stroke === "primary"
                        ? definition.color
                        : definition.secondary;
                    ctx.lineWidth = path.width ?? 1;
                    ctx.stroke(shape);
                  }
                }
                const a = ctx.getImageData(0, 0, 112, 112).data,
                  b = actual
                    .getContext("2d")!
                    .getImageData(0, 0, 112, 112).data;
                // Compare visible colors; transparent-edge RGB can be rounded
                // when a cached bitmap is written back to another canvas.
                let colorError = 0,
                  alphaError = 0;
                for (let i = 0; i < a.length; i += 4) {
                  const aa = a[i + 3] / 255,
                    ab = b[i + 3] / 255;
                  alphaError += Math.abs(a[i + 3] - b[i + 3]);
                  for (let channel = 0; channel < 3; channel++)
                    colorError += Math.abs(
                      a[i + channel] * aa +
                        255 * (1 - aa) -
                        b[i + channel] * ab -
                        255 * (1 - ab),
                    );
                }
                return {
                  id: definition.id,
                  colorError: colorError / (112 * 112 * 3),
                  alphaError: alphaError / (112 * 112),
                };
              })
              .filter(
                (error) => error.colorError > 0.1 || error.alphaError > 0.05,
              ),
          definitions,
        );
        expect(mismatches).toEqual([]);
      }
    }
  }
  expect(byItem.size).toBe(160);
  for (const [id, styles] of byItem)
    expect(styles.size, `${id} should look different in each style`).toBe(4);
  const sheet = await page.evaluate(
    async ({ comparison, examples, styles }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1160;
      canvas.height = 1140;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f4f8f9";
      ctx.fillRect(0, 0, 1160, 1140);
      ctx.fillStyle = "#234b58";
      ctx.font = "600 28px Segoe UI";
      ctx.fillText("One collection. Four different looks.", 32, 46);
      ctx.fillStyle = "#68848c";
      ctx.font = "14px Segoe UI";
      ctx.fillText(
        "Every sticker and Creative Charm can be restyled independently.",
        32,
        73,
      );
      for (const [column, style] of styles.entries()) {
        ctx.fillStyle = "#285e64";
        ctx.font = "600 17px Segoe UI";
        ctx.fillText(style.name, 197 + column * 235, 121);
      }
      for (const [row, item] of examples.entries()) {
        const y = 143 + row * 160;
        ctx.fillStyle = "#5b7984";
        ctx.font = "600 12px Segoe UI";
        const words = item.name.split(" ");
        let line = "",
          offset = 0;
        for (const word of words) {
          const next = line ? line + " " + word : word;
          if (ctx.measureText(next).width > 118) {
            ctx.fillText(line, 24, y + 62 + offset);
            line = word;
            offset += 18;
          } else line = next;
        }
        ctx.fillText(line, 24, y + 62 + offset);
        for (const [column, style] of styles.entries()) {
          const x = 159 + column * 235;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(x, y, 218, 148, 12);
          ctx.fill();
          ctx.strokeStyle = "#deeaed";
          ctx.lineWidth = 1;
          ctx.stroke();
          const image = new Image();
          image.src = comparison[item.id][style.id];
          await image.decode();
          ctx.drawImage(image, x + 53, y + 16, 112, 112);
        }
      }
      return canvas.toDataURL().split(",")[1];
    },
    {
      comparison,
      examples: examples.map((id) => ({
        id,
        name: STICKERS.find((item) => item.id === id)!.name,
      })),
      styles: STICKER_STYLES.map(({ id, name }) => ({ id, name })),
    },
  );
  await fs.writeFile(
    "test-results/sticker-style-comparison.png",
    Buffer.from(sheet, "base64"),
  );
  await page.screenshot({
    path: "test-results/sticker-styles-charms-gallery.png",
  });
});

for (const subject of [STICKERS[0], NOTE_CHARMS[2]]) {
  test(`${subject.name}: switching styles keeps geometry and custom editing and exports matching artwork`, async ({
    page,
  }) => {
    await prepare(page);
    const picker = await library(
      page,
      subject.category === "Creative Charms" ? "Creative Charms" : "Stickers",
    );
    await picker
      .getByRole("group", { name: "Sticker collection style", exact: true })
      .getByRole("button", { name: "Anime Pop", exact: true })
      .click();
    await picker
      .getByRole("button", { name: `Add ${subject.name} sticker`, exact: true })
      .click();
    const styles = page.getByRole("group", {
      name: "Sticker style",
      exact: true,
    });
    await expect(
      styles.getByRole("button", { name: "Anime Pop", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await color(page.getByLabel("Sticker color", { exact: true }), "#d43776");
    await color(
      page.getByLabel("Sticker accent color", { exact: true }),
      "#f8d875",
    );
    const before = (await page.getByTestId("sticker-selection").boundingBox())!;
    const output = new Set<string>();
    for (const style of STICKER_STYLES) {
      await styles
        .getByRole("button", { name: style.name, exact: true })
        .click();
      const box = (await page.getByTestId("sticker-selection").boundingBox())!;
      expect(box).toEqual(before);
      await expect(
        page.getByLabel("Sticker color", { exact: true }),
      ).toHaveValue("#d43776");
      output.add(await hash(page));
      await exportMatches(page);
    }
    expect(output.size).toBe(4);
    await page.screenshot({
      path: `test-results/sticker-styles-${subject.id}.png`,
    });
  });
}

test("styles are independent, duplicate and recover with drafts, and styled note text stays editable", async ({
  page,
}) => {
  await prepare(page);
  let picker = await library(page);
  await picker
    .getByRole("button", { name: "Add Heart sticker", exact: true })
    .click();
  const styles = page.getByRole("group", {
    name: "Sticker style",
    exact: true,
  });
  await styles
    .getByRole("button", { name: "Trend Studio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Duplicate sticker", exact: true })
    .click();
  await expect(
    styles.getByRole("button", { name: "Trend Studio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Selected sticker", { exact: true })
    .selectOption({ index: 0 });
  await styles.getByRole("button", { name: "Anime Pop", exact: true }).click();
  await page
    .getByLabel("Selected sticker", { exact: true })
    .selectOption({ index: 1 });
  await expect(
    styles.getByRole("button", { name: "Trend Studio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  picker = await library(page, "Creative Charms");
  await picker
    .getByRole("group", { name: "Sticker collection style", exact: true })
    .getByRole("button", { name: "Vintage Paper", exact: true })
    .click();
  await picker
    .getByRole("button", {
      name: `Add ${NOTE_CHARMS[0].name} sticker`,
      exact: true,
    })
    .click();
  await expect(
    styles.getByRole("button", { name: "Vintage Paper", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const text = page.getByRole("textbox", { name: "Text content", exact: true });
  await text.fill("A little adventure.");
  await text.press("Escape");
  const expected = await hash(page);
  await expect(
    page.locator('[data-testid="draft-status"]:visible'),
  ).toContainText("Draft saved on this device", { timeout: 20000 });
  await page.reload();
  await page
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect.poll(() => hash(page)).toBe(expected);
  const ids = await page
    .getByLabel("Edit a sticker", { exact: true })
    .locator("option")
    .evaluateAll((options) =>
      options.slice(1).map((option) => (option as HTMLOptionElement).value),
    );
  for (const [index, name] of [
    "Anime Pop",
    "Trend Studio",
    "Vintage Paper",
  ].entries()) {
    await page
      .getByLabel("Edit a sticker", { exact: true })
      .selectOption(ids[index]);
    await expect(
      page
        .getByRole("group", { name: "Sticker style", exact: true })
        .getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});

test.describe("phone sticker styles", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("the four styles and scrollable galleries fit narrow phones", async ({
    page,
  }) => {
    await prepare(page);
    const picker = await library(page, "Creative Charms");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      const group = picker.getByRole("group", {
        name: "Sticker collection style",
        exact: true,
      });
      for (const style of STICKER_STYLES) {
        await group
          .getByRole("button", { name: style.name, exact: true })
          .tap();
        await expect(
          group.getByRole("button", { name: style.name, exact: true }),
        ).toBeInViewport();
      }
      const bounds = (await picker.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        page.viewportSize()!.height,
      );
      expect(
        await picker
          .locator(".decoration-results")
          .evaluate((el) => el.clientHeight),
      ).toBeGreaterThan(50);
    }
    await page.screenshot({ path: "test-results/sticker-styles-phone.png" });
    await picker
      .getByRole("button", {
        name: `Add ${NOTE_CHARMS[0].name} sticker`,
        exact: true,
      })
      .tap();
    const styles = page.getByRole("group", {
      name: "Sticker style",
      exact: true,
    });
    await styles.getByRole("button", { name: "Anime Pop", exact: true }).tap();
    await expect(
      styles.getByRole("button", { name: "Anime Pop", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  });
});

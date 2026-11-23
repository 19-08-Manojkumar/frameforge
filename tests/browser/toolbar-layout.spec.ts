import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const photo = path.resolve("public/samples/lake.jpg");

async function containedControls(page: Page) {
  await expect
    .poll(() =>
      page.locator(".center-panel").evaluate((center) => {
        const bounds = center.getBoundingClientRect();
        const failures: string[] = [];
        for (const group of center.querySelectorAll<HTMLElement>(
          ".preview-tools, .decoration-tools, .toolbar-select, .preview-editing-tools, .photo-controls, .sticker-controls, .text-style-toolbar",
        )) {
          if (group.clientWidth && group.scrollWidth > group.clientWidth + 1)
            failures.push(`${group.className} has horizontal overflow`);
        }
        for (const control of center.querySelectorAll<HTMLElement>(
          ".preview-tools button, .preview-tools select, .preview-editing-tools button, .preview-editing-tools select, .preview-editing-tools input:not([type=file])",
        )) {
          const rect = control.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
            failures.push(
              `${control.getAttribute("aria-label") || control.textContent} leaves center panel`,
            );
        }
        return failures;
      }),
    )
    .toEqual([]);
}

async function picker(page: Page, collection: "Stickers" | "Lines") {
  await page
    .getByRole("button", { name: "Stickers & emoji", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add stickers and emoji",
    exact: true,
  });
  await expect(dialog).toBeInViewport();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await dialog
    .getByRole("button", { name: new RegExp(`^${collection} `) })
    .click();
  return dialog;
}

for (const scenario of [
  { name: "portrait dock", width: 1366, height: 768, preset: "story" },
  { name: "narrow portrait dock", width: 1100, height: 900, preset: "story" },
  { name: "landscape toolbar", width: 1280, height: 720, preset: "landscape" },
  { name: "phone toolbar", width: 390, height: 844, preset: "story" },
]) {
  test(`${scenario.name}: lines, layer menus, and editing controls stay accessible`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    await page.goto("/?mode=editor");
    await page.getByTestId("photo-input").setInputFiles(photo);
    await expect(page.locator(".photo-item")).toHaveCount(1);
    if (scenario.width <= 900)
      await page
        .getByRole("button", { name: /Export/ })
        .first()
        .click();
    await page
      .getByLabel("Canvas size", { exact: true })
      .selectOption(scenario.preset);
    if (scenario.width <= 900)
      await page
        .getByRole("button", { name: /Photos/ })
        .first()
        .click();

    let dialog = await picker(page, "Stickers");
    await dialog.locator(".decoration-grid button").first().click();
    dialog = await picker(page, "Lines");
    await dialog.locator(".decoration-grid button").first().click();
    await expect(
      page.getByLabel("Select a line", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Edit a sticker", { exact: true }),
    ).toBeVisible();
    await containedControls(page);
    await page
      .getByLabel("Select a line", { exact: true })
      .selectOption({ index: 1 });
    await expect(
      page.getByRole("toolbar", {
        name: "Selected line controls",
        exact: true,
      }),
    ).toBeVisible();
    await containedControls(page);
    if (scenario.name === "portrait dock")
      await page.screenshot({ path: "test-results/toolbar-lines-fixed.png" });

    await page
      .getByLabel("Edit a sticker", { exact: true })
      .selectOption({ index: 1 });
    await page
      .getByRole("button", { name: "Cycle sticker layer", exact: true })
      .click();
    await containedControls(page);

    await page
      .getByLabel("Add independent image files", { exact: true })
      .setInputFiles(photo);
    await expect(
      page.getByLabel("Select added image", { exact: true }),
    ).toBeVisible();
    await containedControls(page);
    await page
      .getByRole("button", { name: "Adjust photo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Align photo right", exact: true })
      .click();
    await containedControls(page);

    await page.getByRole("button", { name: "Add text", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Text content", exact: true })
      .fill("Room for every memory");
    await page
      .getByRole("button", { name: "Cycle text layer", exact: true })
      .click();
    await containedControls(page);
    await page.locator(".customize-toggle").click();
    await containedControls(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (scenario.name === "narrow portrait dock" || scenario.width <= 900)
      await page.screenshot({
        path: `test-results/toolbar-${scenario.width}-fixed.png`,
      });
  });
}

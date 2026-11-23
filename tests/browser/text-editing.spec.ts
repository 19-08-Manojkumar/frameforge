import { test, expect, type Locator } from "@playwright/test";

const caption =
  "MOUNTAIN MEMORIES\nThe long way home\nA little escape\nA lasting memory\nEvery stop tells a story\nSee you on the next adventure.";

async function noInnerScroll(field: Locator) {
  await expect
    .poll(() =>
      field.evaluate((element) => {
        const input = element as HTMLTextAreaElement;
        return (
          input.scrollHeight <= input.clientHeight + 1 &&
          input.scrollWidth <= input.clientWidth + 1
        );
      }),
    )
    .toBe(true);
}

test("one click edits at the actual text anchor, formatting remains live, and clicking outside finishes", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  const title = page.getByRole("button", {
    name: "Edit text: EVERY PATH LEADS SOMEWHERE",
    exact: true,
  });
  const anchor = await title.evaluate((e) => {
    const p = e.parentElement!;
    return [p.style.left, p.style.top, p.style.transform];
  });
  const originalCanvas = await page
    .getByTestId("collage-preview")
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await title.click();
  const field = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await expect(field).toBeFocused();
  await expect(page.locator("dialog")).toHaveCount(0);
  expect(
    await field.evaluate((e) => {
      const p = e.closest<HTMLElement>(".text-overlay-item")!;
      return [p.style.left, p.style.top, p.style.transform];
    }),
  ).toEqual(anchor);
  await expect(page.locator(".canvas-stage .inline-text-input")).toBeVisible();
  await field.fill(caption);
  await noInnerScroll(field);
  await page
    .getByLabel("Text font", { exact: true })
    .selectOption({ label: "Caveat" });
  await expect(field).toBeVisible();
  expect(await field.evaluate((e) => getComputedStyle(e).fontFamily)).toContain(
    "Caveat",
  );
  await field.fill("A beautiful trip");
  await field.press("Home");
  await field.press("ArrowRight");
  await field.press("ArrowRight");
  await page.getByRole("button", { name: "Bold text", exact: true }).click();
  await expect(field).toBeFocused();
  await page.keyboard.insertText("★");
  await expect(field).toHaveValue("A ★beautiful trip");
  await page.getByRole("button", { name: "Align left", exact: true }).click();
  await expect(field).toBeFocused();
  expect(await field.evaluate((e) => getComputedStyle(e).textAlign)).toBe(
    "left",
  );
  await page.screenshot({ path: "test-results/inline-text-desktop.png" });
  await page.getByRole("heading", { name: /Make it ready to share/ }).click();
  await expect(field).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .getByTestId("collage-preview")
        .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(originalCanvas);
  await expect(
    page.getByRole("button", {
      name: "Edit text: A ★beautiful trip",
      exact: true,
    }),
  ).toBeVisible();
});

test("native multiline typing grows without scrolling, supports undo, and Escape leaves the expanded preview open", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Edit text: EVERY PATH LEADS SOMEWHERE",
      exact: true,
    })
    .click();
  const field = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  await field.fill("GOA");
  const height = (await field.boundingBox())!.height;
  await field.press("End");
  await field.press("Enter");
  await expect(field).toHaveValue("GOA\n");
  await page.keyboard.insertText("Memories");
  await expect(field).toHaveValue("GOA\nMemories");
  await noInnerScroll(field);
  expect((await field.boundingBox())!.height).toBeGreaterThan(height * 1.5);
  await field.press("Control+z");
  await expect(field).toHaveValue("GOA\n");
  await field.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Exit full screen", exact: true }),
  ).toBeVisible();
});

test("sidebar wording expands for long text and after a collapsed pane reopens", async ({
  page,
}) => {
  await page.goto("/?mode=editor");
  await page.getByText("Edit template wording", { exact: false }).click();
  const field = page.getByRole("textbox", {
    name: "Template wording 1",
    exact: true,
  });
  const initialHeight = (await field.boundingBox())!.height;
  await field.fill(caption);
  await noInnerScroll(field);
  expect((await field.boundingBox())!.height).toBeGreaterThan(
    initialHeight * 1.5,
  );
  await page.getByText("Edit template wording", { exact: false }).click();
  await page.getByText("Edit template wording", { exact: false }).click();
  await noInnerScroll(field);
  await field.fill("Short title");
  expect((await field.boundingBox())!.height).toBeLessThan(100);
});

test.describe("direct touch editing in Quick Create", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("a single tap edits the visible caption without changing modes or opening a modal", async ({
    page,
  }) => {
    await page.goto("/");
    const title = page.getByRole("button", {
      name: "Edit text: EVERY PATH LEADS SOMEWHERE",
      exact: true,
    });
    await title.tap();
    const field = page.getByRole("textbox", {
      name: "Text content",
      exact: true,
    });
    await expect(field).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Quick Create", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("dialog")).toHaveCount(0);
    await field.fill("WEEKEND\nMEMORIES");
    await noInnerScroll(field);
    await page.getByRole("button", { name: "Bold text", exact: true }).tap();
    await expect(field).toBeFocused();
    await page.screenshot({ path: "test-results/inline-text-mobile.png" });
    for (const width of [320, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await noInnerScroll(field);
      const bounds = (await field.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(-2);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 2);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Finish editing text", exact: true })
      .tap();
    await expect(field).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Edit text: WEEKEND MEMORIES",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("toolbar", { name: "Selected text style" }),
    ).toBeHidden();
  });
});

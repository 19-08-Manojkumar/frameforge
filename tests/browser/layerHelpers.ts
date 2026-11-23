import { expect, type Page } from "@playwright/test";
export async function moveLayer(
  page: Page,
  label: string,
  position: "top" | "middle" | "bottom",
) {
  const button = page.getByRole("button", {
    name: `Cycle ${label} layer`,
    exact: true,
  });
  for (let i = 0; i < 3; i++) {
    if ((await button.getAttribute("data-position")) === position) return;
    await button.click();
  }
  await expect(button).toHaveAttribute("data-position", position);
}

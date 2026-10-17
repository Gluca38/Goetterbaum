import { expect, test } from "@playwright/test";

test("Startseite lädt im Browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Götterbaum");
  await expect(page.getByRole("heading", { level: 1, name: "Götterbaum" })).toBeVisible();
});

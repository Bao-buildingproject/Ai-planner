import { expect, test } from "@playwright/test";
import { addTask, signUp, todayPage } from "./helpers";

test("điện thoại: chọn ngày bằng dải 7 ô, thêm việc, không tràn ngang", async ({ page }) => {
  await signUp(page);
  const strip = page.getByRole("group", { name: "Chọn ngày" });
  await expect(strip.getByRole("button")).toHaveCount(7);
  await expect(page.locator("section.day:visible")).toHaveCount(1);
  await expect(todayPage(page)).toBeVisible();

  await addTask(page, "Việc trên điện thoại", "07:30");
  await expect(strip.locator('[aria-current="date"] .dots i')).toHaveCount(1);

  const sunday = strip.getByRole("button", { name: /^Chủ Nhật/ });
  await sunday.click();
  await expect(sunday).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("section.day:visible h2")).toContainText("Chủ Nhật");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("điện thoại: sửa việc trong khung trượt từ dưới lên", async ({ page }) => {
  await signUp(page);
  await addTask(page, "Đi chợ");
  await todayPage(page).getByRole("button", { name: /Sửa việc: Đi chợ/ }).click();
  const dialog = page.getByRole("dialog", { name: "Sửa việc" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(viewport.height - 2);
  await dialog.getByRole("button", { name: "Hủy" }).click();
  await expect(dialog).toBeHidden();
});

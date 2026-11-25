import { expect, type Page } from "@playwright/test";

export const PASSWORD = "matkhau123";

/** Today in Vietnam (UTC+7), as YYYY-MM-DD. */
export function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export async function signUp(page: Page, name = "Người thử") {
  // Sign-ups are limited per address (10 an hour); give each test its own.
  const ip = `10.${rand255()}.${rand255()}.${rand255()}`;
  await page.context().setExtraHTTPHeaders({ "x-real-ip": ip });
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Tên của bạn").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.waitForURL("**/week");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return { email, password: PASSWORD };
}

const rand255 = () => Math.floor(Math.random() * 255);

export const todayPage = (page: Page) => page.locator("section.day[data-today]");

export async function addTask(page: Page, title: string, time = "") {
  const day = todayPage(page);
  const toggle = day.getByRole("button", { name: "Thêm việc" });
  if (await toggle.isVisible()) await toggle.click();
  await day.getByRole("textbox", { name: /Tên việc mới/ }).fill(title);
  if (time) await day.getByLabel("Giờ bắt đầu, không bắt buộc").fill(time);
  await day.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(day.locator(".task", { hasText: title })).toHaveCount(1);
}

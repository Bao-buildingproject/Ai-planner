import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addTask, mondayOf, PASSWORD, signUp, todayPage, todayVN } from "./helpers";

const row = (page: Page, title: string) => todayPage(page).locator(".task", { hasText: title });

test("thêm, tích, sửa, xóa và hoàn tác một việc; dữ liệu còn sau khi tải lại", async ({ page }) => {
  await signUp(page, "Bảo");
  await addTask(page, "Gửi báo cáo tuần", "11:00");
  await addTask(page, "Gọi điện cho mẹ");

  await row(page, "Gửi báo cáo tuần").getByRole("button", { name: /Đã xong/ }).click();
  await expect(row(page, "Gửi báo cáo tuần").getByRole("button", { name: /Đã xong/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("progressbar", { name: "Tiến độ tuần" })).toHaveAttribute("aria-valuenow", "50");
  await page.reload();
  await expect(row(page, "Gửi báo cáo tuần").getByRole("button", { name: /Đã xong/ })).toHaveAttribute("aria-pressed", "true");

  // Rapid ticks end on what the screen shows.
  const check = row(page, "Gọi điện cho mẹ").getByRole("button", { name: /Đã xong/ });
  for (let i = 0; i < 5; i++) await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => {
      const { week } = await (await page.request.get(`/api/weeks/${mondayOf(todayVN())}`)).json();
      return week.tasks.find((t: { title: string }) => t.title === "Gọi điện cho mẹ").done;
    })
    .toBe(true);

  await row(page, "Gọi điện cho mẹ").getByRole("button", { name: /Sửa việc/ }).click();
  const dialog = page.getByRole("dialog", { name: "Sửa việc" });
  await dialog.getByLabel("Tên việc").fill("Gọi điện cho bố mẹ");
  await dialog.getByLabel("Bắt đầu").fill("20:00");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "Gọi điện cho bố mẹ")).toContainText("20:00");

  await row(page, "Gọi điện cho bố mẹ").getByRole("button", { name: /Sửa việc/ }).click();
  await dialog.getByRole("button", { name: "Xóa" }).click();
  await expect(row(page, "Gọi điện cho bố mẹ")).toHaveCount(0);
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(row(page, "Gọi điện cho bố mẹ")).toHaveCount(1);
  await page.reload();
  await expect(row(page, "Gọi điện cho bố mẹ")).toHaveCount(1);
});

test("hai tài khoản không thấy dữ liệu của nhau", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await signUp(a, "Người A");
  await addTask(a, "Việc riêng của A");
  const { week } = await (await a.request.get(`/api/weeks/${mondayOf(todayVN())}`)).json();
  const taskId = week.tasks[0].id;

  const b = await (await browser.newContext()).newPage();
  await signUp(b, "Người B");
  await expect(b.getByText("Việc riêng của A")).toHaveCount(0);
  const origin = new URL(b.url()).origin;
  const res = await b.request.patch(`/api/tasks/${taskId}`, { data: { done: true }, headers: { Origin: origin } });
  expect(res.status()).toBe(404);
  const del = await b.request.delete(`/api/tasks/${taskId}`, { headers: { Origin: origin } });
  expect(del.status()).toBe(404);
});

test("chặn yêu cầu thay đổi dữ liệu từ trang web khác", async ({ page }) => {
  await signUp(page);
  const res = await page.request.post("/api/tasks", {
    data: { date: todayVN(), title: "Giả mạo" },
    headers: { Origin: "https://trang-la.example" },
  });
  expect(res.status()).toBe(403);
});

test("mục tiêu và ghi chú tự lưu", async ({ page }) => {
  await signUp(page);
  await page.getByRole("textbox", { name: "Mục tiêu tuần", exact: true }).fill("Học xong Quantitative Methods");
  await page.getByRole("textbox", { name: "Ghi chú", exact: true }).fill("Ôn lại công thức NPV, IRR.");
  await expect(page.getByText("Đã lưu")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Mục tiêu tuần", exact: true })).toHaveValue("Học xong Quantitative Methods");
  await expect(page.getByRole("textbox", { name: "Ghi chú", exact: true })).toHaveValue("Ôn lại công thức NPV, IRR.");
});

test("chuyển sang tuần sau rồi quay về tuần này", async ({ page }) => {
  await signUp(page);
  const title = page.getByRole("heading", { level: 1 });
  const thisWeek = await title.textContent();
  await page.getByRole("button", { name: "Tuần sau" }).click();
  await expect(title).not.toHaveText(thisWeek!);
  await expect(page).toHaveURL(/\/week\?d=\d{4}-\d{2}-\d{2}/);
  await page.getByRole("button", { name: "Tuần này" }).click();
  await expect(title).toHaveText(thisWeek!);
  await expect(page.getByRole("button", { name: "Tuần này" })).toBeDisabled();
});

test("đăng xuất, đăng nhập lại và chặn trang khi chưa đăng nhập", async ({ page }) => {
  const { email } = await signUp(page);
  await page.goto("/account");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/login");
  await page.goto("/week");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/week");
});

test("ghi nhớ đăng nhập: chỉ có hạn dùng dài khi người dùng tick", async ({ page, context }) => {
  const { email } = await signUp(page);
  const sessionCookie = async () => (await context.cookies()).find((c) => c.name.endsWith("aip_session"))!;
  // Sign-up without the box: a browser-session cookie (no expiry date).
  expect((await sessionCookie()).expires).toBe(-1);

  await page.goto("/account");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Ghi nhớ đăng nhập").check();
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/week");
  const remembered = await sessionCookie();
  const days = (remembered.expires - Date.now() / 1000) / 86400;
  expect(days).toBeGreaterThan(29);
  expect(days).toBeLessThan(31);

  // Signing in again without the box goes back to a session cookie.
  await page.goto("/account");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
  await expect(page.getByLabel("Ghi nhớ đăng nhập")).not.toBeChecked();
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/week");
  expect((await sessionCookie()).expires).toBe(-1);
});

test("nhập file sao lưu của bản kế hoạch tuần cũ", async ({ page }) => {
  await signUp(page);
  const today = todayVN();
  const old = {
    tasks: { [today]: [{ id: "1", text: "Việc từ bản cũ", time: "08:00", done: true }, { id: "2", text: "Việc thứ hai", time: "", done: false }] },
    notes: { [mondayOf(today)]: "Ghi chú từ bản cũ" },
  };
  await page.goto("/account");
  await page.getByLabel("Chọn file sao lưu").setInputFiles({ name: "ke-hoach.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(old)) });
  await expect(page.getByRole("status")).toContainText("Đã thêm 2 việc");
  await page.goto("/week");
  await expect(row(page, "Việc từ bản cũ")).toHaveAttribute("data-status", "done");
  await expect(page.getByRole("textbox", { name: "Ghi chú", exact: true })).toHaveValue("Ghi chú từ bản cũ");
});

test("đổi giao diện tối được lưu theo tài khoản", async ({ page }) => {
  await signUp(page);
  await page.goto("/account");
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/me") && r.request().method() === "PATCH");
  await page.getByText("Tối", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const scheme of ["light", "dark"] as const) {
  test(`không có lỗi truy cập WCAG (${scheme === "light" ? "nền sáng" : "nền tối"})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const scan = async () => {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    };
    await page.goto("/login");
    await scan();
    await page.goto("/signup");
    await scan();
    await signUp(page);
    await addTask(page, "Việc để kiểm tra", "07:00");
    await addTask(page, "Việc đã xong");
    await row(page, "Việc đã xong").getByRole("button", { name: /Đã xong/ }).click();
    await expect(row(page, "Việc đã xong")).toHaveAttribute("data-status", "done");
    await page.waitForTimeout(600);
    await scan();
    await page.goto("/account");
    await scan();
  });
}

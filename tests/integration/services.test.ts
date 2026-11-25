/**
 * Service tests against a real PostgreSQL database. They WIPE the database, so
 * they only run when TEST_DATABASE_URL points at a database whose name ends in "_test":
 *   TEST_DATABASE_URL=postgres://planner:planner@localhost:5432/ai_planner_test npm run test:integration
 */
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseBackup } from "@/lib/backup";
import { createSession, SESSION_TTL_DAYS, SHORT_SESSION_HOURS, validateSessionToken } from "@/server/auth";
import { sessions } from "@/server/db/schema";
import { closeDb, getDb } from "@/server/db";
import { AppError } from "@/server/errors";
import { changePassword, login, signup, updateProfile } from "@/server/services/account";
import { exportBackup, importBackup } from "@/server/services/backup";
import { createTask, deleteTask, getWeek, MAX_TASKS_PER_DAY, saveWeekNotes, updateTask } from "@/server/services/tasks";

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl && !new URL(testUrl).pathname.replace(/^\//, "").endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL phải trỏ tới cơ sở dữ liệu có tên kết thúc bằng _test (bài test sẽ xóa dữ liệu).");
}
if (testUrl) process.env.DATABASE_URL = testUrl;

const MONDAY = "2026-11-23";

async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.status === status);
}

let counter = 0;
async function newUser(name = "Người dùng") {
  const email = `user${++counter}-${Date.now()}@example.com`;
  const { userId, token } = await signup(getDb(), { name, email, password: "matkhau123", inviteCode: "" });
  return { userId, token, email };
}

const base = { startTime: null, endTime: null, done: false };

describe.skipIf(!testUrl)("services on PostgreSQL", () => {
  beforeAll(async () => {
    await getDb().execute(sql`truncate table users, rate_limits restart identity cascade`);
  });
  afterAll(async () => {
    await closeDb();
  });

  it("signs up, refuses a second account for the same email, and logs in", async () => {
    const db = getDb();
    const { userId, token, email } = await newUser("Bảo");
    expect((await validateSessionToken(db, token))?.user).toMatchObject({ id: userId, name: "Bảo", theme: "system" });
    await expectStatus(signup(db, { name: "Khác", email, password: "matkhau123", inviteCode: "" }), 409);
    await expectStatus(login(db, { email, password: "sai-mat-khau" }), 401);
    await expectStatus(login(db, { email: "khong-co@example.com", password: "matkhau123" }), 401);
    const ok = await login(db, { email, password: "matkhau123" });
    expect(ok.userId).toBe(userId);
    expect(ok.theme).toBe("system");
  });

  it("remember me: a long renewable sign-in, otherwise a short fixed one", async () => {
    const db = getDb();
    const { userId } = await newUser();
    const hours = (d: Date) => (d.getTime() - Date.now()) / 3_600_000;
    const long = await createSession(db, userId, true);
    const short = await createSession(db, userId, false);
    expect(long.remember).toBe(true);
    expect(short.remember).toBe(false);
    expect(hours(long.expiresAt)).toBeGreaterThan(SESSION_TTL_DAYS * 24 - 1);
    expect(hours(short.expiresAt)).toBeLessThan(SHORT_SESSION_HOURS + 0.1);
    expect(hours(short.expiresAt)).toBeGreaterThan(SHORT_SESSION_HOURS - 1);

    // A long one close to its end is renewed, and the cookie must be refreshed.
    const nearEnd = new Date(Date.now() + 5 * 86_400_000);
    await db.update(sessions).set({ expiresAt: nearEnd }).where(eq(sessions.userId, userId));
    const renewed = await validateSessionToken(db, long.token);
    expect(renewed?.renewedUntil).not.toBeNull();
    // A short one is never extended: it ends on schedule.
    const fixed = await validateSessionToken(db, short.token);
    expect(fixed?.renewedUntil).toBeNull();
  });

  it("login and signup carry the remember choice into the session", async () => {
    const db = getDb();
    const email = `remember-${Date.now()}@example.com`;
    const created = await signup(db, { name: "R", email, password: "matkhau123", inviteCode: "", remember: true });
    expect(created.remember).toBe(true);
    expect((await login(db, { email, password: "matkhau123" })).remember).toBe(false);
    expect((await login(db, { email, password: "matkhau123", remember: true })).remember).toBe(true);
  });

  it("requires the invite code only when one is set", async () => {
    const db = getDb();
    process.env.INVITE_CODE = "ma-moi-2026";
    try {
      await expectStatus(signup(db, { name: "A", email: `invite-a-${Date.now()}@example.com`, password: "matkhau123", inviteCode: "" }), 403);
      await expectStatus(signup(db, { name: "A", email: `invite-b-${Date.now()}@example.com`, password: "matkhau123", inviteCode: "sai" }), 403);
      const ok = await signup(db, { name: "A", email: `invite-c-${Date.now()}@example.com`, password: "matkhau123", inviteCode: " ma-moi-2026 " });
      expect(ok.userId).toBeTruthy();
    } finally {
      delete process.env.INVITE_CODE;
    }
  });

  it("keeps every account's tasks private", async () => {
    const db = getDb();
    const a = await newUser("A");
    const b = await newUser("B");
    const task = await createTask(db, a.userId, { ...base, date: "2026-11-25", title: "Việc của A" });
    await expectStatus(updateTask(db, b.userId, task.id, { done: true }), 404);
    await expectStatus(deleteTask(db, b.userId, task.id), 404);
    expect((await getWeek(db, b.userId, MONDAY)).tasks).toEqual([]);
    expect((await getWeek(db, a.userId, MONDAY)).tasks.map((t) => t.title)).toEqual(["Việc của A"]);
  });

  it("edits tasks within the time rules", async () => {
    const db = getDb();
    const { userId } = await newUser();
    const task = await createTask(db, userId, { ...base, date: "2026-11-25", title: "Học CFA", startTime: "19:00", endTime: "21:00" });
    await expectStatus(updateTask(db, userId, task.id, { endTime: "18:00" }), 400);
    const cleared = await updateTask(db, userId, task.id, { startTime: null });
    expect(cleared).toMatchObject({ startTime: null, endTime: null });
    const done = await updateTask(db, userId, task.id, { done: true, title: "Học CFA – ôn tập", date: "2026-11-27" });
    expect(done).toMatchObject({ done: true, title: "Học CFA – ôn tập", date: "2026-11-27" });
    expect((await updateTask(db, userId, task.id, { done: false })).done).toBe(false);
    const removed = await deleteTask(db, userId, task.id);
    expect(removed.id).toBe(task.id);
    await expectStatus(deleteTask(db, userId, task.id), 404);
  });

  it("limits how many tasks one day can hold", async () => {
    const db = getDb();
    const { userId } = await newUser();
    for (let i = 0; i < MAX_TASKS_PER_DAY; i++) await createTask(db, userId, { ...base, date: "2026-11-26", title: `Việc ${i}` });
    await expectStatus(createTask(db, userId, { ...base, date: "2026-11-26", title: "Quá nhiều" }), 400);
  });

  it("reports the week and the week before", async () => {
    const db = getDb();
    const { userId } = await newUser();
    await createTask(db, userId, { ...base, date: "2026-11-16", title: "Tuần trước 1", done: true });
    await createTask(db, userId, { ...base, date: "2026-11-22", title: "Tuần trước 2" });
    await createTask(db, userId, { ...base, date: "2026-11-23", title: "Tuần này" });
    await createTask(db, userId, { ...base, date: "2026-11-30", title: "Tuần sau" });
    const week = await getWeek(db, userId, MONDAY);
    expect(week.tasks.map((t) => t.title)).toEqual(["Tuần này"]);
    expect(week.previous).toEqual({ done: 1, total: 2 });
  });

  it("saves the goal and notes separately", async () => {
    const db = getDb();
    const { userId } = await newUser();
    await saveWeekNotes(db, userId, MONDAY, { goal: "Gym 3 buổi" });
    expect(await saveWeekNotes(db, userId, MONDAY, { notes: "Ghi chú" })).toEqual({ goal: "Gym 3 buổi", notes: "Ghi chú" });
    expect(await getWeek(db, userId, MONDAY)).toMatchObject({ goal: "Gym 3 buổi", notes: "Ghi chú" });
  });

  it("imports an old backup without overwriting, and twice without duplicates", async () => {
    const db = getDb();
    const { userId } = await newUser();
    await createTask(db, userId, { ...base, date: "2026-11-23", title: "Lên kế hoạch tuần", startTime: "08:00" });
    await saveWeekNotes(db, userId, MONDAY, { goal: "Mục tiêu đang có", notes: "Ghi chú đang có" });
    const old = parseBackup({
      tasks: {
        "2026-11-23": [
          { id: "1", text: "Lên kế hoạch tuần", time: "08:00", done: true },
          { id: "2", text: "Học CFA – Ethics", time: "19:00", done: true },
        ],
        "2026-11-24": [{ id: "3", text: "Tập gym", time: "17:30", done: false }],
      },
      notes: { "2026-11-23": "Ghi chú từ bản cũ" },
    });
    expect(await importBackup(db, userId, old)).toEqual({ added: 2, duplicates: 1, skipped: 0, weeks: 1 });
    const week = await getWeek(db, userId, MONDAY);
    expect(week.tasks).toHaveLength(3);
    expect(week.goal).toBe("Mục tiêu đang có");
    expect(week.notes).toBe("Ghi chú đang có\n\nGhi chú từ bản cũ");
    expect(await importBackup(db, userId, old)).toEqual({ added: 0, duplicates: 3, skipped: 0, weeks: 0 });
  });

  it("exports a backup that another account can import", async () => {
    const db = getDb();
    const a = await newUser();
    const b = await newUser();
    await createTask(db, a.userId, { ...base, date: "2026-11-25", title: "Gửi báo cáo tuần", startTime: "11:00", done: true });
    await saveWeekNotes(db, a.userId, MONDAY, { goal: "Hoàn thành báo cáo" });
    const file = JSON.parse(JSON.stringify(await exportBackup(db, a.userId)));
    expect(file).toMatchObject({ app: "ai-planner", version: 2 });
    expect(await importBackup(db, b.userId, parseBackup(file))).toMatchObject({ added: 1, weeks: 1 });
    expect(await getWeek(db, b.userId, MONDAY)).toMatchObject({
      goal: "Hoàn thành báo cáo",
      tasks: [expect.objectContaining({ title: "Gửi báo cáo tuần", startTime: "11:00", done: true })],
    });
  });

  it("changes the password and signs out other devices", async () => {
    const db = getDb();
    const { userId, token, email } = await newUser();
    const other = await createSession(db, userId);
    await expectStatus(changePassword(db, userId, "sai", "matkhau-moi-1", token), 400);
    await changePassword(db, userId, "matkhau123", "matkhau-moi-1", token);
    expect(await validateSessionToken(db, token)).not.toBeNull();
    expect(await validateSessionToken(db, other.token)).toBeNull();
    await expectStatus(login(db, { email, password: "matkhau123" }), 401);
    expect((await login(db, { email, password: "matkhau-moi-1" })).userId).toBe(userId);
  });

  it("updates the name and theme", async () => {
    const db = getDb();
    const { userId } = await newUser();
    expect(await updateProfile(db, userId, { name: "Tên mới", theme: "dark" })).toMatchObject({ name: "Tên mới", theme: "dark" });
  });
});

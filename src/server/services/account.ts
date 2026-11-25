import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Theme } from "@/lib/validation";
import { burnPasswordCheck, createSession, hashPassword, invalidateUserSessions, type SessionUser, verifyPassword } from "../auth";
import type { Db } from "../db";
import { users } from "../db/schema";
import { AppError, badRequest, conflict, notFound } from "../errors";
import { logEvent } from "../log";

/** When the server sets INVITE_CODE, new accounts must enter it. */
export function inviteRequired(): boolean {
  return Boolean(process.env.INVITE_CODE?.trim());
}

function inviteMatches(code: string): boolean {
  const expected = process.env.INVITE_CODE?.trim() ?? "";
  if (!expected) return true;
  const a = createHash("sha256").update(code.trim()).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === "object" && e !== null ? (e as { code?: unknown }).code : undefined);
  return code(error) === "23505" || code((error as { cause?: unknown })?.cause) === "23505";
}

const EMAIL_TAKEN = "Email này đã được đăng ký. Hãy đăng nhập.";

export async function signup(db: Db, input: { name: string; email: string; password: string; inviteCode: string }) {
  if (!inviteMatches(input.inviteCode)) {
    logEvent("warn", "signup_failed", { reason: "bad_invite" });
    throw new AppError(403, "Mã mời không đúng. Hãy hỏi lại người đã mời bạn.", "bad_invite");
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length) throw conflict(EMAIL_TAKEN);
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash })
        .returning({ id: users.id });
      const session = await createSession(tx, user!.id);
      logEvent("info", "signup", { userId: user!.id });
      return { userId: user!.id, ...session };
    });
  } catch (error) {
    // Two sign-ups racing for the same email.
    if (isUniqueViolation(error)) throw conflict(EMAIL_TAKEN);
    throw error;
  }
}

export async function login(db: Db, input: { email: string; password: string }) {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, theme: users.theme })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (!user) {
    await burnPasswordCheck(input.password);
    logEvent("warn", "login_failed", { reason: "unknown_email" });
    throw new AppError(401, "Email hoặc mật khẩu không đúng", "invalid_credentials");
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    logEvent("warn", "login_failed", { userId: user.id, reason: "bad_password" });
    throw new AppError(401, "Email hoặc mật khẩu không đúng", "invalid_credentials");
  }
  const session = await createSession(db, user.id);
  logEvent("info", "login", { userId: user.id });
  return { userId: user.id, theme: user.theme, ...session };
}

export async function changePassword(db: Db, userId: string, current: string, next: string, keepToken: string) {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound("Tài khoản không tồn tại");
  if (!(await verifyPassword(current, user.passwordHash))) throw badRequest("Mật khẩu hiện tại không đúng");
  if (current === next) throw badRequest("Mật khẩu mới phải khác mật khẩu hiện tại");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: sql`now()` })
    .where(eq(users.id, userId));
  // Sign out every other device.
  await invalidateUserSessions(db, userId, keepToken);
  logEvent("info", "password_changed", { userId });
}

export async function updateProfile(db: Db, userId: string, input: { name?: string; theme?: Theme }): Promise<SessionUser> {
  const [user] = await db
    .update(users)
    .set({ ...input, updatedAt: sql`now()` })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name, theme: users.theme });
  if (!user) throw notFound("Tài khoản không tồn tại");
  return user;
}

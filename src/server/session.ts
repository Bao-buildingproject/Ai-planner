import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAMES, type SessionUser, validateSessionToken } from "./auth";
import { getDb } from "./db";

/** The signed-in user for a page render, or null. Cookie renewal happens on API calls. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = SESSION_COOKIE_NAMES.map((name) => jar.get(name)?.value).find(Boolean);
  if (!token) return null;
  const session = await validateSessionToken(getDb(), token);
  return session?.user ?? null;
}

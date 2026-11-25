import { themeCookie } from "@/server/auth";
import { authed, json, readJson } from "@/server/http";
import { updateProfile } from "@/server/services/account";
import { profileSchema } from "@/lib/validation";

export const GET = authed(async ({ user }) => json({ user }));

export const PATCH = authed(async ({ req, db, user }) => {
  const input = await readJson(req, profileSchema, 4 * 1024);
  const updated = await updateProfile(db, user.id, input);
  const res = json({ user: updated });
  if (input.theme) res.cookies.set(themeCookie(updated.theme));
  return res;
});

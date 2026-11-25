import { tooMany } from "@/server/errors";
import { authed, json, readJson } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { createTask } from "@/server/services/tasks";
import { createTaskSchema } from "@/lib/validation";

export const POST = authed(async ({ req, db, user }) => {
  const limit = await consumeRateLimit(db, `tasks:create:${user.id}`, 600, 3600);
  if (!limit.allowed) throw tooMany(limit.retryAfterSeconds);
  const input = await readJson(req, createTaskSchema, 8 * 1024);
  return json({ task: await createTask(db, user.id, input) }, { status: 201 });
});

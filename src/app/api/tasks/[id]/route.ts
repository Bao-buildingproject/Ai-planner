import { authed, json, readJson } from "@/server/http";
import { uuidParam } from "@/server/params";
import { deleteTask, updateTask } from "@/server/services/tasks";
import { updateTaskSchema } from "@/lib/validation";

const MISSING = "Không tìm thấy việc này";

export const PATCH = authed<{ id: string }>(async ({ req, db, user, params }) => {
  const id = uuidParam(params.id, MISSING);
  const input = await readJson(req, updateTaskSchema, 8 * 1024);
  return json({ task: await updateTask(db, user.id, id, input) });
});

export const DELETE = authed<{ id: string }>(async ({ db, user, params }) =>
  json({ task: await deleteTask(db, user.id, uuidParam(params.id, MISSING)) }),
);

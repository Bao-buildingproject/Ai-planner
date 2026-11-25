import { isValidDateStr, mondayOf } from "@/lib/dates";
import { weekNotesSchema } from "@/lib/validation";
import { badRequest } from "@/server/errors";
import { authed, json, readJson } from "@/server/http";
import { getWeek, saveWeekNotes } from "@/server/services/tasks";

function weekParam(value: string): string {
  if (!isValidDateStr(value)) throw badRequest("Ngày không hợp lệ");
  return mondayOf(value);
}

export const GET = authed<{ monday: string }>(async ({ db, user, params }) =>
  json({ week: await getWeek(db, user.id, weekParam(params.monday)) }),
);

export const PUT = authed<{ monday: string }>(async ({ req, db, user, params }) => {
  const input = await readJson(req, weekNotesSchema, 32 * 1024);
  return json(await saveWeekNotes(db, user.id, weekParam(params.monday), input));
});

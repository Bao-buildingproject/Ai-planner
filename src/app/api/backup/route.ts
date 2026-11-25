import { BackupFormatError, parseBackup } from "@/lib/backup";
import { nowInVietnam } from "@/lib/dates";
import { AppError, badRequest, tooMany } from "@/server/errors";
import { authed, json } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { exportBackup, importBackup } from "@/server/services/backup";

const MAX_BYTES = 5 * 1024 * 1024;

export const GET = authed(async ({ db, user }) => {
  const backup = await exportBackup(db, user.id);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai-planner-${nowInVietnam().date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});

export const POST = authed(async ({ req, db, user }) => {
  const limit = await consumeRateLimit(db, `import:${user.id}`, 20, 3600);
  if (!limit.allowed) throw tooMany(limit.retryAfterSeconds);
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) throw new AppError(413, "File quá lớn (tối đa 5 MB)", "payload_too_large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw badRequest("File không phải JSON hợp lệ");
  }
  try {
    return json({ result: await importBackup(db, user.id, parseBackup(data)) });
  } catch (error) {
    if (error instanceof BackupFormatError) throw badRequest(error.message);
    throw error;
  }
});

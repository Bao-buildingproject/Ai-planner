import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { BACKUP_APP, type BackupFileV2, type ParsedBackup, taskKey } from "@/lib/backup";
import type { Db } from "../db";
import { tasks, weekNotes } from "../db/schema";
import { logEvent } from "../log";
import { MAX_TASKS_PER_DAY } from "./tasks";

export async function exportBackup(db: Db, userId: string): Promise<BackupFileV2> {
  const [taskRows, weekRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.date), asc(tasks.startTime), asc(tasks.createdAt)),
    db.select().from(weekNotes).where(eq(weekNotes.userId, userId)).orderBy(asc(weekNotes.weekStart)),
  ]);
  return {
    app: BACKUP_APP,
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks: taskRows.map((r) => ({ date: r.date, title: r.title, startTime: r.startTime, endTime: r.endTime, done: r.doneAt !== null })),
    weeks: weekRows.filter((w) => w.goal.trim() || w.notes.trim()).map((w) => ({ weekStart: w.weekStart, goal: w.goal, notes: w.notes })),
  };
}

export interface ImportResult {
  added: number;
  duplicates: number;
  skipped: number;
  weeks: number;
}

/**
 * Adds the backup to the account. Nothing that already exists is changed or
 * removed: identical tasks are skipped, and notes are only filled in or appended.
 */
export async function importBackup(db: Db, userId: string, backup: ParsedBackup): Promise<ImportResult> {
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ date: tasks.date, title: tasks.title, startTime: tasks.startTime })
      .from(tasks)
      .where(eq(tasks.userId, userId));
    const seen = new Set(existing.map(taskKey));
    const perDay = new Map<string, number>();
    for (const t of existing) perDay.set(t.date, (perDay.get(t.date) ?? 0) + 1);

    const fresh: (typeof tasks.$inferInsert)[] = [];
    let duplicates = 0;
    let skipped = backup.skipped;
    const now = new Date();
    for (const t of backup.tasks) {
      const key = taskKey(t);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      const used = perDay.get(t.date) ?? 0;
      if (used >= MAX_TASKS_PER_DAY) {
        skipped++;
        continue;
      }
      seen.add(key);
      perDay.set(t.date, used + 1);
      fresh.push({ userId, date: t.date, title: t.title, startTime: t.startTime, endTime: t.endTime, doneAt: t.done ? now : null });
    }
    for (let i = 0; i < fresh.length; i += 500) await tx.insert(tasks).values(fresh.slice(i, i + 500));

    let weeks = 0;
    for (const w of backup.weeks) {
      const [current] = await tx
        .select({ goal: weekNotes.goal, notes: weekNotes.notes })
        .from(weekNotes)
        .where(and(eq(weekNotes.userId, userId), eq(weekNotes.weekStart, w.weekStart)))
        .limit(1);
      if (!current) {
        await tx.insert(weekNotes).values({ userId, weekStart: w.weekStart, goal: w.goal, notes: w.notes });
        weeks++;
        continue;
      }
      const goal = current.goal.trim() ? current.goal : w.goal;
      const incoming = w.notes.trim();
      const notes =
        !incoming || current.notes.includes(incoming)
          ? current.notes
          : current.notes.trim()
            ? `${current.notes}\n\n${w.notes}`.slice(0, 5000)
            : w.notes;
      if (goal !== current.goal || notes !== current.notes) {
        await tx
          .update(weekNotes)
          .set({ goal, notes, updatedAt: sql`now()` })
          .where(and(eq(weekNotes.userId, userId), eq(weekNotes.weekStart, w.weekStart)));
        weeks++;
      }
    }
    return { added: fresh.length, duplicates, skipped, weeks };
  });
  logEvent("info", "backup_imported", { userId, format: backup.format, ...result });
  return result;
}

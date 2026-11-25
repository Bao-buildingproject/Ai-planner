import "server-only";
import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";
import { addDays } from "@/lib/dates";
import type { Task, WeekData } from "@/lib/tasks";
import { timeProblem, type UpdateTaskInput } from "@/lib/validation";
import type { DbOrTx } from "../db";
import { type TaskRow, tasks, weekNotes } from "../db/schema";
import { badRequest, notFound } from "../errors";

export const MAX_TASKS_PER_DAY = 100;
const NOT_FOUND = "Không tìm thấy việc này. Có thể nó đã bị xóa ở thiết bị khác.";

export function toTask(row: TaskRow): Task {
  return { id: row.id, date: row.date, title: row.title, startTime: row.startTime, endTime: row.endTime, done: row.doneAt !== null };
}

async function assertRoom(db: DbOrTx, userId: string, date: string): Promise<void> {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.date, date)));
  if ((row?.n ?? 0) >= MAX_TASKS_PER_DAY) throw badRequest(`Mỗi ngày có tối đa ${MAX_TASKS_PER_DAY} việc`);
}

export async function createTask(
  db: DbOrTx,
  userId: string,
  input: { date: string; title: string; startTime: string | null; endTime: string | null; done: boolean },
): Promise<Task> {
  await assertRoom(db, userId, input.date);
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      date: input.date,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      doneAt: input.done ? new Date() : null,
    })
    .returning();
  return toTask(row!);
}

export async function updateTask(db: DbOrTx, userId: string, id: string, patch: UpdateTaskInput): Promise<Task> {
  const [current] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  if (!current) throw notFound(NOT_FOUND);
  const startTime = patch.startTime !== undefined ? patch.startTime : current.startTime;
  // Clearing the start time also clears the end time unless a new one is given.
  const endTime = patch.endTime !== undefined ? patch.endTime : startTime === null ? null : current.endTime;
  const problem = timeProblem(startTime, endTime);
  if (problem) throw badRequest(problem);
  const date = patch.date ?? current.date;
  if (date !== current.date) await assertRoom(db, userId, date);
  const doneAt = patch.done === undefined ? current.doneAt : patch.done ? (current.doneAt ?? new Date()) : null;
  const [row] = await db
    .update(tasks)
    .set({ date, title: patch.title ?? current.title, startTime, endTime, doneAt, updatedAt: sql`now()` })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (!row) throw notFound(NOT_FOUND);
  return toTask(row);
}

export async function deleteTask(db: DbOrTx, userId: string, id: string): Promise<Task> {
  const [row] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (!row) throw notFound(NOT_FOUND);
  return toTask(row);
}

export async function tasksBetween(db: DbOrTx, userId: string, from: string, to: string): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.date, from), lte(tasks.date, to)))
    .orderBy(asc(tasks.date), asc(tasks.startTime), asc(tasks.createdAt));
  return rows.map(toTask);
}

/** Everything the week page needs, in one round trip. */
export async function getWeek(db: DbOrTx, userId: string, monday: string): Promise<WeekData> {
  const [list, notes, previous] = await Promise.all([
    tasksBetween(db, userId, monday, addDays(monday, 6)),
    db
      .select({ goal: weekNotes.goal, notes: weekNotes.notes })
      .from(weekNotes)
      .where(and(eq(weekNotes.userId, userId), eq(weekNotes.weekStart, monday)))
      .limit(1),
    db
      .select({ total: count(), done: count(tasks.doneAt) })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.date, addDays(monday, -7)), lte(tasks.date, addDays(monday, -1)))),
  ]);
  return {
    weekStart: monday,
    goal: notes[0]?.goal ?? "",
    notes: notes[0]?.notes ?? "",
    tasks: list,
    previous: { done: Number(previous[0]?.done ?? 0), total: Number(previous[0]?.total ?? 0) },
  };
}

export async function saveWeekNotes(
  db: DbOrTx,
  userId: string,
  monday: string,
  input: { goal?: string; notes?: string },
): Promise<{ goal: string; notes: string }> {
  const set: { goal?: string; notes?: string; updatedAt: ReturnType<typeof sql> } = { updatedAt: sql`now()` };
  if (input.goal !== undefined) set.goal = input.goal;
  if (input.notes !== undefined) set.notes = input.notes;
  const [row] = await db
    .insert(weekNotes)
    .values({ userId, weekStart: monday, goal: input.goal ?? "", notes: input.notes ?? "" })
    .onConflictDoUpdate({ target: [weekNotes.userId, weekNotes.weekStart], set })
    .returning({ goal: weekNotes.goal, notes: weekNotes.notes });
  return row!;
}

import { isValidDateStr, isValidTimeStr, mondayOf, timeToMinutes } from "./dates";

/**
 * Backup files. Two formats are accepted:
 *  - v2 (this app):  { app: "ai-planner", version: 2, tasks: [...], weeks: [...] }
 *  - v1 (the old one-file planner, key "ke-hoach-tuan-v1"):
 *      { tasks: { "YYYY-MM-DD": [{ text, time, done }] }, notes: { "<monday>": "text" } }
 * Invalid entries are skipped and counted, never guessed.
 */

export const BACKUP_APP = "ai-planner";
export const MAX_IMPORT_TASKS = 10_000;

export interface BackupTask {
  date: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  done: boolean;
}

export interface BackupWeek {
  weekStart: string;
  goal: string;
  notes: string;
}

export interface BackupFileV2 {
  app: typeof BACKUP_APP;
  version: 2;
  exportedAt: string;
  tasks: BackupTask[];
  weeks: BackupWeek[];
}

export interface ParsedBackup {
  format: "v1" | "v2";
  tasks: BackupTask[];
  weeks: BackupWeek[];
  skipped: number;
}

export class BackupFormatError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function cleanTask(date: unknown, title: unknown, start: unknown, end: unknown, done: unknown): BackupTask | null {
  const d = str(date);
  const t = str(title).trim().slice(0, 200);
  if (!isValidDateStr(d) || !t) return null;
  const s = isValidTimeStr(str(start)) ? str(start) : null;
  let e = isValidTimeStr(str(end)) ? str(end) : null;
  if (e && (!s || timeToMinutes(e) <= timeToMinutes(s))) e = null;
  return { date: d, title: t, startTime: s, endTime: e, done: done === true };
}

function cleanWeek(weekStart: unknown, goal: unknown, notes: unknown): BackupWeek | null {
  const w = str(weekStart);
  if (!isValidDateStr(w)) return null;
  const g = str(goal).slice(0, 300);
  const n = str(notes).slice(0, 5000);
  if (!g.trim() && !n.trim()) return null;
  return { weekStart: mondayOf(w), goal: g, notes: n };
}

export function parseBackup(data: unknown): ParsedBackup {
  if (!isObject(data)) throw new BackupFormatError("File không đúng định dạng sao lưu");
  const tasks: BackupTask[] = [];
  const weeks: BackupWeek[] = [];
  let skipped = 0;

  if (data.app === BACKUP_APP) {
    if (!Array.isArray(data.tasks) || !Array.isArray(data.weeks)) throw new BackupFormatError("File sao lưu bị thiếu dữ liệu");
    for (const raw of data.tasks) {
      const task = isObject(raw) ? cleanTask(raw.date, raw.title, raw.startTime, raw.endTime, raw.done) : null;
      if (task) tasks.push(task);
      else skipped++;
    }
    for (const raw of data.weeks) {
      const week = isObject(raw) ? cleanWeek(raw.weekStart, raw.goal, raw.notes) : null;
      if (week) weeks.push(week);
    }
    return finish("v2", tasks, weeks, skipped);
  }

  if (isObject(data.tasks) && isObject(data.notes)) {
    for (const [date, list] of Object.entries(data.tasks)) {
      if (!Array.isArray(list)) {
        skipped++;
        continue;
      }
      for (const raw of list) {
        const task = isObject(raw) ? cleanTask(date, raw.text, raw.time, null, raw.done) : null;
        if (task) tasks.push(task);
        else skipped++;
      }
    }
    for (const [monday, text] of Object.entries(data.notes)) {
      const week = cleanWeek(monday, "", text);
      if (week) weeks.push(week);
    }
    return finish("v1", tasks, weeks, skipped);
  }

  throw new BackupFormatError("Không nhận ra file này. Hãy chọn file sao lưu của Ai Planner hoặc của bản kế hoạch tuần cũ.");
}

function finish(format: "v1" | "v2", tasks: BackupTask[], weeks: BackupWeek[], skipped: number): ParsedBackup {
  if (tasks.length > MAX_IMPORT_TASKS) throw new BackupFormatError(`File có quá nhiều việc (tối đa ${MAX_IMPORT_TASKS})`);
  return { format, tasks, weeks, skipped };
}

/** Same task = same day, same title, same start time. Used to make re-imports harmless. */
export const taskKey = (t: Pick<BackupTask, "date" | "title" | "startTime">): string => `${t.date}|${t.startTime ?? ""}|${t.title}`;

import { type Now, timeToMinutes } from "./dates";

/** A task as the browser sees it. */
export interface Task {
  id: string;
  date: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  done: boolean;
}

export interface WeekData {
  weekStart: string;
  goal: string;
  notes: string;
  tasks: Task[];
  /** Done/total of the week before, for the comparison line. */
  previous: { done: number; total: number };
}

export type TaskStatus = "done" | "late" | "upcoming";

export const STATUS_LABEL: Record<TaskStatus, string> = { done: "Xong", late: "Trễ", upcoming: "Sắp tới" };

/** Late = not done and its day has passed, or today and its (end) time has passed. */
export function taskStatus(task: Pick<Task, "date" | "startTime" | "endTime" | "done">, now: Now): TaskStatus {
  if (task.done) return "done";
  if (task.date < now.date) return "late";
  if (task.date === now.date) {
    const ref = task.endTime ?? task.startTime;
    if (ref && timeToMinutes(ref) < now.minutes) return "late";
  }
  return "upcoming";
}

/** Timed tasks first by start time, untimed last, then by title. */
export function compareTasks(a: Task, b: Task): number {
  const ta = a.startTime ?? "99:99";
  const tb = b.startTime ?? "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.title.localeCompare(b.title, "vi");
}

export function formatTimeRange(task: Pick<Task, "startTime" | "endTime">): string {
  if (!task.startTime) return "";
  return task.endTime ? `${task.startTime}–${task.endTime}` : task.startTime;
}

/** Shared rule: an end time needs a start time and must come after it. */
export function timeProblem(startTime: string | null, endTime: string | null): string | null {
  if (endTime && !startTime) return "Nhập giờ bắt đầu trước khi chọn giờ kết thúc";
  if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) return "Giờ kết thúc phải sau giờ bắt đầu";
  return null;
}

export function percent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}

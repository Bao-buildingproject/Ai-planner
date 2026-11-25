"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import {
  addDays,
  DAY_NAMES,
  DAY_SHORT,
  formatDayMonth,
  formatWeekRange,
  isoWeek,
  mondayOf,
  type Now,
  nowInVietnam,
  weekDays,
} from "@/lib/dates";
import { compareTasks, percent, type Task, type WeekData } from "@/lib/tasks";
import { DayPage } from "./DayPage";
import { EditTaskDialog, type TaskPatch } from "./EditTaskDialog";
import { WeekNotes } from "./WeekNotes";

type ToastInput = { kind: "undo"; message: string; task: Task } | { kind: "info" | "error"; message: string };
type Toast = ToastInput & { id: number };

interface Props {
  initialWeek: WeekData;
  initialSelected: string;
  initialNow: Now;
}

export function WeekApp({ initialWeek, initialSelected, initialNow }: Props) {
  const [week, setWeek] = useState(initialWeek);
  const [selected, setSelected] = useState(initialSelected);
  const [now, setNow] = useState(initialNow);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const request = useRef(0);
  const toastId = useRef(0);

  // Keep "late" marks and "today" current.
  useEffect(() => {
    const id = setInterval(() => setNow(nowInVietnam()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Toasts close on their own: undo after 8 s, others after 6 s.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.kind === "undo" ? 8000 : 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const show = useCallback((t: ToastInput) => setToast({ ...t, id: ++toastId.current }), []);
  const showError = useCallback((error: unknown) => show({ kind: "error", message: errorMessage(error) }), [show]);

  const days = useMemo(() => weekDays(week.weekStart), [week.weekStart]);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of week.tasks) map.set(task.date, [...(map.get(task.date) ?? []), task]);
    return map;
  }, [week.tasks]);
  const done = week.tasks.filter((t) => t.done).length;
  const total = week.tasks.length;
  const pct = percent(done, total);
  const currentMonday = mondayOf(now.date);
  const isCurrentWeek = week.weekStart === currentMonday;

  const inWeek = (date: string, monday: string) => date >= monday && date <= addDays(monday, 6);

  async function goToWeek(monday: string) {
    const id = ++request.current;
    setLoading(true);
    try {
      const { week: next } = await api<{ week: WeekData }>(`/api/weeks/${monday}`);
      if (id !== request.current) return;
      setWeek(next);
      setSelected(monday === currentMonday ? now.date : monday);
      window.history.replaceState(null, "", monday === currentMonday ? "/week" : `/week?d=${monday}`);
    } catch (error) {
      if (id === request.current) showError(error);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  const replaceTask = (task: Task) =>
    setWeek((w) => ({
      ...w,
      tasks: inWeek(task.date, w.weekStart) ? w.tasks.map((t) => (t.id === task.id ? task : t)) : w.tasks.filter((t) => t.id !== task.id),
    }));

  const addLocal = (task: Task) =>
    setWeek((w) => (inWeek(task.date, w.weekStart) && !w.tasks.some((t) => t.id === task.id) ? { ...w, tasks: [...w.tasks, task] } : w));

  // Ticks on one task are sent one after another; a tick superseded by a newer
  // one is skipped, so the server always ends on what the screen shows.
  const desiredDone = useRef(new Map<string, boolean>());
  const tickQueue = useRef(new Map<string, Promise<void>>());

  function toggle(task: Task) {
    const next = !task.done;
    replaceTask({ ...task, done: next });
    desiredDone.current.set(task.id, next);
    const latest = () => desiredDone.current.get(task.id) === next;
    const run = (tickQueue.current.get(task.id) ?? Promise.resolve()).then(async () => {
      if (!latest()) return;
      try {
        const { task: saved } = await api<{ task: Task }>(`/api/tasks/${task.id}`, { method: "PATCH", body: { done: next } });
        if (latest()) replaceTask(saved);
      } catch (error) {
        if (latest()) {
          desiredDone.current.delete(task.id);
          replaceTask(task);
        }
        showError(error);
      }
    });
    tickQueue.current.set(task.id, run);
  }

  async function add(date: string, title: string, startTime: string | null): Promise<boolean> {
    try {
      const { task } = await api<{ task: Task }>("/api/tasks", { method: "POST", body: { date, title, startTime } });
      addLocal(task);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  async function save(task: Task, patch: TaskPatch): Promise<string | null> {
    try {
      const { task: saved } = await api<{ task: Task }>(`/api/tasks/${task.id}`, { method: "PATCH", body: patch });
      replaceTask(saved);
      if (!inWeek(saved.date, week.weekStart)) {
        show({ kind: "info", message: `Đã chuyển “${saved.title}” sang ngày ${formatDayMonth(saved.date)}/${saved.date.slice(0, 4)}.` });
      }
      return null;
    } catch (error) {
      return errorMessage(error);
    }
  }

  async function remove(task: Task) {
    setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== task.id) }));
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      show({ kind: "undo", message: `Đã xóa “${task.title}”.`, task });
    } catch (error) {
      addLocal(task);
      showError(error);
    }
  }

  async function undo(task: Task) {
    setToast(null);
    try {
      const { task: restored } = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: { date: task.date, title: task.title, startTime: task.startTime, endTime: task.endTime, done: task.done },
      });
      addLocal(restored);
      show({ kind: "info", message: `Đã khôi phục “${restored.title}”.` });
    } catch (error) {
      showError(error);
    }
  }

  const previousPct = percent(week.previous.done, week.previous.total);

  const renderDay = (date: string, index: number) => (
    <DayPage
      key={date}
      date={date}
      index={index}
      tasks={byDay.get(date) ?? []}
      now={now}
      selected={date === selected}
      onToggle={toggle}
      onEdit={setEditing}
      onAdd={add}
    />
  );

  return (
    <div className="week" aria-busy={loading}>
      <div className="w-nav">
        <p className="eyebrow">
          Tuần {isoWeek(week.weekStart)} · {addDays(week.weekStart, 3).slice(0, 4)}
        </p>
        <h1 className="w-title">{formatWeekRange(week.weekStart)}</h1>
        <div className="w-nav-buttons">
          <button type="button" className="icon-btn" aria-label="Tuần trước" onClick={() => goToWeek(addDays(week.weekStart, -7))}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost" disabled={isCurrentWeek} onClick={() => goToWeek(currentMonday)}>
            Tuần này
          </button>
          <button type="button" className="icon-btn" aria-label="Tuần sau" onClick={() => goToWeek(addDays(week.weekStart, 7))}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="w-progress" aria-label="Tiến độ tuần">
        <div className="pg-top">
          <span className="pg-percent">
            {pct}
            <small>%</small>
          </span>
          <span className="pg-count">{total ? `${done}/${total} việc đã xong` : "Tuần này chưa có việc nào"}</span>
        </div>
        <div
          className="pg-bar"
          role="progressbar"
          aria-label="Tiến độ tuần"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          data-full={total > 0 && done === total ? "" : undefined}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="pg-compare">
          <History aria-hidden="true" />
          {week.previous.total
            ? `Tuần trước: ${previousPct}% (${week.previous.done}/${week.previous.total} việc)`
            : "Tuần trước chưa có việc nào"}
        </p>
      </section>

      <div className="w-strip" role="group" aria-label="Chọn ngày">
        {days.map((date, i) => {
          const list = [...(byDay.get(date) ?? [])].sort(compareTasks);
          const isToday = date === now.date;
          return (
            <button
              key={date}
              type="button"
              className={`strip-day${isToday ? " today" : ""}`}
              aria-pressed={date === selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${DAY_NAMES[i]} ${formatDayMonth(date)}, ${list.length} việc`}
              onClick={() => setSelected(date)}
            >
              <small>{DAY_SHORT[i]}</small>
              <b>{date.slice(8, 10)}</b>
              <span className="dots" aria-hidden="true">
                {list.slice(0, 5).map((t) => (
                  <i key={t.id} className={t.done ? "on" : undefined} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-days">
        {days.slice(0, 5).map((date, i) => renderDay(date, i))}
        {/* Saturday and Sunday share one cell, as in a paper weekly planner. */}
        <div className="weekend">{days.slice(5).map((date, i) => renderDay(date, i + 5))}</div>
      </div>

      <WeekNotes key={week.weekStart} weekStart={week.weekStart} goal={week.goal} notes={week.notes} />

      {editing && <EditTaskDialog key={editing.id} task={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="toast" data-kind={toast.kind === "error" ? "error" : undefined}>
            <p>{toast.message}</p>
            {toast.kind === "undo" && (
              <button type="button" onClick={() => undo(toast.task)}>
                Hoàn tác
              </button>
            )}
            {toast.kind === "error" && (
              <button type="button" onClick={() => setToast(null)}>
                Đóng
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

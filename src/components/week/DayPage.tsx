"use client";

import { Plus } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { DAY_NAMES, formatDayMonth, type Now } from "@/lib/dates";
import { compareTasks, formatTimeRange, STATUS_LABEL, type Task, type TaskStatus, taskStatus } from "@/lib/tasks";

export interface DayHandlers {
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  /** Resolves true when the task was saved, so the form can clear itself. */
  onAdd: (date: string, title: string, startTime: string | null) => Promise<boolean>;
}

interface DayPageProps extends DayHandlers {
  date: string;
  index: number;
  tasks: Task[];
  now: Now;
  selected: boolean;
}

export function DayPage({ date, index, tasks, now, selected, onToggle, onEdit, onAdd }: DayPageProps) {
  const sorted = [...tasks].sort(compareTasks);
  const done = sorted.filter((t) => t.done).length;
  const isToday = date === now.date;
  const headingId = `day-${date}`;
  return (
    <section
      className="day"
      data-selected={selected || undefined}
      data-today={isToday || undefined}
      aria-labelledby={headingId}
    >
      <header className="day-head">
        <h2 id={headingId}>
          {DAY_NAMES[index]}
          <span className="date">{formatDayMonth(date)}</span>
          {isToday && <span className="today-tag">Hôm nay</span>}
        </h2>
        {sorted.length > 0 && (
          <span className="day-count" aria-label={`${done} trên ${sorted.length} việc đã xong`}>
            {done}/{sorted.length}
          </span>
        )}
      </header>
      {sorted.length > 0 ? (
        <ul className="tasks">
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} status={taskStatus(task, now)} showUpcoming={isToday} onToggle={onToggle} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <p className="day-empty">{isToday ? "Hôm nay chưa có việc nào. Thêm việc đầu tiên ở bên dưới." : "Chưa có việc nào."}</p>
      )}
      <AddTaskForm date={date} dayName={DAY_NAMES[index]!} onAdd={onAdd} />
    </section>
  );
}

function TaskRow({
  task,
  status,
  showUpcoming,
  onToggle,
  onEdit,
}: {
  task: Task;
  status: TaskStatus;
  /** "Sắp tới" only means something today; on other days every open task is upcoming. */
  showUpcoming: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
}) {
  const time = formatTimeRange(task);
  return (
    <li className="task" data-status={status}>
      <button
        type="button"
        className="check"
        aria-pressed={task.done}
        aria-label={`Đã xong: ${task.title}`}
        onClick={() => onToggle(task)}
      >
        <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
          <path className="ck-box" d="M3.4 4.3c4.5-.9 10-1.1 15-.4.6 4.5.5 9.3.1 13.8-4.9.7-10 .6-14.9.1-.6-4.5-.7-9.1-.2-13.5z" />
          <path className="ck-mark" pathLength={1} d="M5.8 11.4c1.5 1.1 2.7 2.4 3.6 4.1 2.1-4.5 5-8.1 8.7-11" />
        </svg>
      </button>
      <button
        type="button"
        className="task-main"
        onClick={() => onEdit(task)}
        aria-label={`Sửa việc: ${task.title}${time ? `, ${time}` : ""}`}
      >
        <span className="task-title">
          <span>{task.title}</span>
        </span>
        {time && <span className="task-time">{time}</span>}
      </button>
      <span className="task-status">{status !== "upcoming" || showUpcoming ? STATUS_LABEL[status] : ""}</span>
    </li>
  );
}

function AddTaskForm({ date, dayName, onAdd }: { date: string; dayName: string; onAdd: DayHandlers["onAdd"] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) {
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    const saved = await onAdd(date, title, String(data.get("start") ?? "") || null);
    setBusy(false);
    if (saved) form.reset();
    titleRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-ghost add-toggle"
        hidden={open}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => titleRef.current?.focus());
        }}
      >
        <Plus aria-hidden="true" />
        Thêm việc
      </button>
      <form className="add" data-open={open || undefined} onSubmit={submit} onKeyDown={onKeyDown} aria-label={`Thêm việc cho ${dayName}`}>
        <input
          ref={titleRef}
          className="input add-title"
          name="title"
          placeholder="Thêm việc…"
          maxLength={200}
          autoComplete="off"
          aria-label={`Tên việc mới, ${dayName}`}
        />
        <input className="input add-time" name="start" type="time" aria-label="Giờ bắt đầu, không bắt buộc" />
        <button className="btn btn-primary add-submit" type="submit" disabled={busy}>
          <Plus aria-hidden="true" />
          Thêm
        </button>
      </form>
    </>
  );
}

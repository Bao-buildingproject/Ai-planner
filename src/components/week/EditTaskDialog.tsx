"use client";

import { AlertCircle, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { type Task, timeProblem } from "@/lib/tasks";

export interface TaskPatch {
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  done: boolean;
}

interface Props {
  task: Task;
  onClose: () => void;
  /** Resolves to an error message, or null when saved. */
  onSave: (task: Task, patch: TaskPatch) => Promise<string | null>;
  onDelete: (task: Task) => void;
}

export function EditTaskDialog({ task, onClose, onSave, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: TaskPatch = {
      title: String(data.get("title") ?? "").trim(),
      date: String(data.get("date") ?? ""),
      startTime: String(data.get("start") ?? "") || null,
      endTime: String(data.get("end") ?? "") || null,
      done: data.get("done") === "on",
    };
    const problem = !patch.title ? "Nhập tên việc" : !patch.date ? "Chọn ngày" : timeProblem(patch.startTime, patch.endTime);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await onSave(task, patch);
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    ref.current?.close();
  }

  return (
    <dialog ref={ref} className="sheet-dialog" aria-labelledby="edit-task-title" onClose={onClose}>
      <form className="dialog-body" onSubmit={submit}>
        <div className="dialog-head">
          <h2 id="edit-task-title">Sửa việc</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={() => ref.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            <AlertCircle aria-hidden="true" />
            {error}
          </p>
        )}
        <div className="field">
          <label className="field-label" htmlFor="edit-title">
            Tên việc
          </label>
          <input id="edit-title" className="input" name="title" defaultValue={task.title} required maxLength={200} autoComplete="off" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="edit-date">
            Ngày
          </label>
          <input id="edit-date" className="input" name="date" type="date" defaultValue={task.date} required />
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="edit-start">
              Bắt đầu
            </label>
            <input id="edit-start" className="input" name="start" type="time" defaultValue={task.startTime ?? ""} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="edit-end">
              Kết thúc
            </label>
            <input id="edit-end" className="input" name="end" type="time" defaultValue={task.endTime ?? ""} />
          </div>
        </div>
        <label className="check-field">
          <input type="checkbox" name="done" defaultChecked={task.done} />
          Đã xong
        </label>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              ref.current?.close();
              onDelete(task);
            }}
          >
            <Trash2 aria-hidden="true" />
            Xóa
          </button>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

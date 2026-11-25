"use client";

import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type SaveState = "idle" | "saving" | "saved" | "error";
type Fields = { goal?: string; notes?: string };

/**
 * Goal and notes for one week. Saves automatically shortly after typing stops,
 * when a field loses focus, when the week changes and when the page is hidden.
 * Mount with key={weekStart} so each week starts fresh.
 */
export function WeekNotes({ weekStart, goal, notes }: { weekStart: string; goal: string; notes: string }) {
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Fields>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const hasPending = () => pending.current.goal !== undefined || pending.current.notes !== undefined;

  const send = useCallback(
    async (keepalive: boolean) => {
      if (!hasPending()) return;
      const body = pending.current;
      pending.current = {};
      try {
        await api(`/api/weeks/${weekStart}`, { method: "PUT", body, keepalive });
        setState(hasPending() ? "saving" : "saved");
      } catch {
        // Keep what failed so the next attempt sends it again.
        pending.current = { ...body, ...pending.current };
        setState("error");
      }
    },
    [weekStart],
  );

  /** Saves one request at a time, so an older text never lands after a newer one. */
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(() => send(false));
    return chain.current;
  }, [send]);

  useEffect(() => {
    const onHide = () => {
      clearTimeout(timer.current);
      void send(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      void flush();
    };
  }, [send, flush]);

  function queue(field: keyof Fields, value: string) {
    pending.current[field] = value;
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }

  return (
    <section className="w-notes" aria-labelledby="notes-title">
      <div className="notes-head">
        <h2 id="notes-title">Mục tiêu và ghi chú</h2>
        <span className="save-state" data-state={state} aria-live="polite">
          {state === "saving" && (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              Đang lưu…
            </>
          )}
          {state === "saved" && (
            <>
              <Check aria-hidden="true" />
              Đã lưu
            </>
          )}
          {state === "error" && (
            <>
              <AlertCircle aria-hidden="true" />
              Chưa lưu được.
              <button type="button" className="link-btn" onClick={() => void flush()}>
                Thử lại
              </button>
            </>
          )}
        </span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="week-goal">
          Mục tiêu tuần
        </label>
        <textarea
          id="week-goal"
          className="input goal"
          rows={2}
          defaultValue={goal}
          maxLength={300}
          placeholder="Tuần này mình muốn đạt được gì?"
          onChange={(e) => queue("goal", e.target.value)}
          onBlur={() => void flush()}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="week-notes">
          Ghi chú
        </label>
        <textarea
          id="week-notes"
          className="input lined"
          defaultValue={notes}
          maxLength={5000}
          placeholder="Ý tưởng, việc cần nhớ, nhận xét cuối tuần…"
          onChange={(e) => queue("notes", e.target.value)}
          onBlur={() => void flush()}
        />
      </div>
    </section>
  );
}

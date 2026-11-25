import { describe, expect, it } from "vitest";
import { BackupFormatError, parseBackup, taskKey } from "./backup";

describe("parseBackup", () => {
  it("reads the old one-file planner format", () => {
    const parsed = parseBackup({
      tasks: {
        "2026-11-23": [
          { id: "a", text: "Lên kế hoạch tuần", time: "08:00", done: true },
          { id: "b", text: "  ", time: "", done: false },
        ],
        "2026-11-24": [{ id: "c", text: "Tập gym", time: "", done: false }],
        "not-a-date": [{ id: "d", text: "x", time: "", done: false }],
      },
      notes: { "2026-11-23": "Tuần này học xong Quantitative" },
    });
    expect(parsed.format).toBe("v1");
    expect(parsed.tasks).toEqual([
      { date: "2026-11-23", title: "Lên kế hoạch tuần", startTime: "08:00", endTime: null, done: true },
      { date: "2026-11-24", title: "Tập gym", startTime: null, endTime: null, done: false },
    ]);
    expect(parsed.skipped).toBe(2);
    expect(parsed.weeks).toEqual([{ weekStart: "2026-11-23", goal: "", notes: "Tuần này học xong Quantitative" }]);
  });

  it("reads this app's own format and drops impossible times", () => {
    const parsed = parseBackup({
      app: "ai-planner",
      version: 2,
      exportedAt: "2026-11-25T00:00:00Z",
      tasks: [
        { date: "2026-11-25", title: "Học CFA", startTime: "19:00", endTime: "21:00", done: false },
        { date: "2026-11-25", title: "Sai giờ", startTime: "19:00", endTime: "18:00", done: false },
        { date: "2026-11-25", title: "Giờ lạ", startTime: "25:00", endTime: null, done: false },
      ],
      weeks: [{ weekStart: "2026-11-25", goal: "Gym 3 buổi", notes: "" }],
    });
    expect(parsed.format).toBe("v2");
    expect(parsed.tasks[1]).toMatchObject({ startTime: "19:00", endTime: null });
    expect(parsed.tasks[2]).toMatchObject({ startTime: null });
    expect(parsed.weeks).toEqual([{ weekStart: "2026-11-23", goal: "Gym 3 buổi", notes: "" }]);
  });

  it("rejects files it does not recognise", () => {
    expect(() => parseBackup([])).toThrow(BackupFormatError);
    expect(() => parseBackup({ hello: 1 })).toThrow(BackupFormatError);
  });

  it("keys tasks by day, start time and title", () => {
    expect(taskKey({ date: "2026-11-25", startTime: null, title: "A" })).toBe("2026-11-25||A");
  });
});

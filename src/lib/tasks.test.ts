import { describe, expect, it } from "vitest";
import { compareTasks, formatTimeRange, percent, type Task, taskStatus, timeProblem } from "./tasks";

const now = { date: "2026-11-25", minutes: 14 * 60 + 30 };
const task = (p: Partial<Task>): Task => ({ id: "x", date: "2026-11-25", title: "Việc", startTime: null, endTime: null, done: false, ...p });

describe("task status", () => {
  it("done wins over everything", () => {
    expect(taskStatus(task({ date: "2026-11-20", done: true }), now)).toBe("done");
  });
  it("past days are late", () => {
    expect(taskStatus(task({ date: "2026-11-24" }), now)).toBe("late");
  });
  it("today is late once its time has passed", () => {
    expect(taskStatus(task({ startTime: "09:30" }), now)).toBe("late");
    expect(taskStatus(task({ startTime: "14:30" }), now)).toBe("upcoming");
    expect(taskStatus(task({ startTime: "17:30" }), now)).toBe("upcoming");
    expect(taskStatus(task({ startTime: "13:00", endTime: "15:00" }), now)).toBe("upcoming");
    expect(taskStatus(task({}), now)).toBe("upcoming");
  });
  it("future days are upcoming", () => {
    expect(taskStatus(task({ date: "2026-11-26", startTime: "01:00" }), now)).toBe("upcoming");
  });
});

describe("helpers", () => {
  it("sorts timed tasks first, by time", () => {
    const list = [task({ id: "c", title: "C" }), task({ id: "b", startTime: "19:00" }), task({ id: "a", startTime: "08:00" })];
    expect(list.sort(compareTasks).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
  it("formats time ranges", () => {
    expect(formatTimeRange({ startTime: "19:00", endTime: "21:00" })).toBe("19:00–21:00");
    expect(formatTimeRange({ startTime: "19:00", endTime: null })).toBe("19:00");
    expect(formatTimeRange({ startTime: null, endTime: null })).toBe("");
  });
  it("rounds percentages and handles empty weeks", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
  it("checks start and end times", () => {
    expect(timeProblem("09:00", "10:00")).toBeNull();
    expect(timeProblem(null, "10:00")).toMatch(/giờ bắt đầu/);
    expect(timeProblem("10:00", "10:00")).toMatch(/sau giờ bắt đầu/);
  });
});

import { describe, expect, it } from "vitest";
import { addDays, formatWeekRange, isoWeek, isValidDateStr, mondayOf, nowInVietnam, weekDays, weekdayIndex } from "./dates";

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isValidDateStr("2026-11-25")).toBe(true);
    expect(isValidDateStr("2028-02-29")).toBe(true);
    expect(isValidDateStr("2026-02-29")).toBe(false);
    expect(isValidDateStr("2026-13-01")).toBe(false);
    expect(isValidDateStr("25/11/2026")).toBe(false);
  });

  it("weeks start on Monday", () => {
    expect(weekdayIndex("2026-11-23")).toBe(0);
    expect(weekdayIndex("2026-11-29")).toBe(6);
    expect(mondayOf("2026-11-25")).toBe("2026-11-23");
    expect(mondayOf("2026-11-29")).toBe("2026-11-23");
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(weekDays("2026-11-23")).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("numbers weeks the ISO way", () => {
    expect(isoWeek("2026-11-25")).toBe(48);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2025-12-29")).toBe(1);
    expect(isoWeek("2027-01-03")).toBe(53);
    expect(isoWeek("2027-01-04")).toBe(1);
  });

  it("formats a week range, with both years over New Year", () => {
    expect(formatWeekRange("2026-11-23")).toBe("23/11 – 29/11/2026");
    expect(formatWeekRange("2025-12-29")).toBe("29/12/2025 – 04/01/2026");
  });

  it("reads Vietnam time (UTC+7)", () => {
    expect(nowInVietnam(new Date("2026-11-24T17:30:00Z"))).toEqual({ date: "2026-11-25", minutes: 30 });
    expect(nowInVietnam(new Date("2026-11-25T07:30:00Z"))).toEqual({ date: "2026-11-25", minutes: 14 * 60 + 30 });
  });
});

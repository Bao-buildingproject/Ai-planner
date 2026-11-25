/**
 * Calendar helpers. Dates are plain "YYYY-MM-DD" strings (calendar days, no
 * time zone); arithmetic runs in UTC so it never shifts by a day. Weeks start
 * on Monday. "Now" is Vietnam time (UTC+7, no daylight saving).
 */

export const DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"] as const;
export const DAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;

export function isValidDateStr(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return y >= 1970 && y <= 2200 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const isValidTimeStr = (value: string): boolean => TIME_RE.test(value);

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function toUtc(value: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

const fromUtc = (d: Date): string => d.toISOString().slice(0, 10);

export function addDays(value: string, days: number): string {
  return fromUtc(new Date(toUtc(value).getTime() + days * DAY_MS));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(value: string): number {
  return (toUtc(value).getUTCDay() + 6) % 7;
}

export function mondayOf(value: string): string {
  return addDays(value, -weekdayIndex(value));
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** ISO-8601 week number (the week that holds the date's Thursday). */
export function isoWeek(value: string): number {
  const thursday = addDays(value, 3 - weekdayIndex(value));
  const week1Monday = mondayOf(`${thursday.slice(0, 4)}-01-04`);
  return Math.floor((toUtc(thursday).getTime() - toUtc(week1Monday).getTime()) / (7 * DAY_MS)) + 1;
}

/** "25/11" */
export const formatDayMonth = (value: string): string => `${value.slice(8, 10)}/${value.slice(5, 7)}`;

/** "23/11 – 29/11/2026", or with both years when the week spans New Year. */
export function formatWeekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const start = sameYear ? formatDayMonth(monday) : `${formatDayMonth(monday)}/${monday.slice(0, 4)}`;
  return `${start} – ${formatDayMonth(sunday)}/${sunday.slice(0, 4)}`;
}

export interface Now {
  date: string;
  minutes: number;
}

export function nowInVietnam(at: Date = new Date()): Now {
  const v = new Date(at.getTime() + VN_OFFSET_MS);
  return { date: v.toISOString().slice(0, 10), minutes: v.getUTCHours() * 60 + v.getUTCMinutes() };
}

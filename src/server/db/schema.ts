import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const TIME_RE = "^([01][0-9]|2[0-3]):[0-5][0-9]$";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    theme: varchar("theme", { length: 10 }).notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("users_theme_check", sql`${t.theme} in ('system', 'light', 'dark')`)],
);

/** Only the SHA-256 of the session token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),
    /** null = not done yet. */
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_user_date_idx").on(t.userId, t.date),
    check("tasks_start_time_check", sql`${t.startTime} is null or ${t.startTime} ~ ${sql.raw(`'${TIME_RE}'`)}`),
    check("tasks_end_time_check", sql`${t.endTime} is null or (${t.startTime} is not null and ${t.endTime} ~ ${sql.raw(`'${TIME_RE}'`)} and ${t.endTime} > ${t.startTime})`),
  ],
);

/** Goal and notes for one week, keyed by its Monday. */
export const weekNotes = pgTable(
  "week_notes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    goal: varchar("goal", { length: 300 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] })],
);

export type TaskRow = typeof tasks.$inferSelect;

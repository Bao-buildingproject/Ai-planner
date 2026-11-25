import { z } from "zod";
import { isValidDateStr, isValidTimeStr } from "./dates";
import { timeProblem } from "./tasks";

export { timeProblem };

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}

export const dateSchema = z.string().refine(isValidDateStr, "Ngày không hợp lệ");
export const timeSchema = z.string().refine(isValidTimeStr, "Giờ không hợp lệ (HH:MM)");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email quá dài")
  .pipe(z.email("Email không hợp lệ"));

export const passwordSchema = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(200, "Mật khẩu tối đa 200 ký tự");

const nameSchema = z.string().trim().min(1, "Nhập tên của bạn").max(80, "Tên tối đa 80 ký tự");

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  inviteCode: z.string().trim().max(200).default(""),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Nhập mật khẩu").max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại").max(200),
  newPassword: passwordSchema,
});

export const themeSchema = z.enum(["system", "light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

export const profileSchema = z
  .object({ name: nameSchema.optional(), theme: themeSchema.optional() })
  .refine((v) => v.name !== undefined || v.theme !== undefined, "Không có thay đổi nào để lưu");

export const titleSchema = z.string().trim().min(1, "Nhập tên việc").max(200, "Tên việc tối đa 200 ký tự");

export const createTaskSchema = z
  .object({
    date: dateSchema,
    title: titleSchema,
    startTime: timeSchema.nullable().default(null),
    endTime: timeSchema.nullable().default(null),
    /** Used when a deleted task is restored with "Hoàn tác". */
    done: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const problem = timeProblem(v.startTime, v.endTime);
    if (problem) ctx.addIssue({ code: "custom", path: ["endTime"], message: problem });
  });

export const updateTaskSchema = z
  .object({
    date: dateSchema.optional(),
    title: titleSchema.optional(),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Không có thay đổi nào để lưu");

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const weekNotesSchema = z
  .object({
    goal: z.string().max(300, "Mục tiêu tối đa 300 ký tự").optional(),
    notes: z.string().max(5000, "Ghi chú tối đa 5000 ký tự").optional(),
  })
  .refine((v) => v.goal !== undefined || v.notes !== undefined, "Không có thay đổi nào để lưu");

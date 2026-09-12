import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  project_id: z.string().min(1, "Project ID is required"),
  laborer_id: z.string().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  action: z.enum(["check_in", "check_out"]),
});

export const ReviewAttendanceSchema = z.object({
  attendanceId: z.string().min(1, "Attendance ID is required"),
  contractorId: z.string().optional(),
  status: z.enum(["Approved", "Rejected"]),
});

export const AttendanceQuerySchema = z.object({
  projectId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

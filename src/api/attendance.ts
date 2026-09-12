import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

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

export const attendanceApi = {
  async markAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
    try {
      const parsed = MarkAttendanceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });

      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getPendingAttendance(params?: z.infer<typeof AttendanceQuerySchema> | string) {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === "string") {
        searchParams.set("projectId", params);
      } else if (params) {
        const parsed = AttendanceQuerySchema.safeParse(params);
        const valid = parsed.success ? parsed.data : params;
        if (valid.projectId) searchParams.set("projectId", valid.projectId);
        if (valid.limit) searchParams.set("limit", String(valid.limit));
        if (valid.offset !== undefined) searchParams.set("offset", String(valid.offset));
      }

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const json = await apiFetch(`/api/attendance${qs}`);
      const data = json.data?.items || json.data;
      return { data, pagination: json.data?.pagination || null, error: null };
    } catch (error) {
      return { data: null, pagination: null, error };
    }
  },

  async reviewAttendance(
    attendanceId: string,
    contractorId: string,
    status: "Approved" | "Rejected",
  ) {
    try {
      const parsed = ReviewAttendanceSchema.safeParse({ attendanceId, contractorId, status });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch("/api/attendance", {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });

      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getLaborerAttendanceHistory(params?: z.infer<typeof AttendanceQuerySchema> | string) {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === "object" && params) {
        const parsed = AttendanceQuerySchema.safeParse(params);
        const valid = parsed.success ? parsed.data : params;
        if (valid.projectId) searchParams.set("projectId", valid.projectId);
        if (valid.limit) searchParams.set("limit", String(valid.limit));
        if (valid.offset !== undefined) searchParams.set("offset", String(valid.offset));
      }

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const json = await apiFetch(`/api/attendance${qs}`);
      const data = json.data?.items || json.data;
      return { data, pagination: json.data?.pagination || null, error: null };
    } catch (error) {
      return { data: null, pagination: null, error };
    }
  },
};

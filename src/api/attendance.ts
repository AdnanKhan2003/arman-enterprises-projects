import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const MarkAttendanceSchema = z.object({
  project_id: z.string(),
  laborer_id: z.string().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  action: z.enum(["check_in", "check_out"]),
});

export const ReviewAttendanceSchema = z.object({
  attendanceId: z.string(),
  contractorId: z.string().optional(),
  status: z.enum(["Approved", "Rejected"]),
});

export const attendanceApi = {
  async markAttendance(data: {
    project_id: string;
    laborer_id?: string;
    work_date: string;
    action: "check_in" | "check_out";
  }) {
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

  async getPendingAttendance(params?: { projectId?: string; limit?: number; offset?: number } | string) {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === "string") {
        searchParams.set("projectId", params);
      } else if (params) {
        if (params.projectId) searchParams.set("projectId", params.projectId);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));
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

  async getLaborerAttendanceHistory(params?: { laborerId?: string; projectId?: string; limit?: number; offset?: number } | string) {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === "object" && params) {
        if (params.projectId) searchParams.set("projectId", params.projectId);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));
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

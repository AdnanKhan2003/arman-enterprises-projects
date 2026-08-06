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
  /**
   * Mark daily attendance (Laborer action)
   */
  async markAttendance(data: {
    project_id: string;
    laborer_id?: string;
    work_date: string; // Format: YYYY-MM-DD
    action: "check_in" | "check_out";
  }) {
    try {
      const parsed = MarkAttendanceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(parsed.data)
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch all pending attendance for all projects (Contractor action)
   */
  async getPendingAttendance() {
    try {
      const json = await apiFetch(`/api/attendance`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Approve or reject an attendance record (Contractor action)
   */
  async reviewAttendance(
    attendanceId: string,
    contractorId: string,
    status: "Approved" | "Rejected",
  ) {
    try {
      const parsed = ReviewAttendanceSchema.safeParse({ attendanceId, contractorId, status });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/attendance', {
        method: 'PATCH',
        body: JSON.stringify(parsed.data)
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch a laborer's attendance history (Laborer action)
   */
  async getLaborerAttendanceHistory(laborerId: string) {
    try {
      const json = await apiFetch('/api/attendance');
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

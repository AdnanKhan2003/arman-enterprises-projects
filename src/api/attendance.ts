// File: src/api/attendance.ts
import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  laborer_id: z.string().uuid("Invalid laborer ID").optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  status: z.enum(["Present", "Absent", "Half-day"]),
});

export const ReviewAttendanceSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance ID"),
  contractorId: z.string().uuid("Invalid contractor ID").optional(),
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
    status: "Present" | "Absent" | "Half-day";
  }) {
    try {
      const parsed = MarkAttendanceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      
      if (!response.ok) throw new Error("Failed to mark attendance");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch all pending attendance for a specific project (Contractor action)
   */
  async getPendingAttendance(projectId: string) {
    try {
      const response = await fetch(`/api/attendance?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch pending attendance");
      const result = await response.json();
      return { data: result.data, error: null };
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

      const response = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      
      if (!response.ok) throw new Error("Failed to review attendance");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch a laborer's attendance history (Laborer action)
   */
  async getLaborerAttendanceHistory(laborerId: string) {
    try {
      const response = await fetch('/api/attendance');
      if (!response.ok) throw new Error("Failed to fetch attendance history");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

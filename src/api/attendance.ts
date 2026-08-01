// File: src/api/attendance.ts
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  laborer_id: z.string().uuid("Invalid laborer ID"),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  status: z.enum(["Present", "Absent", "Half-day"]),
});

export const ReviewAttendanceSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance ID"),
  contractorId: z.string().uuid("Invalid contractor ID"),
  status: z.enum(["Approved", "Rejected"]),
});

export const attendanceApi = {
  /**
   * Mark daily attendance (Laborer action)
   */
  async markAttendance(data: {
    project_id: string;
    laborer_id: string;
    work_date: string; // Format: YYYY-MM-DD
    status: "Present" | "Absent" | "Half-day";
  }) {
    const parsed = MarkAttendanceSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    return await supabase
      .from("attendance")
      .insert({
        ...parsed.data,
        approval_status: "Pending",
      })
      .select()
      .single();
  },

  /**
   * Fetch all pending attendance for a specific project (Contractor action)
   */
  async getPendingAttendance(projectId: string) {
    return await supabase
      .from("attendance")
      .select(
        `
        *,
        laborer:users!attendance_laborer_id_fkey (name, phone)
      `,
      )
      .eq("project_id", projectId)
      .eq("approval_status", "Pending");
  },

  /**
   * Approve or reject an attendance record (Contractor action)
   */
  async reviewAttendance(
    attendanceId: string,
    contractorId: string,
    status: "Approved" | "Rejected",
  ) {
    const parsed = ReviewAttendanceSchema.safeParse({ attendanceId, contractorId, status });
    if (!parsed.success) throw parsed.error;

    return await supabase
      .from("attendance")
      .update({
        approval_status: parsed.data.status,
        reviewed_by: parsed.data.contractorId,
      })
      .eq("id", parsed.data.attendanceId)
      .select()
      .single();
  },

  /**
   * Fetch a laborer's attendance history (Laborer action)
   */
  async getLaborerAttendanceHistory(laborerId: string) {
    return await supabase
      .from("attendance")
      .select(
        `
        *,
        project:projects (name)
      `,
      )
      .eq("laborer_id", laborerId)
      .order("work_date", { ascending: false });
  },
};

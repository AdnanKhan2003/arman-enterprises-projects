// File: src/api/attendance.ts
import { supabase } from "../lib/supabase";

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
    return await supabase
      .from("attendance")
      .insert({
        ...data,
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
    return await supabase
      .from("attendance")
      .update({
        approval_status: status,
        reviewed_by: contractorId,
      })
      .eq("id", attendanceId)
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

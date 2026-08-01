// File: src/api/projects.ts
import { supabase } from "../lib/supabase";

export const projectsApi = {
  /**
   * Fetch projects based on user role
   */
  async getProjects(role: "contractor" | "laborer", userId: string) {
    if (role === "contractor") {
      // Contractors see projects they created
      return await supabase
        .from("projects")
        .select(
          `
          *,
          client:clients (name, phone)
        `,
        )
        .eq("contractor_id", userId);
    } else {
      // Laborers only see projects they are assigned to via the join table
      return await supabase
        .from("project_assignments")
        .select(
          `
          projects (
            *, 
            client:clients (name, phone)
          )
        `,
        )
        .eq("laborer_id", userId);
    }
  },

  /**
   * Fetch details for a specific project
   */
  async getProjectDetails(projectId: string) {
    return await supabase
      .from("projects")
      .select(
        `
        *,
        client:clients (*)
      `,
      )
      .eq("id", projectId)
      .single();
  },

  /**
   * Create a new project (Contractors only)
   */
  async createProject(projectData: {
    contractor_id: string;
    client_id?: string;
    name: string;
    description?: string;
  }) {
    return await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();
  },

  /**
   * Assign a laborer to a project (Contractors only)
   */
  async assignLaborerToProject(projectId: string, laborerId: string) {
    return await supabase
      .from("project_assignments")
      .insert({ project_id: projectId, laborer_id: laborerId });
  },
};

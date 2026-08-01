// File: src/api/projects.ts
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const CreateProjectSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID"),
  client_id: z.string().uuid("Invalid client ID").optional(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

export const AssignLaborerSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  laborerId: z.string().uuid("Invalid laborer ID"),
});

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
    const parsed = CreateProjectSchema.safeParse(projectData);
    if (!parsed.success) throw parsed.error;

    return await supabase
      .from("projects")
      .insert(parsed.data)
      .select()
      .single();
  },

  /**
   * Assign a laborer to a project (Contractors only)
   */
  async assignLaborerToProject(projectId: string, laborerId: string) {
    const parsed = AssignLaborerSchema.safeParse({ projectId, laborerId });
    if (!parsed.success) throw parsed.error;

    return await supabase
      .from("project_assignments")
      .insert({ project_id: parsed.data.projectId, laborer_id: parsed.data.laborerId });
  },
};

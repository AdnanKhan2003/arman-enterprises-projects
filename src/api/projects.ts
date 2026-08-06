import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateProjectSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID").optional(),
  client_id: z.string().uuid("Invalid client ID").optional(),
  name: z.string().min(1, "Project name is required"),
  location: z.string().optional(),
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
    try {
      const json = await apiFetch('/api/projects');
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch details for a specific project
   */
  async getProjectDetails(projectId: string) {
    try {
      const json = await apiFetch(`/api/projects/${projectId}`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Create a new project (Contractors only)
   */
  async createProject(projectData: {
    contractor_id: string;
    client_id?: string;
    name: string;
    location?: string;
    description?: string;
  }) {
    try {
      const parsed = CreateProjectSchema.safeParse(projectData);
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          contractor_id: parsed.data.contractor_id,
          client_id: parsed.data.client_id,
          name: parsed.data.name,
          location: parsed.data.location,
          description: parsed.data.description,
        })
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Assign a laborer to a project (Contractors only)
   */
  async assignLaborerToProject(projectId: string, laborerId: string) {
    try {
      const parsed = AssignLaborerSchema.safeParse({ projectId, laborerId });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects/assign', {
        method: 'POST',
        body: JSON.stringify(parsed.data)
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

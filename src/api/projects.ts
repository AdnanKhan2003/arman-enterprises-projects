// File: src/api/projects.ts
import { z } from "zod";

export const CreateProjectSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID").optional(),
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
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error("Failed to fetch projects");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch details for a specific project
   */
  async getProjectDetails(projectId: string) {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project details");
      const result = await response.json();
      return { data: result.data, error: null };
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
    description?: string;
  }) {
    try {
      const parsed = CreateProjectSchema.safeParse(projectData);
      if (!parsed.success) throw parsed.error;

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      
      if (!response.ok) throw new Error("Failed to create project");
      const result = await response.json();
      
      return { data: result.data, error: null };
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

      const response = await fetch('/api/projects/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      
      if (!response.ok) throw new Error("Failed to assign laborer");
      const result = await response.json();
      
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateProjectSchema = z.object({
  contractor_id: z.string().optional(),
  client_id: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  laborer_ids: z.array(z.string()).optional(),
});

export const AssignLaborerSchema = z.object({
  projectId: z.string(),
  laborerId: z.string(),
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
    laborer_ids?: string[];
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
          laborer_ids: parsed.data.laborer_ids,
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
  },

  /**
   * Update a project's details
   */
  async updateProject(id: string, data: { name?: string; location?: string; description?: string; client_id?: string; laborer_ids?: string[]; status?: string }) {
    try {
      const json = await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...data })
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Mark a project completed or reopen it. Preferred over deleting: it keeps the
   * timesheet and money history intact.
   */
  async setProjectStatus(id: string, status: "active" | "completed") {
    try {
      const json = await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id, status })
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete a project and all its associated records
   */
  async deleteProject(id: string) {
    try {
      const json = await apiFetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
      });
      return { data: json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

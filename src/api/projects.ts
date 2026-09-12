import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateProjectSchema = z.object({
  contractor_id: z.string().optional(),
  client_id: z.string().nullable().optional(),
  name: z.string().trim().min(1, "Project name is required"),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
  laborer_ids: z.array(z.string()).optional(),
});

export const UpdateProjectSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
  name: z.string().trim().min(1, "Project name cannot be empty").optional(),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
  client_id: z.string().nullable().optional(),
  laborer_ids: z.array(z.string()).optional(),
  status: z.enum(["active", "completed"]).optional(),
});

export const AssignLaborerSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  laborerId: z.string().min(1, "Laborer ID is required"),
});

export const DeleteProjectSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
});

export const projectsApi = {
  async getProjects(role: "contractor" | "laborer", userId: string) {
    try {
      const json = await apiFetch('/api/projects');
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getProjectDetails(projectId: string) {
    try {
      const json = await apiFetch(`/api/projects/${projectId}`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createProject(projectData: z.infer<typeof CreateProjectSchema>) {
    try {
      const parsed = CreateProjectSchema.safeParse(projectData);
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async assignLaborerToProject(projectId: string, laborerId: string) {
    try {
      const parsed = AssignLaborerSchema.safeParse({ projectId, laborerId });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects/assign', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateProject(id: string, data: Partial<z.infer<typeof UpdateProjectSchema>>) {
    try {
      const parsed = UpdateProjectSchema.safeParse({ id, ...data });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async setProjectStatus(id: string, status: "active" | "completed") {
    try {
      const parsed = UpdateProjectSchema.safeParse({ id, status });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteProject(id: string) {
    try {
      const parsed = DeleteProjectSchema.safeParse({ id });
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch(`/api/projects?id=${parsed.data.id}`, {
        method: 'DELETE',
      });
      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

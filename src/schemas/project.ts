import { z } from "zod";

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

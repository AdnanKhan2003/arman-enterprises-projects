import { z } from "zod";

export const CreateLaborerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const UpdateLaborerSchema = z.object({
  id: z.string().trim().min(1, "Laborer ID is required"),
  name: z.string().trim().min(1, "Name is required"),
});

export const DeleteLaborerSchema = z.object({
  id: z.string().trim().min(1, "Laborer ID is required"),
});

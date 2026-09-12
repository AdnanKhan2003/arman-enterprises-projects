import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

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

export const laborerApi = {
  async getLaborers() {
    const res = await apiFetch("/api/contractors/laborers", {
      method: "GET",
    });
    return res.data || res;
  },

  async createLaborer(data: z.infer<typeof CreateLaborerSchema>) {
    const parsed = CreateLaborerSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const res = await apiFetch("/api/contractors/laborers", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    return res.data || res;
  },

  async updateLaborerName(id: string, name: string) {
    const parsed = UpdateLaborerSchema.safeParse({ id, name });
    if (!parsed.success) throw parsed.error;

    const res = await apiFetch("/api/contractors/laborers", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    return res.data || res;
  },

  async deleteLaborer(id: string) {
    const parsed = DeleteLaborerSchema.safeParse({ id });
    if (!parsed.success) throw parsed.error;

    const res = await apiFetch(`/api/contractors/laborers?id=${parsed.data.id}`, {
      method: "DELETE",
    });
    return res.data || res;
  },
};

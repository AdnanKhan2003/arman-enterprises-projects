import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateLaborerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const laborerApi = {
  /**
   * Get all laborers in the system
   */
  async getLaborers() {
    const res = await apiFetch('/api/contractors/laborers', {
      method: 'GET',
    });
    return res;
  },

  /**
   * Create a new laborer account (without altering current session)
   */
  async createLaborer(data: z.infer<typeof CreateLaborerSchema>) {
    const parsed = CreateLaborerSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const res = await apiFetch('/api/contractors/laborers', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });

    return res;
  },

  /**
   * Update a laborer's name
   */
  async updateLaborerName(id: string, name: string) {
    if (!name.trim()) throw new Error("Name cannot be empty");

    const res = await apiFetch('/api/contractors/laborers', {
      method: 'PATCH',
      body: JSON.stringify({ id, name }),
    });
    return res;
  },

  /**
   * Delete a laborer and all their associated records
   */
  async deleteLaborer(id: string) {
    const res = await apiFetch(`/api/contractors/laborers?id=${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};

import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export type PartyType = "contractor" | "laborer" | "client" | "vendor";

export const LogPaymentSchema = z.object({
  direction: z.enum(["paid", "received"]),
  counterparty_type: z.enum(["contractor", "laborer", "client", "vendor"]),
  counterparty_id: z.string().min(1, "Select who this is with"),
  counterparty_name: z.string().min(1),
  amount: z
    .string()
    .or(z.number())
    .transform((v) => String(v)),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
  description: z.string().optional(),
  project_id: z.string().optional(),
});

export const paymentsApi = {
  async getPayments(params?: { limit?: number; offset?: number; projectId?: string }) {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.projectId) searchParams.set("projectId", params.projectId);

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const json = await apiFetch(`/api/payments${qs}`);
      const data = json.data?.items || json.data;
      return { data, pagination: json.data?.pagination || null, error: null };
    } catch (error) {
      return { data: null, pagination: null, error };
    }
  },

  async getParties() {
    try {
      const json = await apiFetch(`/api/payments/parties`);
      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async logPayment(data: z.infer<typeof LogPaymentSchema>) {
    try {
      const parsed = LogPaymentSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

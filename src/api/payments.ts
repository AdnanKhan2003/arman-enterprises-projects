import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export type PartyType = "contractor" | "laborer" | "client" | "vendor";

export const LogPaymentSchema = z.object({
  direction: z.enum(["paid", "received"]),
  counterparty_type: z.enum(["contractor", "laborer", "client", "vendor"]),
  counterparty_id: z.string().min(1, "Select who this is with"),
  counterparty_name: z.string().trim().min(1, "Counterparty name is required"),
  amount: z
    .coerce
    .number()
    .positive("Amount must be greater than 0")
    .transform((n) => n.toFixed(2)),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
  description: z.string().trim().optional(),
  project_id: z.string().nullable().optional(),
});

export const PaymentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  projectId: z.string().optional(),
  direction: z.enum(["paid", "received"]).optional(),
});

export const paymentsApi = {
  async getPayments(params?: z.infer<typeof PaymentsQuerySchema>) {
    try {
      const parsedParams = params ? PaymentsQuerySchema.safeParse(params) : null;
      const valid = parsedParams?.success ? parsedParams.data : params;

      const searchParams = new URLSearchParams();
      if (valid?.limit) searchParams.set("limit", String(valid.limit));
      if (valid?.offset !== undefined) searchParams.set("offset", String(valid.offset));
      if (valid?.projectId) searchParams.set("projectId", valid.projectId);
      if (valid?.direction) searchParams.set("direction", valid.direction);

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

  async logPayment(data: z.input<typeof LogPaymentSchema>) {
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

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
  /**
   * List payments the current user is involved in (as payer or payee).
   */
  async getPayments() {
    try {
      const json = await apiFetch(`/api/payments`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get the counterparties the current user may pick when logging a payment.
   * Contractor -> { laborers, clients, vendors }
   * Laborer    -> { contractors, clients, vendors }
   */
  async getParties() {
    try {
      const json = await apiFetch(`/api/payments/parties`);
      return { data: json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Log a payment. The current user is the implicit self-side; the server
   * places them on from/to based on direction.
   */
  async logPayment(data: z.infer<typeof LogPaymentSchema>) {
    try {
      const parsed = LogPaymentSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

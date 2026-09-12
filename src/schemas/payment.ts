import { z } from "zod";

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

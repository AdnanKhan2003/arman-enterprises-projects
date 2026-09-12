import { z } from "zod";

export const LedgerInvoiceItemSchema = z.object({
  type: z.enum(["Income", "Expense"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
  entity: z.string().trim().min(1, "Entity is required"),
  description: z.string().trim().default(""),
  amount: z
    .coerce
    .number()
    .positive("Amount must be greater than 0")
    .transform((n) => n.toFixed(2)),
});

export const CreateLedgerInvoiceSchema = z.object({
  title: z.string().trim().optional(),
  project_id: z.string().nullable().optional(),
  scope: z.enum(["Income", "Expense", "Both"]),
  format: z.enum(["pdf", "excel"]),
  items: z.array(LedgerInvoiceItemSchema).min(1, "At least one item is required"),
});

export const UpdateLedgerInvoiceSchema = z.object({
  id: z.string().trim().min(1, "Invoice ID is required"),
  title: z.string().trim().optional(),
  project_id: z.string().nullable().optional(),
  scope: z.enum(["Income", "Expense", "Both"]).optional(),
  format: z.enum(["pdf", "excel"]).optional(),
  items: z.array(LedgerInvoiceItemSchema).min(1, "At least one item is required").optional(),
});

export const DeleteLedgerInvoiceSchema = z.object({
  id: z.string().trim().min(1, "Invoice ID is required"),
});

export const LedgerInvoiceQuerySchema = z.object({
  projectId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export type LedgerInvoiceItem = z.infer<typeof LedgerInvoiceItemSchema>;

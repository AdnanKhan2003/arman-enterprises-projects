import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

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

export const ledgerInvoicesApi = {
  async getLedgerInvoices(params?: z.infer<typeof LedgerInvoiceQuerySchema> | string) {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === "string") {
        searchParams.set("projectId", params);
      } else if (params) {
        const parsed = LedgerInvoiceQuerySchema.safeParse(params);
        const valid = parsed.success ? parsed.data : params;
        if (valid.projectId) searchParams.set("projectId", valid.projectId);
        if (valid.limit) searchParams.set("limit", String(valid.limit));
        if (valid.offset !== undefined) searchParams.set("offset", String(valid.offset));
      }

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const json = await apiFetch(`/api/ledger-invoices${qs}`);
      const data = json.data?.items || json.data;
      return { data, pagination: json.data?.pagination || null, error: null };
    } catch (error) {
      return { data: null, pagination: null, error };
    }
  },

  async createLedgerInvoice(data: z.input<typeof CreateLedgerInvoiceSchema>) {
    try {
      const parsed = CreateLedgerInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/ledger-invoices", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateLedgerInvoice(data: z.input<typeof UpdateLedgerInvoiceSchema>) {
    try {
      const parsed = UpdateLedgerInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/ledger-invoices", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data || json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteLedgerInvoice(id: string) {
    try {
      const parsed = DeleteLedgerInvoiceSchema.safeParse({ id });
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch(`/api/ledger-invoices?id=${parsed.data.id}`, { method: "DELETE" });
      return { success: true, data: json.data || json, error: null };
    } catch (error) {
      return { success: false, data: null, error };
    }
  },
};

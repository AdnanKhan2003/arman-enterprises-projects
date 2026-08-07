import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const LedgerInvoiceItemSchema = z.object({
  type: z.enum(["Income", "Expense"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
  entity: z.string(),
  description: z.string(),
  amount: z.string(),
});

export const CreateLedgerInvoiceSchema = z.object({
  title: z.string().optional(),
  scope: z.enum(["Income", "Expense", "Both"]),
  format: z.enum(["pdf", "excel"]),
  items: z.array(LedgerInvoiceItemSchema),
});

export const UpdateLedgerInvoiceSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  scope: z.enum(["Income", "Expense", "Both"]).optional(),
  format: z.enum(["pdf", "excel"]).optional(),
  items: z.array(LedgerInvoiceItemSchema).optional(),
});

export type LedgerInvoiceItem = z.infer<typeof LedgerInvoiceItemSchema>;

export const ledgerInvoicesApi = {
  async getLedgerInvoices() {
    try {
      const json = await apiFetch(`/api/ledger-invoices`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createLedgerInvoice(data: z.infer<typeof CreateLedgerInvoiceSchema>) {
    try {
      const parsed = CreateLedgerInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/ledger-invoices", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateLedgerInvoice(data: z.infer<typeof UpdateLedgerInvoiceSchema>) {
    try {
      const parsed = UpdateLedgerInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      const json = await apiFetch("/api/ledger-invoices", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteLedgerInvoice(id: string) {
    try {
      await apiFetch(`/api/ledger-invoices?id=${id}`, { method: "DELETE" });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },
};

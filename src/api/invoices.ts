import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateInvoiceSchema = z.object({
  type: z.enum(["Expense", "Income", "General"]),
  amount: z.string().or(z.number()).transform(val => String(val)),
  description: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  project_id: z.string().optional(),
  client_id: z.string().optional(),
  third_party_name: z.string().optional(),
});

export const invoicesApi = {
  /**
   * Fetch all invoices for the current contractor
   */
  async getInvoices() {
    try {
      const json = await apiFetch(`/api/invoices`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Create a new invoice/ledger entry
   */
  async createInvoice(data: z.infer<typeof CreateInvoiceSchema>) {
    try {
      const parsed = CreateInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const json = await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(parsed.data)
      });
      
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete an invoice
   */
  async deleteInvoice(id: string) {
    try {
      const json = await apiFetch(`/api/invoices?id=${id}`, {
        method: 'DELETE',
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }
};

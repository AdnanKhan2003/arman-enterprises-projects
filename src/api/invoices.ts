// File: src/api/invoices.ts
import { z } from "zod";

export const CreateInvoiceSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  type: z.enum(["Expense", "Income", "General"]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const invoicesApi = {
  /**
   * Create a new invoice (Contractor action)
   */
  async createInvoice(data: {
    project_id: string;
    type: "Expense" | "Income" | "General";
    amount: number;
    description?: string;
    issue_date: string;
  }) {
    try {
      const parsed = CreateInvoiceSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parsed.data.project_id,
          type: parsed.data.type,
          amount: parsed.data.amount,
          description: parsed.data.description,
          issueDate: parsed.data.issue_date,
        })
      });
      
      if (!response.ok) throw new Error("Failed to create invoice");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch all invoices for a project
   */
  async getProjectInvoices(projectId: string) {
    try {
      const response = await fetch(`/api/invoices?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project invoices");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Calculate Financial Summary (Total Income, Total Expenses, Total Paid, Profit)
   */
  async getProjectFinancialSummary(projectId: string) {
    try {
      const response = await fetch(`/api/invoices?projectId=${projectId}&summary=true`);
      if (!response.ok) throw new Error("Failed to fetch project financial summary");
      const result = await response.json();
      
      return result.data; 
    } catch (error) {
      return {
        totalIncome: 0,
        totalInvoicedExpenses: 0,
        totalPaidOut: 0,
        totalExpenses: 0,
        profitOrLoss: 0,
        isProfitable: true,
      };
    }
  }
};

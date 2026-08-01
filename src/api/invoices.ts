// File: src/api/invoices.ts
import { supabase } from "../lib/supabase";
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
    const parsed = CreateInvoiceSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    return await supabase.from("invoices").insert(parsed.data).select().single();
  },

  /**
   * Fetch all invoices for a project
   */
  async getProjectInvoices(projectId: string) {
    return await supabase
      .from("invoices")
      .select("*")
      .eq("project_id", projectId)
      .order("issue_date", { ascending: false });
  },

  /**
   * Calculate Financial Summary (Total Income, Total Expenses, Total Paid, Profit)
   */
  async getProjectFinancialSummary(projectId: string) {
    // 1. Fetch Invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoices")
      .select("type, amount")
      .eq("project_id", projectId);

    if (invoiceError) throw invoiceError;

    // 2. Fetch Payments (Money already paid out to laborers/vendors)
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("amount")
      .eq("project_id", projectId);

    if (paymentError) throw paymentError;

    // 3. Calculate Totals
    let totalIncome = 0;
    let totalInvoicedExpenses = 0;
    let totalPaidOut = 0;

    invoices?.forEach((invoice) => {
      const amount = Number(invoice.amount);
      if (invoice.type === "Income") totalIncome += amount;
      if (invoice.type === "Expense") totalInvoicedExpenses += amount;
    });

    payments?.forEach((payment) => {
      totalPaidOut += Number(payment.amount);
    });

    // Total actual expenses = Invoiced Expenses + Money already paid out
    const totalExpenses = totalInvoicedExpenses + totalPaidOut;
    const profitOrLoss = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalInvoicedExpenses,
      totalPaidOut,
      totalExpenses,
      profitOrLoss,
      isProfitable: profitOrLoss >= 0,
    };
  },
};

import { auth } from "../../lib/auth";
import { db } from "../../db";
import { invoices, payments } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const ServerInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["Expense", "Income", "General"]),
  amount: z.number().positive(),
  description: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const isSummary = url.searchParams.get("summary") === "true";

  if (!projectId) return new Response("Missing projectId", { status: 400 });

  if (isSummary) {
    const [projectInvoices, projectPayments] = await Promise.all([
      db.select({ type: invoices.type, amount: invoices.amount }).from(invoices).where(eq(invoices.projectId, projectId)),
      db.select({ amount: payments.amount }).from(payments).where(eq(payments.projectId, projectId))
    ]);

    let totalIncome = 0;
    let totalInvoicedExpenses = 0;
    let totalPaidOut = 0;

    projectInvoices.forEach((invoice: any) => {
      const amount = Number(invoice.amount);
      if (invoice.type === "Income") totalIncome += amount;
      if (invoice.type === "Expense") totalInvoicedExpenses += amount;
    });

    projectPayments.forEach((payment: any) => {
      totalPaidOut += Number(payment.amount);
    });

    const totalExpenses = totalInvoicedExpenses + totalPaidOut;
    const profitOrLoss = totalIncome - totalExpenses;

    const summary = {
      totalIncome,
      totalInvoicedExpenses,
      totalPaidOut,
      totalExpenses,
      profitOrLoss,
      isProfitable: profitOrLoss >= 0,
    };

    return Response.json({ data: summary });
  } else {
    // Just fetch invoices
    const rows = await db.select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(desc(invoices.issueDate));
      
    return Response.json({ data: rows });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const parsed = ServerInvoiceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  
  const { amount, ...rest } = parsed.data;
  const newRecord = await db.insert(invoices).values({ ...rest, amount: amount.toString() }).returning();
  
  return Response.json({ data: newRecord[0] });
}

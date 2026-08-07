import { auth } from "../../lib/auth";
import { db } from "../../db";
import { ledgerInvoices } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { CreateLedgerInvoiceSchema, UpdateLedgerInvoiceSchema } from "../../api/ledgerInvoices";

async function requireContractor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: new Response("Unauthorized", { status: 401 }) };
  if (session.user.role !== "contractor")
    return { error: new Response("Forbidden", { status: 403 }) };
  return { userId: session.user.id };
}

export async function GET(request: Request) {
  const { userId, error } = await requireContractor(request);
  if (error) return error;

  const rows = await db
    .select()
    .from(ledgerInvoices)
    .where(eq(ledgerInvoices.contractorId, userId!))
    .orderBy(desc(ledgerInvoices.createdAt));

  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const { userId, error } = await requireContractor(request);
  if (error) return error;

  const body = await request.json();
  const parsed = CreateLedgerInvoiceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { title, scope, format, items } = parsed.data;
  const inserted = await db
    .insert(ledgerInvoices)
    .values({ contractorId: userId!, title, scope, format, items })
    .returning();

  return Response.json({ data: inserted[0] });
}

export async function PUT(request: Request) {
  const { userId, error } = await requireContractor(request);
  if (error) return error;

  const body = await request.json();
  const parsed = UpdateLedgerInvoiceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { id, title, scope, format, items } = parsed.data;
  const updated = await db
    .update(ledgerInvoices)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(items !== undefined ? { items } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(ledgerInvoices.id, id), eq(ledgerInvoices.contractorId, userId!)))
    .returning();

  if (updated.length === 0) return new Response("Not found", { status: 404 });
  return Response.json({ data: updated[0] });
}

export async function DELETE(request: Request) {
  const { userId, error } = await requireContractor(request);
  if (error) return error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing id parameter", { status: 400 });

  await db
    .delete(ledgerInvoices)
    .where(and(eq(ledgerInvoices.id, id), eq(ledgerInvoices.contractorId, userId!)));

  return Response.json({ success: true });
}

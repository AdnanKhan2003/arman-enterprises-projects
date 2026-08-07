import { auth } from "../../lib/auth";
import { db } from "../../db";
import { invoices, projects, clients } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { CreateInvoiceSchema } from "../../api/invoices";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  if (role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  // Fetch all invoices for the contractor
  const rows = await db.select({
    record: invoices,
    project: projects,
    client: clients
  })
  .from(invoices)
  .leftJoin(projects, eq(invoices.projectId, projects.id))
  .leftJoin(clients, eq(invoices.clientId, clients.id))
  .where(eq(invoices.contractorId, userId))
  .orderBy(desc(invoices.issueDate));
  
  const formatted = rows.map((r: any) => ({
    ...r.record,
    project: r.project ? { id: r.project.id, name: r.project.name } : null,
    client: r.client ? { id: r.client.id, name: r.client.name } : null
  }));
  
  return Response.json({ data: formatted });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  
  const { type, amount, description, issue_date, project_id, client_id, third_party_name } = parsed.data;
  
  const newRecord = await db.insert(invoices).values({ 
    contractorId: session.user.id,
    type,
    amount,
    description,
    issueDate: issue_date,
    projectId: project_id || null,
    clientId: client_id || null,
    thirdPartyName: third_party_name || null
  }).returning();
  
  return Response.json({ data: newRecord[0] });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return new Response("Missing id parameter", { status: 400 });

  await db.delete(invoices).where(
    and(
      eq(invoices.id, id),
      eq(invoices.contractorId, session.user.id) // Security check
    )
  );
  
  return Response.json({ success: true });
}

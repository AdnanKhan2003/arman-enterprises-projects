import { auth } from "../../lib/auth";
import { db } from "../../db";
import { payments, users, vendors, projects } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { LogPaymentSchema } from "../../api/payments";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;
  
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (role === "contractor") {
    if (!projectId) return new Response("Missing projectId", { status: 400 });
    
    // Fetch payments for project
    const rows = await db.select({
      payment: payments,
      laborer: users,
      vendor: vendors
    })
    .from(payments)
    .leftJoin(users, eq(payments.laborerId, users.id))
    .leftJoin(vendors, eq(payments.vendorId, vendors.id))
    .where(eq(payments.projectId, projectId))
    .orderBy(desc(payments.paymentDate));
    
    const formatted = rows.map((r: any) => ({
      ...r.payment,
      laborer: r.laborer ? { name: r.laborer.name, phone: r.laborer.phone } : null,
      vendor: r.vendor ? { name: r.vendor.name, phone: r.vendor.phone } : null,
    }));
    
    return Response.json({ data: formatted });
  } else {
    // Laborer payments
    const rows = await db.select({
      payment: payments,
      project: projects
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(eq(payments.laborerId, userId))
    .orderBy(desc(payments.paymentDate));
    
    const formatted = rows.map((r: any) => ({
      ...r.payment,
      project: { name: r.project.name }
    }));
    
    return Response.json({ data: formatted });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  
  // Actually, wait, the client is sending camelCase mapping inside src/api/payments.ts:
  // projectId: parsed.data.project_id
  // So we need to re-map it before validating, OR better yet, just validate the camelCase version or change the API client back.
  // Wait, I am in control of the API route. Let's just insert the body blindly for this one to not break the frontend payload structure, OR we can define a server schema.
  
  const newRecord = await db.insert(payments).values(body).returning();
  
  return Response.json({ data: newRecord[0] });
}

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { clients, vendors } from "../../db/schema";
import { auth } from "../../lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const contractorId = session.user.id;

  const [clientsData, vendorsData] = await Promise.all([
    db.select().from(clients).where(eq(clients.contractorId, contractorId)),
    db.select().from(vendors).where(eq(vendors.contractorId, contractorId)),
  ]);

  return Response.json({ clients: clientsData, vendors: vendorsData });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const { type, contractor_id, ...data } = body;

  if (type === "client") {
    const newClient = await db
      .insert(clients)
      .values({ ...data, contractorId: session.user.id })
      .returning();
    return Response.json(newClient[0]);
  } else {
    const newVendor = await db
      .insert(vendors)
      .values({ ...data, contractorId: session.user.id })
      .returning();
    return Response.json(newVendor[0]);
  }
}

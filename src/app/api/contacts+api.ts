import { eq, and } from "drizzle-orm";
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
      .values({ 
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        contractorId: session.user.id 
      })
      .returning();
    return Response.json(newClient[0]);
  } else {
    const newVendor = await db
      .insert(vendors)
      .values({ 
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        vendorType: data.vendor_type,
        contractorId: session.user.id 
      })
      .returning();
    return Response.json(newVendor[0]);
  }
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const { id, type, ...data } = body;

  if (!id || !type) return new Response("Missing id or type", { status: 400 });

  if (type === "client") {
    const updatedClient = await db
      .update(clients)
      .set({ 
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
      })
      .where(and(eq(clients.id, id), eq(clients.contractorId, session.user.id)))
      .returning();
    return Response.json(updatedClient[0]);
  } else {
    const updatedVendor = await db
      .update(vendors)
      .set({ 
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        vendorType: data.vendor_type,
      })
      .where(and(eq(vendors.id, id), eq(vendors.contractorId, session.user.id)))
      .returning();
    return Response.json(updatedVendor[0]);
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");

  if (!id || !type) return new Response("Missing id or type", { status: 400 });

  if (type === "client") {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.contractorId, session.user.id)));
    return Response.json({ success: true });
  } else {
    await db.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.contractorId, session.user.id)));
    return Response.json({ success: true });
  }
}

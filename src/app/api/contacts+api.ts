import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { clients, vendors } from "../../db/schema";
import {
  CreateContactSchema,
  UpdateContactSchema,
  DeleteContactSchema,
} from "../../api/contact";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiError,
  apiResponse,
} from "../../lib/api-response";
import { OK, CREATED, NOT_FOUND } from "../../lib/http";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const contractorId = session.user.id;

  const [clientsData, vendorsData] = await Promise.all([
    db.select().from(clients).where(eq(clients.contractorId, contractorId)),
    db.select().from(vendors).where(eq(vendors.contractorId, contractorId)),
  ]);

  return apiResponse(OK, { clients: clientsData, vendors: vendorsData }, "Contacts retrieved successfully");
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const parsed = CreateContactSchema.parse(await request.json());

  if (parsed.type === "client") {
    const newClient = await db
      .insert(clients)
      .values({
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        address: parsed.address,
        contractorId: session.user.id,
      })
      .returning();
    return apiResponse(CREATED, newClient[0], `Client ${newClient[0].name} created successfully`);
  }

  const newVendor = await db
    .insert(vendors)
    .values({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      address: parsed.address,
      vendorType: parsed.vendor_type,
      contractorId: session.user.id,
    })
    .returning();
  return apiResponse(CREATED, newVendor[0], `Vendor ${newVendor[0].name} created successfully`);
});

export const PATCH = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const parsed = UpdateContactSchema.parse(await request.json());

  if (parsed.type === "client") {
    const updatedClient = await db
      .update(clients)
      .set({
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        address: parsed.address,
      })
      .where(and(eq(clients.id, parsed.id), eq(clients.contractorId, session.user.id)))
      .returning();

    if (updatedClient.length === 0) {
      throw apiError(NOT_FOUND, "Client not found");
    }

    return apiResponse(OK, updatedClient[0], `Client ${updatedClient[0].name} updated successfully`);
  }

  const updatedVendor = await db
    .update(vendors)
    .set({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      address: parsed.address,
      vendorType: parsed.vendor_type,
    })
    .where(and(eq(vendors.id, parsed.id), eq(vendors.contractorId, session.user.id)))
    .returning();

  if (updatedVendor.length === 0) {
    throw apiError(NOT_FOUND, "Vendor not found");
  }

  return apiResponse(OK, updatedVendor[0], `Vendor ${updatedVendor[0].name} updated successfully`);
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const url = new URL(request.url);
  const { id, type } = DeleteContactSchema.parse({
    id: url.searchParams.get("id"),
    type: url.searchParams.get("type"),
  });

  if (type === "client") {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.contractorId, session.user.id)));
    return apiResponse(OK, { success: true }, "Client deleted successfully");
  }

  await db.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.contractorId, session.user.id)));
  return apiResponse(OK, { success: true }, "Vendor deleted successfully");
});

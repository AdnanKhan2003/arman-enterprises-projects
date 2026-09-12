import { db } from "../../db";
import { ledgerInvoices, projects } from "../../db/schema";
import { count, eq, desc, and } from "drizzle-orm";
import { CreateLedgerInvoiceSchema, UpdateLedgerInvoiceSchema } from "../../api/ledgerInvoices";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiError,
  apiResponse,
} from "../../lib/api-response";
import { parsePagination, buildPaginatedResponse } from "../../lib/pagination";
import { OK, CREATED, BAD_REQUEST, NOT_FOUND } from "../../lib/http";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const userId = session.user.id;

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(url);
  const projectId = url.searchParams.get("projectId");

  const whereClause = projectId
    ? and(eq(ledgerInvoices.contractorId, userId), eq(ledgerInvoices.projectId, projectId))
    : eq(ledgerInvoices.contractorId, userId);

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(ledgerInvoices).where(whereClause),
    db
      .select({ record: ledgerInvoices, project: projects })
      .from(ledgerInvoices)
      .leftJoin(projects, eq(ledgerInvoices.projectId, projects.id))
      .where(whereClause)
      .orderBy(desc(ledgerInvoices.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const formatted = rows.map((r) => ({
    ...r.record,
    project: r.project ? { id: r.project.id, name: r.project.name } : null,
  }));

  const total = totalResult[0]?.count ?? 0;
  const paginated = buildPaginatedResponse(formatted, total, limit, offset);

  return apiResponse(OK, paginated, "Ledger invoices retrieved successfully");
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const userId = session.user.id;

  const body = await request.json();
  const parsed = CreateLedgerInvoiceSchema.parse(body);

  const { title, scope, format, items, project_id } = parsed;
  const inserted = await db
    .insert(ledgerInvoices)
    .values({ contractorId: userId, title, scope, format, items, projectId: project_id || null })
    .returning();

  return apiResponse(CREATED, inserted[0], `Invoice ${inserted[0].title || inserted[0].id} created successfully`);
});

export const PUT = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const userId = session.user.id;

  const body = await request.json();
  const parsed = UpdateLedgerInvoiceSchema.parse(body);

  const { id, title, scope, format, items, project_id } = parsed;
  const updated = await db
    .update(ledgerInvoices)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(items !== undefined ? { items } : {}),
      ...(project_id !== undefined ? { projectId: project_id || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(ledgerInvoices.id, id), eq(ledgerInvoices.contractorId, userId)))
    .returning();

  if (updated.length === 0) {
    throw apiError(NOT_FOUND, "Invoice not found");
  }

  return apiResponse(OK, updated[0], `Invoice ${updated[0].title || updated[0].id} updated successfully`);
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const userId = session.user.id;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    throw apiError(BAD_REQUEST, "Missing id parameter");
  }

  await db
    .delete(ledgerInvoices)
    .where(and(eq(ledgerInvoices.id, id), eq(ledgerInvoices.contractorId, userId)));

  return apiResponse(OK, { success: true }, "Invoice deleted successfully");
});

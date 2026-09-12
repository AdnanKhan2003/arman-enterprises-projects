import { db } from "../../db";
import { payments } from "../../db/schema";
import { count, desc, or, eq, and } from "drizzle-orm";
import { LogPaymentSchema } from "../../api/payments";
import {
  withErrorHandling,
  requireAuth,
  apiResponse,
} from "../../lib/api-response";
import { parsePagination, buildPaginatedResponse } from "../../lib/pagination";
import { OK, CREATED } from "../../lib/http";

type Role = "contractor" | "laborer";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  const userId = session.user.id;
  const role = session.user.role;

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(url);
  const projectId = url.searchParams.get("projectId");

  const whereClause =
    role === "contractor"
      ? (projectId ? eq(payments.projectId, projectId) : undefined)
      : (projectId
          ? and(eq(payments.projectId, projectId), or(eq(payments.fromId, userId), eq(payments.toId, userId)))
          : or(eq(payments.fromId, userId), eq(payments.toId, userId)));

  const [totalResult, rows] = await Promise.all([
    whereClause
      ? db.select({ count: count() }).from(payments).where(whereClause)
      : db.select({ count: count() }).from(payments),
    whereClause
      ? db
          .select()
          .from(payments)
          .where(whereClause)
          .orderBy(desc(payments.paymentDate))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(payments)
          .orderBy(desc(payments.paymentDate))
          .limit(limit)
          .offset(offset),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const paginated = buildPaginatedResponse(rows, total, limit, offset);

  return apiResponse(OK, paginated, "Payments retrieved successfully");
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  const role = (session.user.role as Role) || "contractor";
  const self = {
    type: role,
    id: session.user.id,
    name: session.user.name || (role === "contractor" ? "Contractor" : "Laborer"),
  };

  const body = await request.json();
  const parsed = LogPaymentSchema.parse(body);

  const { direction, counterparty_type, counterparty_id, counterparty_name, amount, payment_date, description, project_id } =
    parsed;

  const counterparty = { type: counterparty_type, id: counterparty_id, name: counterparty_name };
  const from = direction === "paid" ? self : counterparty;
  const to = direction === "paid" ? counterparty : self;

  const inserted = await db
    .insert(payments)
    .values({
      createdById: session.user.id,
      fromType: from.type,
      fromId: from.id,
      fromName: from.name,
      toType: to.type,
      toId: to.id,
      toName: to.name,
      projectId: project_id || null,
      amount,
      paymentDate: payment_date,
      description: description || null,
    })
    .returning();

  return apiResponse(CREATED, inserted[0], "Payment recorded successfully");
});

import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { users, sessions, accounts, attendance, projectAssignments, payments } from "../../../db/schema";
import { eq, and, or } from "drizzle-orm";
import {
  CreateLaborerSchema,
  UpdateLaborerSchema,
  DeleteLaborerSchema,
} from "../../../api/laborer";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiError,
  apiResponse,
} from "../../../lib/api-response";
import { OK, CREATED, NOT_FOUND } from "../../../lib/http";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth(req);
  requireRole(session, "contractor");

  const { name, email, password } = CreateLaborerSchema.parse(await req.json());

  const signUpReq = new Request(new URL("/api/auth/sign-up/email", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role: "laborer" }),
  });

  const signUpRes = await auth.handler(signUpReq);

  if (!signUpRes.ok) {
    const errorData = await signUpRes.json().catch(() => null);
    const errorMessage = errorData?.message || "Failed to create laborer";
    throw apiError(signUpRes.status, errorMessage);
  }

  return apiResponse(CREATED, { success: true }, "Laborer created successfully");
});

export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireAuth(req);
  requireRole(session, "contractor");

  const laborers = await db.select().from(users).where(eq(users.role, "laborer"));

  const safeLaborers = laborers.map((l: any) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    createdAt: l.createdAt,
  }));

  return apiResponse(OK, { laborers: safeLaborers }, "Laborers retrieved successfully");
});

export const PATCH = withErrorHandling(async (req: Request) => {
  const session = await requireAuth(req);
  requireRole(session, "contractor");

  const { id, name } = UpdateLaborerSchema.parse(await req.json());

  const userToUpdate = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "laborer")))
    .limit(1);

  if (!userToUpdate.length) {
    throw apiError(NOT_FOUND, "Laborer not found");
  }

  await db.update(users).set({ name }).where(eq(users.id, id));

  return apiResponse(OK, { success: true }, "Laborer updated successfully");
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const session = await requireAuth(req);
  requireRole(session, "contractor");

  const url = new URL(req.url);
  const { id } = DeleteLaborerSchema.parse({ id: url.searchParams.get("id") });

  const deleted = await db.transaction(async (tx) => {
    const userToDelete = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "laborer")))
      .limit(1);

    if (!userToDelete.length) {
      return false;
    }

    await tx.delete(attendance).where(eq(attendance.laborerId, id));
    await tx.delete(projectAssignments).where(eq(projectAssignments.laborerId, id));
    await tx.delete(payments).where(or(eq(payments.fromId, id), eq(payments.toId, id)));
    await tx.delete(sessions).where(eq(sessions.userId, id));
    await tx.delete(accounts).where(eq(accounts.userId, id));
    await tx.delete(users).where(eq(users.id, id));

    return true;
  });

  if (!deleted) {
    throw apiError(NOT_FOUND, "Laborer not found");
  }

  return apiResponse(OK, { success: true }, "Laborer deleted successfully");
});

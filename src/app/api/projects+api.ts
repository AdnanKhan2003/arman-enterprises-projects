import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { clients, projectAssignments, projects, attendance, payments, ledgerInvoices } from "../../db/schema";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiError,
  apiResponse,
} from "../../lib/api-response";
import { OK, CREATED, BAD_REQUEST, NOT_FOUND } from "../../lib/http";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  const userId = session.user.id;
  const role = session.user.role;

  if (role === "contractor") {
    const rows = await db
      .select({
        project: projects,
        client: clients,
        assignment: projectAssignments,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projects.contractorId, userId));

    const projectMap = new Map();

    rows.forEach((r) => {
      if (!projectMap.has(r.project.id)) {
        projectMap.set(r.project.id, {
          ...r.project,
          client: r.client ? { id: r.client.id, name: r.client.name, phone: r.client.phone } : null,
          laborerIds: [],
        });
      }
      if (r.assignment) {
        projectMap.get(r.project.id).laborerIds.push(r.assignment.laborerId);
      }
    });

    return apiResponse(OK, Array.from(projectMap.values()), "Projects retrieved successfully");
  }

  const rows = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projectAssignments)
    .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projectAssignments.laborerId, userId));

  const formatted = rows.map((r) => ({
    projects: {
      ...r.project,
      client: r.client ? { name: r.client.name, phone: r.client.phone } : null,
    },
  }));

  return apiResponse(OK, formatted, "Projects retrieved successfully");
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const body = await request.json();
  const { contractor_id, laborer_ids, ...data } = body;

  const newProject = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(projects)
      .values({
        name: data.name,
        description: data.description,
        location: data.location,
        clientId: data.client_id || null,
        contractorId: session.user.id,
      })
      .returning();

    const projectId = inserted[0].id;

    if (laborer_ids && Array.isArray(laborer_ids) && laborer_ids.length > 0) {
      const assignments = laborer_ids.map((laborerId: string) => ({
        projectId,
        laborerId,
      }));
      await tx.insert(projectAssignments).values(assignments);
    }

    return inserted[0];
  });

  return apiResponse(CREATED, newProject, `Project ${newProject.name} created successfully`);
});

export const PATCH = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const body = await request.json();
  const { id, name, location, description, client_id, laborer_ids, status } = body;

  if (!id) {
    throw apiError(BAD_REQUEST, "Missing project id");
  }

  const statusOnly = status !== undefined && name === undefined;

  if (!statusOnly && !name) {
    throw apiError(BAD_REQUEST, "Missing required fields");
  }

  const updated = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.contractorId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return null;
    }

    const res = await tx
      .update(projects)
      .set(
        statusOnly
          ? { status }
          : {
              name,
              location,
              description,
              clientId: client_id || null,
              ...(status !== undefined ? { status } : {}),
            },
      )
      .where(eq(projects.id, id))
      .returning();

    if (laborer_ids && Array.isArray(laborer_ids)) {
      await tx.delete(projectAssignments).where(eq(projectAssignments.projectId, id));

      if (laborer_ids.length > 0) {
        const assignments = laborer_ids.map((laborerId: string) => ({
          projectId: id,
          laborerId,
        }));
        await tx.insert(projectAssignments).values(assignments);
      }
    }

    return res[0];
  });

  if (!updated) {
    throw apiError(NOT_FOUND, "Project not found");
  }

  return apiResponse(OK, updated, `Project ${updated.name} updated successfully`);
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    throw apiError(BAD_REQUEST, "Missing project ID");
  }

  const deleted = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.contractorId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return false;
    }

    await tx.update(payments).set({ projectId: null }).where(eq(payments.projectId, id));
    await tx.update(ledgerInvoices).set({ projectId: null }).where(eq(ledgerInvoices.projectId, id));
    await tx.delete(attendance).where(eq(attendance.projectId, id));
    await tx.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
    await tx.delete(projects).where(eq(projects.id, id));

    return true;
  });

  if (!deleted) {
    throw apiError(NOT_FOUND, "Project not found");
  }

  return apiResponse(OK, { success: true }, "Project deleted successfully");
});

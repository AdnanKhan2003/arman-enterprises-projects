import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { clients, projectAssignments, projects, attendance, payments } from "../../db/schema";
import { auth } from "../../lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

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

    const formatted = Array.from(projectMap.values());

    return Response.json({ data: formatted });
  } else {
    // Laborer
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
      // In the original Supabase query it returned an array of objects shaped like { projects: { ... } }
      // So we need to match that exact shape for laborers
      projects: {
        ...r.project,
        client: r.client
          ? { name: r.client.name, phone: r.client.phone }
          : null,
      },
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
  const { contractor_id, laborer_ids, ...data } = body;

  try {
    const newProject = await db
      .insert(projects)
      .values({
        name: data.name,
        description: data.description,
        location: data.location,
        clientId: data.client_id || null,
        contractorId: session.user.id,
      })
      .returning();

    const projectId = newProject[0].id;

    if (laborer_ids && Array.isArray(laborer_ids) && laborer_ids.length > 0) {
      const assignments = laborer_ids.map((laborerId: string) => ({
        projectId,
        laborerId,
      }));
      await db.insert(projectAssignments).values(assignments);
    }

    return Response.json({ data: newProject[0] });
  } catch (error) {
    console.error("Error creating project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, location, description, client_id, laborer_ids } = body;

    if (!id || !name) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Ensure the project belongs to this contractor
    const existing = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.contractorId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return new Response("Project not found", { status: 404 });
    }

    const updated = await db
      .update(projects)
      .set({
        name,
        location,
        description,
        clientId: client_id || null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    // Update laborers
    if (laborer_ids && Array.isArray(laborer_ids)) {
      // 1. Delete existing assignments
      await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
      
      // 2. Insert new ones
      if (laborer_ids.length > 0) {
        const assignments = laborer_ids.map((laborerId: string) => ({
          projectId: id,
          laborerId,
        }));
        await db.insert(projectAssignments).values(assignments);
      }
    }

    return Response.json({ data: updated[0] });
  } catch (error) {
    console.error("Error updating project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Missing project ID", { status: 400 });
    }

    // Ensure the project belongs to this contractor
    const existing = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.contractorId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return new Response("Project not found", { status: 404 });
    }

    // Perform Cascading Delete
    await db.delete(attendance).where(eq(attendance.projectId, id));
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
    await db.delete(payments).where(eq(payments.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

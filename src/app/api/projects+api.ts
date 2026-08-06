import { eq } from "drizzle-orm";
import { db } from "../../db";
import { clients, projectAssignments, projects } from "../../db/schema";
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
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(projects.contractorId, userId));

    const formatted = rows.map((r) => ({
      ...r.project,
      client: r.client ? { name: r.client.name, phone: r.client.phone } : null,
    }));

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
  const { contractor_id, ...data } = body;

  const newProject = await db
    .insert(projects)
    .values({
      name: data.name,
      description: data.description,
      location: data.location,
      clientId: data.client_id,
      contractorId: session.user.id,
    })
    .returning();

  return Response.json({ data: newProject[0] });
}

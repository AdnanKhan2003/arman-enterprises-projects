import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { clients, projectAssignments, projects } from "../../../db/schema";
import { auth } from "../../../lib/auth";

export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, id));

  if (rows.length === 0)
    return new Response("Project not found", { status: 404 });

  const r = rows[0];
  const formatted = {
    ...r.project,
    client: r.client ? { ...r.client } : null,
  };

  return Response.json({ data: formatted });
}


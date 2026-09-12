import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db";
import { clients, projects } from "../../../db/schema";
import {
  withErrorHandling,
  requireAuth,
  apiError,
  apiResponse,
} from "../../../lib/api-response";
import { OK, NOT_FOUND } from "../../../lib/http";

const ProjectIdParamSchema = z.object({
  id: z.string().min(1, "Missing project ID"),
});

export const GET = withErrorHandling(async (request: Request, context: Record<string, string>) => {
  await requireAuth(request);
  const { id } = ProjectIdParamSchema.parse(context);

  const rows = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, id));

  if (rows.length === 0) {
    throw apiError(NOT_FOUND, "Project not found");
  }

  const r = rows[0];
  const formatted = {
    ...r.project,
    client: r.client ? { ...r.client } : null,
  };

  return apiResponse(OK, formatted, `Project ${formatted.name} retrieved successfully`);
});

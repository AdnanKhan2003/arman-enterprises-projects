import { db } from "../../../db";
import { projectAssignments } from "../../../db/schema";
import { AssignLaborerSchema } from "../../../schemas/project";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiResponse,
} from "../../../lib/api-response";
import { CREATED } from "../../../lib/http";

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");

  const body = await request.json();
  const parsed = AssignLaborerSchema.parse(body);

  const { projectId, laborerId } = parsed;

  await db.insert(projectAssignments).values({
    projectId,
    laborerId,
  });

  return apiResponse(CREATED, { success: true }, "Laborer assigned to project successfully");
});

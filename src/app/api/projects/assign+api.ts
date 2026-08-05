import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { projectAssignments } from "../../../db/schema";
import { AssignLaborerSchema } from "../../../api/projects";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const parsed = AssignLaborerSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  
  const { projectId, laborerId } = parsed.data;
  
  await db.insert(projectAssignments).values({ 
    projectId, 
    laborerId 
  });
  
  return Response.json({ data: { success: true } });
}

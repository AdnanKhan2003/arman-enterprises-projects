import { auth } from "../../lib/auth";
import { db } from "../../db";
import { attendance, projects, users } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { MarkAttendanceSchema, ReviewAttendanceSchema } from "../../api/attendance";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;
  
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (role === "contractor") {
    if (!projectId) return new Response("Missing projectId", { status: 400 });
    
    // Fetch pending attendance for a specific project
    const rows = await db.select({
      record: attendance,
      laborer: users
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.laborerId, users.id))
    .where(
      and(
        eq(attendance.projectId, projectId),
        eq(attendance.approvalStatus, "Pending")
      )
    );
    
    const formatted = rows.map((r: any) => ({
      ...r.record,
      laborer: { name: r.laborer.name, phone: r.laborer.phone }
    }));
    
    return Response.json({ data: formatted });
  } else {
    // Laborer history
    const rows = await db.select({
      record: attendance,
      project: projects
    })
    .from(attendance)
    .innerJoin(projects, eq(attendance.projectId, projects.id))
    .where(eq(attendance.laborerId, userId))
    .orderBy(desc(attendance.workDate));
    
    const formatted = rows.map((r: any) => ({
      ...r.record,
      project: { name: r.project.name }
    }));
    
    return Response.json({ data: formatted });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "laborer") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const parsed = MarkAttendanceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  
  const { project_id, laborer_id, work_date, status } = parsed.data;
  
  const newRecord = await db.insert(attendance).values({ 
    projectId: project_id,
    workDate: work_date,
    status: status,
    laborerId: session.user.id,
    approvalStatus: "Pending"
  }).returning();
  
  return Response.json({ data: newRecord[0] });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.user.role !== "contractor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const parsed = ReviewAttendanceSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { attendanceId, status, contractorId } = parsed.data;
  
  const updated = await db.update(attendance)
    .set({ 
      approvalStatus: status,
      reviewedBy: session.user.id
    })
    .where(eq(attendance.id, attendanceId))
    .returning();
    
  return Response.json({ data: updated[0] });
}

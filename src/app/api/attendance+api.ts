import { db } from "../../db";
import { attendance, projects, users } from "../../db/schema";
import { count, eq, desc, and } from "drizzle-orm";
import {
  MarkAttendanceSchema,
  ReviewAttendanceSchema,
  AttendanceQuerySchema,
} from "../../schemas/attendance";
import {
  withErrorHandling,
  requireAuth,
  requireRole,
  apiError,
  apiResponse,
} from "../../lib/api-response";
import { DEFAULT_PAGE_LIMIT, buildPaginatedResponse } from "../../lib/pagination";
import { OK, CREATED, BAD_REQUEST, NOT_FOUND } from "../../lib/http";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  const userId = session.user.id;
  const role = session.user.role;

  const url = new URL(request.url);
  const query = AttendanceQuerySchema.parse({
    projectId: url.searchParams.get("projectId") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    offset: url.searchParams.get("offset") || undefined,
  });

  const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
  const offset = query.offset ?? 0;
  const projectId = query.projectId;

  if (role === "contractor") {
    const whereClause = and(
      eq(projects.contractorId, userId),
      eq(attendance.approvalStatus, "Pending"),
      ...(projectId ? [eq(attendance.projectId, projectId)] : []),
    );

    const [totalResult, rows] = await Promise.all([
      db
        .select({ count: count() })
        .from(attendance)
        .innerJoin(users, eq(attendance.laborerId, users.id))
        .innerJoin(projects, eq(attendance.projectId, projects.id))
        .where(whereClause),
      db
        .select({
          record: attendance,
          laborer: users,
          project: projects,
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.laborerId, users.id))
        .innerJoin(projects, eq(attendance.projectId, projects.id))
        .where(whereClause)
        .orderBy(desc(attendance.workDate))
        .limit(limit)
        .offset(offset),
    ]);

    const formatted = rows.map((r: any) => ({
      ...r.record,
      laborer: { name: r.laborer.name, phone: r.laborer.phone },
      project: { name: r.project.name },
    }));

    const total = totalResult[0]?.count ?? 0;
    const paginated = buildPaginatedResponse(formatted, total, limit, offset);

    return apiResponse(OK, paginated, "Attendance records retrieved successfully");
  }

  const whereClause = and(
    eq(attendance.laborerId, userId),
    ...(projectId ? [eq(attendance.projectId, projectId)] : []),
  );

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(attendance)
      .innerJoin(projects, eq(attendance.projectId, projects.id))
      .where(whereClause),
    db
      .select({
        record: attendance,
        project: projects,
      })
      .from(attendance)
      .innerJoin(projects, eq(attendance.projectId, projects.id))
      .where(whereClause)
      .orderBy(desc(attendance.workDate))
      .limit(limit)
      .offset(offset),
  ]);

  const formatted = rows.map((r: any) => ({
    ...r.record,
    project: { name: r.project.name },
  }));

  const total = totalResult[0]?.count ?? 0;
  const paginated = buildPaginatedResponse(formatted, total, limit, offset);

  return apiResponse(OK, paginated, "Attendance records retrieved successfully");
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "laborer");

  const body = await request.json();
  const parsed = MarkAttendanceSchema.parse(body);
  const { project_id, work_date, action } = parsed;

  if (action === "check_in") {
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.laborerId, session.user.id),
          eq(attendance.projectId, project_id),
          eq(attendance.workDate, work_date),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw apiError(BAD_REQUEST, "Already checked in today");
    }

    const newRecord = await db
      .insert(attendance)
      .values({
        projectId: project_id,
        workDate: work_date,
        status: "Present",
        checkInTime: new Date(),
        laborerId: session.user.id,
        approvalStatus: "Pending",
      })
      .returning();

    return apiResponse(CREATED, newRecord[0], "Checked in successfully");
  }

  if (action === "check_out") {
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.laborerId, session.user.id),
          eq(attendance.projectId, project_id),
          eq(attendance.workDate, work_date),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw apiError(NOT_FOUND, "No check-in found for today");
    }

    const updatedRecord = await db
      .update(attendance)
      .set({ checkOutTime: new Date() })
      .where(eq(attendance.id, existing[0].id))
      .returning();

    return apiResponse(OK, updatedRecord[0], "Checked out successfully");
  }

  throw apiError(BAD_REQUEST, "Invalid action");
});

export const PATCH = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  requireRole(session, "contractor");

  const body = await request.json();
  const parsed = ReviewAttendanceSchema.parse(body);
  const { attendanceId, status } = parsed;

  const updated = await db
    .update(attendance)
    .set({
      approvalStatus: status,
      reviewedBy: session.user.id,
    })
    .where(eq(attendance.id, attendanceId))
    .returning();

  if (updated.length === 0) {
    throw apiError(NOT_FOUND, "Attendance record not found");
  }

  return apiResponse(OK, updated[0], `Attendance record marked as ${status}`);
});

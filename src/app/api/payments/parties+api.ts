import { db } from "../../../db";
import { users, clients, vendors, projects, projectAssignments } from "../../../db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  withErrorHandling,
  requireAuth,
  apiResponse,
} from "../../../lib/api-response";
import { OK } from "../../../lib/http";

const uniqById = <T extends { id: string }>(rows: T[]) => {
  const map = new Map<string, T>();
  for (const r of rows) if (!map.has(r.id)) map.set(r.id, r);
  return Array.from(map.values());
};

export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireAuth(request);
  const userId = session.user.id;
  const role = session.user.role;

  if (role === "contractor") {
    const [laborerRows, clientRows, vendorRows] = await Promise.all([
      db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "laborer")),
      db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.contractorId, userId)),
      db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(eq(vendors.contractorId, userId)),
    ]);

    return apiResponse(
      OK,
      {
        role: "contractor",
        laborers: uniqById(laborerRows),
        clients: clientRows,
        vendors: vendorRows,
      },
      "Parties retrieved successfully",
    );
  }

  const contractorRows = await db
    .select({ id: users.id, name: users.name })
    .from(projectAssignments)
    .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
    .innerJoin(users, eq(projects.contractorId, users.id))
    .where(eq(projectAssignments.laborerId, userId));

  const contractorsList = uniqById(contractorRows);
  const contractorIds = contractorsList.map((c) => c.id);

  const [clientRows, vendorRows] =
    contractorIds.length === 0
      ? [[], []]
      : await Promise.all([
          db.select({ id: clients.id, name: clients.name }).from(clients).where(inArray(clients.contractorId, contractorIds)),
          db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.contractorId, contractorIds)),
        ]);

  return apiResponse(
    OK,
    {
      role: "laborer",
      contractors: contractorsList,
      clients: clientRows,
      vendors: vendorRows,
    },
    "Parties retrieved successfully",
  );
});

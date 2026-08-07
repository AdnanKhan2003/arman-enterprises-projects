import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { users, clients, vendors, projects, projectAssignments } from "../../../db/schema";
import { eq, inArray } from "drizzle-orm";

const uniqById = <T extends { id: string }>(rows: T[]) => {
  const map = new Map<string, T>();
  for (const r of rows) if (!map.has(r.id)) map.set(r.id, r);
  return Array.from(map.values());
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  if (role === "contractor") {
    // All laborers (matches the Laborers management screen), plus this
    // contractor's own clients and vendors.
    const [laborerRows, clientRows, vendorRows] = await Promise.all([
      db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "laborer")),
      db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.contractorId, userId)),
      db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(eq(vendors.contractorId, userId)),
    ]);

    return Response.json({
      role: "contractor",
      laborers: uniqById(laborerRows),
      clients: clientRows,
      vendors: vendorRows,
    });
  }

  // Laborer: contractors from their assigned projects, plus those contractors' clients/vendors.
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

  return Response.json({
    role: "laborer",
    contractors: contractorsList,
    clients: clientRows,
    vendors: vendorRows,
  });
}

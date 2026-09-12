import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { users, sessions, accounts, attendance, projectAssignments, payments } from "../../../db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user as any).role !== "contractor") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Proxy the request to better-auth
    const signUpReq = new Request(new URL("/api/auth/sign-up/email", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "laborer" }),
    });

    const signUpRes = await auth.handler(signUpReq);

    if (!signUpRes.ok) {
      const errorData = await signUpRes.json().catch(() => null);
      const errorMessage = errorData?.message || "Failed to create laborer";
      return Response.json({ error: errorMessage }, { status: signUpRes.status });
    }

    // Return success without the Set-Cookie headers
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error creating laborer:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user as any).role !== "contractor") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Return all users that are laborers
    const laborers = await db.select().from(users).where(eq(users.role, "laborer"));
    
    // Do not return password hashes or sensitive info
    const safeLaborers = laborers.map((l: any) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      createdAt: l.createdAt
    }));

    return Response.json({ laborers: safeLaborers });
  } catch (error) {
    console.error("Error fetching laborers:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user as any).role !== "contractor") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Ensure the user being updated is actually a laborer
    const userToUpdate = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "laborer"))).limit(1);
    if (!userToUpdate.length) {
      return new Response("Laborer not found", { status: 404 });
    }

    await db.update(users).set({ name }).where(eq(users.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating laborer:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user as any).role !== "contractor") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Missing laborer ID", { status: 400 });
    }

    const deleted = await db.transaction(async (tx) => {
      // Ensure the user being deleted is actually a laborer
      const userToDelete = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, "laborer")))
        .limit(1);

      if (!userToDelete.length) {
        return false;
      }

      // Perform Cascading Delete
      // 1. Delete dependent app records
      await tx.delete(attendance).where(eq(attendance.laborerId, id));
      await tx.delete(projectAssignments).where(eq(projectAssignments.laborerId, id));
      await tx.delete(payments).where(or(eq(payments.fromId, id), eq(payments.toId, id)));

      // 2. Delete auth dependency records
      await tx.delete(sessions).where(eq(sessions.userId, id));
      await tx.delete(accounts).where(eq(accounts.userId, id));

      // 3. Finally delete the user
      await tx.delete(users).where(eq(users.id, id));

      return true;
    });

    if (!deleted) {
      return new Response("Laborer not found", { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting laborer:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

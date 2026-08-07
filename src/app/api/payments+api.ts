import { auth } from "../../lib/auth";
import { db } from "../../db";
import { payments } from "../../db/schema";
import { desc, or, eq } from "drizzle-orm";
import { LogPaymentSchema } from "../../api/payments";

type Role = "contractor" | "laborer";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  // Contractor is the admin: sees every payment (the client splits them into
  // "mine" vs "others"). Laborers see only payments they're involved in.
  const rows =
    role === "contractor"
      ? await db.select().from(payments).orderBy(desc(payments.paymentDate))
      : await db
          .select()
          .from(payments)
          .where(or(eq(payments.fromId, userId), eq(payments.toId, userId)))
          .orderBy(desc(payments.paymentDate));

  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const role = (session.user.role as Role) || "contractor";
  const self = {
    type: role,
    id: session.user.id,
    name: session.user.name || (role === "contractor" ? "Contractor" : "Laborer"),
  };

  const body = await request.json();
  const parsed = LogPaymentSchema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { direction, counterparty_type, counterparty_id, counterparty_name, amount, payment_date, description, project_id } =
    parsed.data;

  const counterparty = { type: counterparty_type, id: counterparty_id, name: counterparty_name };
  const from = direction === "paid" ? self : counterparty;
  const to = direction === "paid" ? counterparty : self;

  const inserted = await db
    .insert(payments)
    .values({
      createdById: session.user.id,
      fromType: from.type,
      fromId: from.id,
      fromName: from.name,
      toType: to.type,
      toId: to.id,
      toName: to.name,
      projectId: project_id || null,
      amount,
      paymentDate: payment_date,
      description: description || null,
    })
    .returning();

  return Response.json({ data: inserted[0] });
}

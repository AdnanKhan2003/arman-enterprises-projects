import { sql } from "drizzle-orm";
import {
  check,
  date,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ENUMS
export const roleEnum = pgEnum("user_role", ["contractor", "laborer"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "Present",
  "Absent",
  "Half-day",
]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "Pending",
  "Approved",
  "Rejected",
]);
export const invoiceTypeEnum = pgEnum("invoice_type", [
  "Expense",
  "Income",
  "General",
]);

// TABLES
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id")
    .references(() => users.id)
    .notNull(),
  clientId: uuid("client_id").references(() => clients.id), // Nullable for internal projects
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectAssignments = pgTable(
  "project_assignments",
  {
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    laborerId: uuid("laborer_id")
      .references(() => users.id)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.laborerId] })],
);

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  laborerId: uuid("laborer_id")
    .references(() => users.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  workDate: date("work_date").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  approvalStatus: approvalStatusEnum("approval_status")
    .default("Pending")
    .notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id), // The Contractor who approved it
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  type: invoiceTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  issueDate: date("issue_date").notNull(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    laborerId: uuid("laborer_id").references(() => users.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
    proofUrl: text("proof_url"),
    description: text("description"),
  },
  (table) => [
    // Constraint: Payment must go to exactly one (laborer OR vendor)
    check(
      "payment_recipient_check",
      sql`(${table.laborerId} IS NOT NULL AND ${table.vendorId} IS NULL) OR (${table.laborerId} IS NULL AND ${table.vendorId} IS NOT NULL)`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
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

// BETTER AUTH CORE TABLES
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  
  // Custom fields
  role: roleEnum("role"), // Optional initially during signup
  phone: text("phone"),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// APP TABLES
export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractorId: text("contractor_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    vendorType: text("vendor_type"),
    phone: text("phone"),
    email: text("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("vendors_contractor_id_idx").on(table.contractorId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractorId: text("contractor_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("clients_contractor_id_idx").on(table.contractorId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractorId: text("contractor_id")
      .references(() => users.id)
      .notNull(),
    clientId: uuid("client_id").references(() => clients.id),
    name: text("name").notNull(),
    description: text("description"),
    location: text("location"),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_contractor_id_idx").on(table.contractorId),
    index("projects_client_id_idx").on(table.clientId),
    index("projects_status_idx").on(table.status),
  ],
);

export const projectAssignments = pgTable(
  "project_assignments",
  {
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    laborerId: text("laborer_id")
      .references(() => users.id)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.laborerId] }),
    index("project_assignments_laborer_id_idx").on(table.laborerId),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    laborerId: text("laborer_id")
      .references(() => users.id)
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    workDate: date("work_date").notNull(),
    checkInTime: timestamp("check_in_time"),
    checkOutTime: timestamp("check_out_time"),
    status: attendanceStatusEnum("status").notNull(),
    approvalStatus: approvalStatusEnum("approval_status")
      .default("Pending")
      .notNull(),
    reviewedBy: text("reviewed_by").references(() => users.id),
  },
  (table) => [
    index("attendance_laborer_id_idx").on(table.laborerId),
    index("attendance_project_id_idx").on(table.projectId),
    index("attendance_work_date_idx").on(table.workDate),
    index("attendance_approval_status_idx").on(table.approvalStatus),
    index("attendance_laborer_date_idx").on(table.laborerId, table.workDate),
  ],
);

// Payments: actual cash movements (separate from ledger invoices). Each payment
// is a directed transaction between two parties. A party is one of contractor,
// laborer, client, or vendor; its id + display name are stored inline (id points
// at users/clients/vendors depending on type — polymorphic, so no FK on it).
export const paymentPartyTypeEnum = pgEnum("payment_party_type", [
  "contractor",
  "laborer",
  "client",
  "vendor",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdById: text("created_by_id")
      .references(() => users.id)
      .notNull(),
    fromType: paymentPartyTypeEnum("from_type").notNull(),
    fromId: text("from_id").notNull(),
    fromName: text("from_name").notNull(),
    toType: paymentPartyTypeEnum("to_type").notNull(),
    toId: text("to_id").notNull(),
    toName: text("to_name").notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_created_by_idx").on(table.createdById),
    index("payments_from_id_idx").on(table.fromId),
    index("payments_to_id_idx").on(table.toId),
    index("payments_project_id_idx").on(table.projectId),
    index("payments_payment_date_idx").on(table.paymentDate),
  ],
);

// Ledger invoices: a saved invoice document the contractor builds in the
// template. Line items are stored inline as JSON.
export const ledgerInvoiceScopeEnum = pgEnum("ledger_invoice_scope", [
  "Income",
  "Expense",
  "Both",
]);
export const ledgerInvoiceFormatEnum = pgEnum("ledger_invoice_format", ["pdf", "excel"]);

export type LedgerInvoiceItem = {
  type: "Income" | "Expense";
  date: string;
  entity: string;
  description: string;
  amount: string;
};

export const ledgerInvoices = pgTable(
  "ledger_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractorId: text("contractor_id")
      .references(() => users.id)
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    title: text("title"),
    scope: ledgerInvoiceScopeEnum("scope").notNull(),
    format: ledgerInvoiceFormatEnum("format").notNull(),
    items: jsonb("items").$type<LedgerInvoiceItem[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ledger_invoices_contractor_id_idx").on(table.contractorId),
    index("ledger_invoices_project_id_idx").on(table.projectId),
    index("ledger_invoices_created_at_idx").on(table.createdAt),
  ],
);

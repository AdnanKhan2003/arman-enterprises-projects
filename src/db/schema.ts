import { sql } from "drizzle-orm";
import {
  boolean,
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

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// APP TABLES
export const vendors = pgTable("vendors", {
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
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: text("contractor_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
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
});

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
  (table) => [primaryKey({ columns: [table.projectId, table.laborerId] })],
);

export const attendance = pgTable("attendance", {
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
    laborerId: text("laborer_id").references(() => users.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
    proofUrl: text("proof_url"),
    description: text("description"),
  }
);

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const programs = sqliteTable("programs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull().default("Indonesia"),
  target: integer("target").notNull(),
  collected: integer("collected").notNull().default(0),
  donors: integer("donors").notNull().default(0),
  status: text("status", { enum: ["draft", "published", "paused", "completed", "archived"] }).notNull().default("draft"),
  tone: text("tone").notNull().default("mint"),
  icon: text("icon").notNull().default("✦"),
  deadline: text("deadline"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), donorName: text("donor_name").notNull(),
  email: text("email").notNull(), phone: text("phone").notNull(), message: text("message").notNull().default(""),
  anonymous: integer("anonymous", { mode: "boolean" }).notNull().default(false), amount: integer("amount").notNull(),
  fee: integer("fee").notNull().default(0), method: text("method").notNull(),
  status: text("status", { enum: ["pending", "verifying", "paid", "failed", "expired", "refunded"] }).notNull().default("pending"),
  provider: text("provider").notNull().default("manual"), providerId: text("provider_id"), paymentAction: text("payment_action"),
  expiresAt: text("expires_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const disbursements = sqliteTable("disbursements", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), title: text("title").notNull(),
  description: text("description").notNull(), amount: integer("amount").notNull(), disbursedAt: text("disbursed_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminUsers = sqliteTable("admin_users", {
  email: text("email").primaryKey(), name: text("name").notNull(),
  role: text("role", { enum: ["super_admin", "program_admin", "finance_admin", "auditor"] }).notNull().default("auditor"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), adminEmail: text("admin_email").notNull(), action: text("action").notNull(),
  entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(), value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  objectKey: text("object_key").notNull(), fileName: text("file_name").notNull(), contentType: text("content_type").notNull(),
  size: integer("size").notNull(), caption: text("caption").notNull().default(""), createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const transactionNotes = sqliteTable("transaction_notes", {
  id: text("id").primaryKey(), transactionId: text("transaction_id").notNull(), note: text("note").notNull(),
  createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), type: text("type").notNull(), title: text("title").notNull(), message: text("message").notNull(),
  status: text("status").notNull().default("unread"), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

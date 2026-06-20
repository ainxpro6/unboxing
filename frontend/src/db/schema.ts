// ============================================
// Drizzle ORM Schema — Unboxing Retur
// ============================================
// Better Auth tables + Application-specific tables

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// Better Auth Tables
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("staff"), // "admin" | "staff"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// Application Tables
// ============================================

export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull().unique(),
  courierName: text("courier_name").notNull(),
  statusBarang: text("status_barang").notNull().default("baik"), // "baik" | "rusak" | "tidak_sesuai" | "kosong"
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id")
    .notNull()
    .references(() => returns.id, { onDelete: "cascade" }),
  photoLocalPath: text("photo_local_path"),
  photoCloudUrl: text("photo_cloud_url"),
  photoDriveFileId: text("photo_drive_file_id"),
  videoLocalPath: text("video_local_path"),
  videoCloudUrl: text("video_cloud_url"),
  videoDriveFileId: text("video_drive_file_id"),
  driveFolderId: text("drive_folder_id"),
  uploadStatus: text("upload_status").notNull().default("pending"), // "pending" | "uploading" | "uploaded" | "failed"
  uploadedAt: timestamp("uploaded_at"),
  videoDuration: integer("video_duration").notNull().default(0), // seconds
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  videoResolution: text("video_resolution").notNull().default("1080p"), // "720p" | "1080p"
  videoFps: integer("video_fps").notNull().default(30), // 30 | 60
  maxDurationSeconds: integer("max_duration_seconds").notNull().default(300),
  cloudProvider: text("cloud_provider").notNull().default("google_drive"), // "google_drive" | "none"
  autoUpload: boolean("auto_upload").notNull().default(true),
});

// ============================================
// Relations
// ============================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  returns: many(returns),
  settings: one(settings),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one }) => ({
  user: one(user, {
    fields: [returns.userId],
    references: [user.id],
  }),
  media: one(media),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  returnItem: one(returns, {
    fields: [media.returnId],
    references: [returns.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));

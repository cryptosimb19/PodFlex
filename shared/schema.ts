import { pgTable, text, serial, integer, boolean, json, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  membershipId: text("membership_id"),
  avatar: text("avatar"),
  preferredRegion: text("preferred_region"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pods = pgTable("pods", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => users.id).notNull(),
  clubName: text("club_name").notNull(), // "Bay Club Courtside", "Bay Club San Francisco", etc.
  clubRegion: text("club_region").notNull(), // "San Jose", "San Francisco", etc.
  membershipType: text("membership_type").notNull(), // "Single-Club", "Multi-Club", "Family"
  title: text("title").notNull(),
  description: text("description").notNull(),
  costPerPerson: integer("cost_per_person").notNull(), // Monthly cost in cents
  totalSpots: integer("total_spots").notNull(),
  availableSpots: integer("available_spots").notNull(),
  amenities: json("amenities").$type<string[]>().default([]), // ["tennis", "pickleball", "pool", "spa"]
  rules: text("rules"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const joinRequests = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  message: text("message"), // Optional message from requester
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const podMembers = pgTable("pod_members", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  membershipId: true,
  avatar: true,
  preferredRegion: true,
});

export const insertPodSchema = createInsertSchema(pods).omit({
  id: true,
  createdAt: true,
});

export const insertJoinRequestSchema = createInsertSchema(joinRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPod = z.infer<typeof insertPodSchema>;
export type Pod = typeof pods.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type PodMember = typeof podMembers.$inferSelect;
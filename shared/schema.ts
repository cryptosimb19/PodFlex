import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  preferences: json("preferences").$type<{
    mobilityAssistance?: boolean;
    visualImpairment?: boolean;
    hearingImpairment?: boolean;
    cognitiveSupport?: boolean;
    location?: string;
  }>(),
});

export const pods = pgTable("pods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  address: text("address").notNull(),
  distance: text("distance").notNull(),
  availability: text("availability").notNull(),
  rating: text("rating").notNull(),
  verified: boolean("verified").default(false),
  contact: json("contact").$type<{
    phone?: string;
    email?: string;
  }>(),
  hours: text("hours").notNull(),
  amenities: json("amenities").$type<string[]>().default([]),
  accessibilityFeatures: json("accessibility_features").$type<{
    mobility?: boolean;
    visual?: boolean;
    audio?: boolean;
    wheelchairAccessible?: boolean;
    adjustableDesks?: boolean;
    screenReader?: boolean;
    hearingLoop?: boolean;
    accessibleRestrooms?: boolean;
  }>(),
  detailedFeatures: json("detailed_features").$type<Array<{
    title: string;
    description: string;
    verified: boolean;
  }>>().default([]),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  preferences: true,
});

export const insertPodSchema = createInsertSchema(pods).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPod = z.infer<typeof insertPodSchema>;
export type Pod = typeof pods.$inferSelect;

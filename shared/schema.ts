import { pgTable, text, serial, integer, boolean, json, decimal, timestamp, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table supporting multiple authentication providers
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  membershipId: text("membership_id"),
  preferredRegion: text("preferred_region"),
  // Membership details
  primaryClub: text("primary_club"),
  membershipLevel: text("membership_level"),
  phone: text("phone"),
  street: text("street"),
  aptUnit: text("apt_unit"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  dateOfBirth: text("date_of_birth"),
  // User type and onboarding
  userType: varchar("user_type"), // "pod_seeker" or "pod_leader"
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  // Local authentication fields
  passwordHash: varchar("password_hash"), // For local authentication
  authProvider: varchar("auth_provider").notNull().default("local"), // "local", "google", "apple", "phone", "replit"
  googleId: varchar("google_id"), // For Google OAuth
  appleId: varchar("apple_id"), // For Apple OAuth
  replitId: varchar("replit_id"), // For Replit Auth
  // Phone verification
  phoneVerified: boolean("phone_verified").default(false),
  // Account verification
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pods = pgTable("pods", {
  id: serial("id").primaryKey(),
  leadId: varchar("lead_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  clubName: text("club_name").notNull(), // "Bay Club Courtside", "Bay Club San Francisco", etc.
  clubRegion: text("club_region").notNull(), // "San Jose", "San Francisco", etc.
  clubAddress: text("club_address").notNull(), // Full address of the club
  city: text("city"), // City where the club is located
  zipCode: text("zip_code"), // Zip code for the club location
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
  exitTimelineDays: integer("exit_timeline_days").default(30), // Days after billing cycle end before member exit
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: 'set null' }),
});

export const joinRequests = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  message: text("message"), // Optional message from requester
  userInfo: json("user_info").$type<{
    name: string;
    email: string;
    phone?: string;
    membershipId?: string;
  }>(), // Contact information for the join request
  emailStatus: text("email_status").notNull().default("sent"), // "sent", "failed", "pending"
  membershipVerificationStatus: text("membership_verification_status").notNull().default("not_sent"), // "not_sent", "sent", "confirmed"
  membershipVerificationSentAt: timestamp("membership_verification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: 'set null' }),
});

export const podMembers = pgTable("pod_members", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: 'set null' }),
});

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number").notNull(),
  otp: varchar("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email 2FA verification codes table
export const email2FAVerifications = pgTable("email_2fa_verifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "completed"
  reason: text("reason"), // Optional reason for leaving
  userInfo: json("user_info").$type<{
    name: string;
    email: string;
    phone?: string;
  }>(),
  leaderResponse: text("leader_response"), // Optional response from leader
  exitDate: timestamp("exit_date"), // Calculated based on billing cycle end + exit timeline
  approvedAt: timestamp("approved_at"), // When the request was approved
  emailStatus: text("email_status").notNull().default("sent"), // "sent", "failed", "pending"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  membershipId: true,
  preferredRegion: true,
  userType: true,
  hasCompletedOnboarding: true,
  passwordHash: true,
  authProvider: true,
  googleId: true,
  appleId: true,
  replitId: true,
  phone: true,
  phoneVerified: true,
  isEmailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpires: true,
}).partial().extend({
  email: z.string().email(),
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  membershipId: true,
  preferredRegion: true,
  primaryClub: true,
  membershipLevel: true,
  phone: true,
  street: true,
  aptUnit: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  dateOfBirth: true,
  userType: true,
  hasCompletedOnboarding: true,
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

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertEmail2FAVerificationSchema = createInsertSchema(email2FAVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPod = z.infer<typeof insertPodSchema>;
export type Pod = typeof pods.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type PodMember = typeof podMembers.$inferSelect;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type Email2FAVerification = typeof email2FAVerifications.$inferSelect;
export type InsertEmail2FAVerification = z.infer<typeof insertEmail2FAVerificationSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

// Messaging tables
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id, { onDelete: 'cascade' }).notNull(),
  type: varchar("type").notNull(), // 'direct' | 'group'
  memberId: varchar("member_id").references(() => users.id, { onDelete: 'cascade' }), // null for group chats
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Platform settings for configurable fees
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key").unique().notNull(), // e.g., "platform_fee_percentage"
  settingValue: text("setting_value").notNull(), // stored as string, parsed as needed
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

// Pod payments tracking
export const podPayments = pgTable("pod_payments", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").references(() => pods.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  // Polar checkout/order tracking
  polarCheckoutId: varchar("polar_checkout_id"),
  polarOrderId: varchar("polar_order_id"),
  polarSubscriptionId: varchar("polar_subscription_id"),
  // Payment status
  status: varchar("status").notNull().default("pending"), // "pending", "processing", "completed", "failed", "expired"
  // Amount breakdown (all in cents)
  baseAmount: integer("base_amount").notNull(), // Pod membership fee
  platformFeeAmount: integer("platform_fee_amount").notNull(), // Platform fee
  totalAmount: integer("total_amount").notNull(), // Total charged
  platformFeePercentage: decimal("platform_fee_percentage", { precision: 5, scale: 2 }).notNull(), // Fee % at time of payment
  currency: varchar("currency").notNull().default("usd"),
  // Billing period
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  // Metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  checkoutUrl: text("checkout_url"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertPodPaymentSchema = createInsertSchema(podPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PodPayment = typeof podPayments.$inferSelect;
export type InsertPodPayment = z.infer<typeof insertPodPaymentSchema>;
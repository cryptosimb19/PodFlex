import {
  users,
  pods,
  joinRequests,
  podMembers,
  otpVerifications,
  email2FAVerifications,
  leaveRequests,
  platformSettings,
  podPayments,
  conversations,
  messages,
  podReviews,
  type User,
  type Pod,
  type InsertUser,
  type InsertPod,
  type JoinRequest,
  type InsertJoinRequest,
  type PodMember,
  type UpsertUser,
  type OtpVerification,
  type InsertOtpVerification,
  type Email2FAVerification,
  type InsertEmail2FAVerification,
  type LeaveRequest,
  type InsertLeaveRequest,
  type PlatformSetting,
  type InsertPlatformSetting,
  type PodPayment,
  type InsertPodPayment,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type PodReview,
  type InsertPodReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, inArray, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<User | undefined>;
  
  // Email verification operations
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: string): Promise<User | undefined>;
  updateUserVerificationToken(userId: string, token: string, expires: Date): Promise<User | undefined>;
  
  // OTP verification operations
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getOtpVerification(phoneNumber: string): Promise<OtpVerification | undefined>;
  markOtpAsVerified(phoneNumber: string): Promise<void>;
  cleanupExpiredOtps(): Promise<void>;
  
  // Email 2FA verification operations
  createEmail2FAVerification(verification: InsertEmail2FAVerification): Promise<Email2FAVerification>;
  getEmail2FAVerification(userId: string): Promise<Email2FAVerification | undefined>;
  verifyEmail2FACode(userId: string, code: string): Promise<boolean>;
  deleteEmail2FAVerification(userId: string): Promise<void>;
  cleanupExpiredEmail2FACodes(): Promise<void>;
  
  // Pod operations
  getPods(): Promise<Pod[]>;
  getPod(id: number): Promise<Pod | undefined>;
  getPodWithLeader(id: number): Promise<(Pod & { leaderName: string | null; leaderPhone: string | null; leaderEmail: string | null; leaderProfileImage: string | null }) | undefined>;
  getPodsByLeaderId(leadId: string): Promise<Pod[]>;
  searchPods(query: string): Promise<Pod[]>;
  filterPods(filters: { region?: string; membershipType?: string; amenities?: string[] }): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
  updatePod(id: number, podData: Partial<Pod>): Promise<Pod | undefined>;
  updatePodAvailability(id: number, availableSpots: number): Promise<Pod | undefined>;
  deletePod(id: number, userId: string): Promise<boolean>;
  getDeletedPods(): Promise<Pod[]>;
  getDeletedJoinRequests(): Promise<JoinRequest[]>;
  getDeletedPodMembers(): Promise<PodMember[]>;
  
  // Join request operations
  createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest>;
  getJoinRequest(id: number): Promise<JoinRequest | undefined>;
  getJoinRequestsForPod(podId: number): Promise<JoinRequest[]>;
  getJoinRequestsForUser(userId: string): Promise<JoinRequest[]>;
  updateJoinRequestStatus(id: number, status: "accepted" | "rejected" | "cancelled" | "left"): Promise<JoinRequest | undefined>;
  updateJoinRequestEmailStatus(id: number, emailStatus: string): Promise<JoinRequest | undefined>;
  updateMembershipVerificationStatus(id: number, status: "not_sent" | "sent" | "confirmed"): Promise<JoinRequest | undefined>;
  cancelOtherPendingRequests(userId: string, excludeRequestId: number): Promise<JoinRequest[]>;
  
  // Pod member operations
  getPodMembers(podId: number): Promise<PodMember[]>;
  addPodMember(podId: number, userId: string): Promise<PodMember>;
  removePodMember(podId: number, userId: string, removedBy: string): Promise<PodMember | undefined>;
  
  // Leave request operations
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequestsForPod(podId: number): Promise<LeaveRequest[]>;
  getLeaveRequestsForUser(userId: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  getPendingLeaveRequestForUserInPod(userId: string, podId: number): Promise<LeaveRequest | undefined>;
  updateLeaveRequestStatus(id: number, status: "approved" | "rejected", leaderResponse?: string): Promise<LeaveRequest | undefined>;
  updateLeaveRequestEmailStatus(id: number, emailStatus: string): Promise<LeaveRequest | undefined>;
  
  // Initialization
  initializeSamplePods(): Promise<void>;
  
  // Platform settings operations
  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  upsertPlatformSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<PlatformSetting>;
  
  // Pod payment operations
  createPodPayment(payment: InsertPodPayment): Promise<PodPayment>;
  getPodPayment(id: number): Promise<PodPayment | undefined>;
  getPodPaymentByCheckoutId(checkoutId: string): Promise<PodPayment | undefined>;
  getPodPaymentsForUser(userId: string): Promise<PodPayment[]>;
  getPodPaymentsForPod(podId: number): Promise<PodPayment[]>;
  updatePodPaymentStatus(id: number, status: string, polarOrderId?: string, paidAt?: Date): Promise<PodPayment | undefined>;
  getPendingPaymentsForUserInPod(userId: string, podId: number): Promise<PodPayment[]>;
  
  // Enhanced leave request operations
  updateLeaveRequestWithExitDate(id: number, status: "approved" | "rejected", exitDate: Date | null, leaderResponse?: string): Promise<LeaveRequest | undefined>;
  updateLeaveRequestOutstandingBalance(id: number, outstandingBalance: number): Promise<LeaveRequest | undefined>;
  markLeaveRequestBalancePaid(id: number): Promise<LeaveRequest | undefined>;
  getUserApprovedLeaveRequest(userId: string): Promise<LeaveRequest | undefined>;

  // Messaging operations
  getOrCreateGroupConversation(podId: number): Promise<Conversation>;
  getOrCreateDirectConversation(podId: number, participant1Id: string, participant2Id: string): Promise<Conversation>;
  getConversationsForUser(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getMessagesForConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markConversationRead(conversationId: number, userId: string): Promise<void>;
  getUnreadCountForUser(userId: string): Promise<number>;

  // Review operations
  getReviewsForPod(podId: number): Promise<(PodReview & { reviewerName: string | null; reviewerImage: string | null })[]>;
  getReviewByUserForPod(userId: string, podId: number): Promise<PodReview | undefined>;
  createReview(review: InsertPodReview): Promise<PodReview>;
  updateReview(id: number, userId: string, rating: number, comment?: string): Promise<PodReview | undefined>;
  deleteReview(id: number, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Additional user operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpires} > NOW()`
        )
      );
    return user;
  }

  async clearPasswordResetToken(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Email verification operations
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async verifyUserEmail(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserVerificationToken(userId: string, token: string, expires: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // OTP verification operations
  async createOtpVerification(otpData: InsertOtpVerification): Promise<OtpVerification> {
    const [otp] = await db
      .insert(otpVerifications)
      .values(otpData)
      .returning();
    return otp;
  }

  async getOtpVerification(phoneNumber: string): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.phoneNumber, phoneNumber),
          eq(otpVerifications.verified, false),
          sql`${otpVerifications.expiresAt} > NOW()`
        )
      )
      .orderBy(sql`${otpVerifications.createdAt} DESC`)
      .limit(1);
    return otp;
  }

  async markOtpAsVerified(phoneNumber: string): Promise<void> {
    // Delete OTP after verification to prevent reuse
    await db
      .delete(otpVerifications)
      .where(
        and(
          eq(otpVerifications.phoneNumber, phoneNumber),
          eq(otpVerifications.verified, false)
        )
      );
  }

  async cleanupExpiredOtps(): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(sql`${otpVerifications.expiresAt} < NOW()`);
  }

  // Email 2FA verification operations
  async createEmail2FAVerification(verification: InsertEmail2FAVerification): Promise<Email2FAVerification> {
    // Delete any existing verification codes for this user first
    await db.delete(email2FAVerifications).where(eq(email2FAVerifications.userId, verification.userId));
    
    const [newVerification] = await db
      .insert(email2FAVerifications)
      .values(verification)
      .returning();
    return newVerification;
  }

  async getEmail2FAVerification(userId: string): Promise<Email2FAVerification | undefined> {
    const [verification] = await db
      .select()
      .from(email2FAVerifications)
      .where(
        and(
          eq(email2FAVerifications.userId, userId),
          eq(email2FAVerifications.verified, false),
          sql`${email2FAVerifications.expiresAt} > NOW()`
        )
      );
    return verification;
  }

  async verifyEmail2FACode(userId: string, code: string): Promise<boolean> {
    const [verification] = await db
      .select()
      .from(email2FAVerifications)
      .where(
        and(
          eq(email2FAVerifications.userId, userId),
          eq(email2FAVerifications.code, code),
          eq(email2FAVerifications.verified, false),
          sql`${email2FAVerifications.expiresAt} > NOW()`
        )
      );
    
    if (!verification) {
      return false;
    }
    
    // Mark as verified
    await db
      .update(email2FAVerifications)
      .set({ verified: true })
      .where(eq(email2FAVerifications.id, verification.id));
    
    return true;
  }

  async deleteEmail2FAVerification(userId: string): Promise<void> {
    await db.delete(email2FAVerifications).where(eq(email2FAVerifications.userId, userId));
  }

  async cleanupExpiredEmail2FACodes(): Promise<void> {
    await db
      .delete(email2FAVerifications)
      .where(sql`${email2FAVerifications.expiresAt} < NOW()`);
  }

  // Pod operations
  async getPods(): Promise<Pod[]> {
    return await db.select().from(pods).where(
      and(
        eq(pods.isActive, true),
        sql`${pods.deletedAt} IS NULL`
      )
    );
  }

  async getPod(id: number): Promise<Pod | undefined> {
    const [pod] = await db.select().from(pods).where(
      and(
        eq(pods.id, id),
        sql`${pods.deletedAt} IS NULL`
      )
    );
    return pod;
  }

  async getPodWithLeader(id: number): Promise<(Pod & { leaderName: string | null; leaderPhone: string | null; leaderEmail: string | null; leaderProfileImage: string | null }) | undefined> {
    const result = await db
      .select({
        pod: pods,
        leaderFirstName: users.firstName,
        leaderLastName: users.lastName,
        leaderPhone: users.phone,
        leaderEmail: users.email,
        leaderProfileImage: users.profileImageUrl,
      })
      .from(pods)
      .leftJoin(users, eq(pods.leadId, users.id))
      .where(
        and(
          eq(pods.id, id),
          sql`${pods.deletedAt} IS NULL`
        )
      );
    
    if (result.length === 0) {
      return undefined;
    }
    
    const { pod, leaderFirstName, leaderLastName, leaderPhone, leaderEmail, leaderProfileImage } = result[0];
    const leaderName = [leaderFirstName, leaderLastName].filter(Boolean).join(' ') || null;
    
    return {
      ...pod,
      leaderName,
      leaderPhone,
      leaderEmail,
      leaderProfileImage,
    };
  }

  async getPodsByLeaderId(leadId: string): Promise<Pod[]> {
    return await db.select().from(pods).where(
      and(
        eq(pods.leadId, leadId),
        sql`${pods.deletedAt} IS NULL`
      )
    );
  }

  async searchPods(query: string): Promise<Pod[]> {
    return await db
      .select()
      .from(pods)
      .where(
        and(
          eq(pods.isActive, true),
          like(pods.title, `%${query}%`),
          sql`${pods.deletedAt} IS NULL`
        )
      );
  }

  async filterPods(filters: { region?: string; membershipType?: string; amenities?: string[] }): Promise<Pod[]> {
    let conditions = [
      eq(pods.isActive, true),
      sql`${pods.deletedAt} IS NULL`
    ];
    
    if (filters.region) {
      conditions.push(eq(pods.clubRegion, filters.region));
    }
    
    if (filters.membershipType) {
      conditions.push(eq(pods.membershipType, filters.membershipType));
    }

    return await db
      .select()
      .from(pods)
      .where(and(...conditions));
  }

  async createPod(podData: InsertPod): Promise<Pod> {
    const [pod] = await db
      .insert(pods)
      .values(podData)
      .returning();
    return pod;
  }

  async updatePod(id: number, podData: Partial<Pod>): Promise<Pod | undefined> {
    const [pod] = await db
      .update(pods)
      .set(podData)
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }

  async updatePodAvailability(id: number, availableSpots: number): Promise<Pod | undefined> {
    const [pod] = await db
      .update(pods)
      .set({ availableSpots })
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }

  async deletePod(id: number, userId: string): Promise<boolean> {
    try {
      const now = new Date();
      
      // Use transaction to ensure data integrity
      await db.transaction(async (tx) => {
        // 1. Soft delete all join requests for this pod
        await tx
          .update(joinRequests)
          .set({ deletedAt: now, deletedBy: userId })
          .where(eq(joinRequests.podId, id));
        
        // 2. Soft delete all pod members
        await tx
          .update(podMembers)
          .set({ deletedAt: now, deletedBy: userId })
          .where(eq(podMembers.podId, id));
        
        // 3. Soft delete the pod itself
        const deletedPods = await tx
          .update(pods)
          .set({ deletedAt: now, deletedBy: userId })
          .where(eq(pods.id, id))
          .returning();
        
        if (deletedPods.length === 0) {
          throw new Error('Pod not found');
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error soft-deleting pod:', error);
      return false;
    }
  }

  // Audit log methods to view deleted records
  async getDeletedPods(): Promise<Pod[]> {
    return await db
      .select()
      .from(pods)
      .where(sql`${pods.deletedAt} IS NOT NULL`)
      .orderBy(sql`${pods.deletedAt} DESC`);
  }

  async getDeletedJoinRequests(): Promise<JoinRequest[]> {
    return await db
      .select()
      .from(joinRequests)
      .where(sql`${joinRequests.deletedAt} IS NOT NULL`)
      .orderBy(sql`${joinRequests.deletedAt} DESC`);
  }

  async getDeletedPodMembers(): Promise<PodMember[]> {
    return await db
      .select()
      .from(podMembers)
      .where(sql`${podMembers.deletedAt} IS NOT NULL`)
      .orderBy(sql`${podMembers.deletedAt} DESC`);
  }

  // Join request operations
  async createJoinRequest(requestData: InsertJoinRequest): Promise<JoinRequest> {
    const [request] = await db
      .insert(joinRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getJoinRequest(id: number): Promise<JoinRequest | undefined> {
    const [request] = await db.select().from(joinRequests).where(eq(joinRequests.id, id));
    return request;
  }

  async getJoinRequestsForPod(podId: number): Promise<JoinRequest[]> {
    return await db
      .select()
      .from(joinRequests)
      .where(
        and(
          eq(joinRequests.podId, podId),
          sql`${joinRequests.deletedAt} IS NULL`
        )
      );
  }

  async getJoinRequestsForUser(userId: string): Promise<JoinRequest[]> {
    return await db
      .select()
      .from(joinRequests)
      .where(
        and(
          eq(joinRequests.userId, userId),
          sql`${joinRequests.deletedAt} IS NULL`
        )
      );
  }

  async updateJoinRequestStatus(id: number, status: "accepted" | "rejected" | "cancelled" | "left"): Promise<JoinRequest | undefined> {
    const [request] = await db
      .update(joinRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(joinRequests.id, id))
      .returning();
    return request;
  }

  async updateJoinRequestEmailStatus(id: number, emailStatus: string): Promise<JoinRequest | undefined> {
    const [request] = await db
      .update(joinRequests)
      .set({ emailStatus, updatedAt: new Date() })
      .where(eq(joinRequests.id, id))
      .returning();
    return request;
  }

  async updateMembershipVerificationStatus(id: number, status: "not_sent" | "sent" | "confirmed"): Promise<JoinRequest | undefined> {
    const updateData: { membershipVerificationStatus: string; updatedAt: Date; membershipVerificationSentAt?: Date } = {
      membershipVerificationStatus: status,
      updatedAt: new Date(),
    };
    
    // Set the sentAt timestamp when marking as sent
    if (status === "sent") {
      updateData.membershipVerificationSentAt = new Date();
    }
    
    const [request] = await db
      .update(joinRequests)
      .set(updateData)
      .where(eq(joinRequests.id, id))
      .returning();
    return request;
  }

  async cancelOtherPendingRequests(userId: string, excludeRequestId: number): Promise<JoinRequest[]> {
    const cancelledRequests = await db
      .update(joinRequests)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(joinRequests.userId, userId),
          eq(joinRequests.status, "pending"),
          sql`${joinRequests.id} != ${excludeRequestId}`,
          sql`${joinRequests.deletedAt} IS NULL`
        )
      )
      .returning();
    return cancelledRequests;
  }

  // Pod member operations
  async getPodMembers(podId: number): Promise<PodMember[]> {
    return await db
      .select()
      .from(podMembers)
      .where(
        and(
          eq(podMembers.podId, podId),
          eq(podMembers.isActive, true),
          sql`${podMembers.deletedAt} IS NULL`
        )
      );
  }

  async addPodMember(podId: number, userId: string): Promise<PodMember> {
    const [member] = await db
      .insert(podMembers)
      .values({ podId, userId })
      .returning();
    return member;
  }

  async removePodMember(podId: number, userId: string, removedBy: string): Promise<PodMember | undefined> {
    const [member] = await db
      .update(podMembers)
      .set({ 
        isActive: false,
        deletedAt: new Date(),
        deletedBy: removedBy
      })
      .where(
        and(
          eq(podMembers.podId, podId),
          eq(podMembers.userId, userId),
          eq(podMembers.isActive, true),
          sql`${podMembers.deletedAt} IS NULL`
        )
      )
      .returning();
    return member;
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db
      .insert(leaveRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getLeaveRequestsForPod(podId: number): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.podId, podId))
      .orderBy(sql`${leaveRequests.createdAt} DESC`);
  }

  async getLeaveRequestsForUser(userId: string): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.userId, userId))
      .orderBy(sql`${leaveRequests.createdAt} DESC`);
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id));
    return request;
  }

  async getPendingLeaveRequestForUserInPod(userId: string, podId: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.userId, userId),
          eq(leaveRequests.podId, podId),
          eq(leaveRequests.status, "pending")
        )
      );
    return request;
  }

  async updateLeaveRequestStatus(id: number, status: "approved" | "rejected", leaderResponse?: string): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ 
        status, 
        leaderResponse: leaderResponse || null,
        updatedAt: new Date() 
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  async updateLeaveRequestEmailStatus(id: number, emailStatus: string): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ emailStatus, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  // Initialize sample data
  async initializeSamplePods(): Promise<void> {
    // Only initialize if pods table is empty (first-time setup)
    const existingPods = await db.select().from(pods).limit(1);
    if (existingPods.length > 0) {
      console.log('[Storage] Pods already exist, skipping initialization');
      return;
    }
    
    console.log('[Storage] Initializing sample pods for first-time setup');
    
    // IMPORTANT: Only delete sample data, NOT real user data
    // Delete sample pods and related data (sample pods have leadId starting with "sample-lead-")
    const samplePodIds = await db.select({ id: pods.id }).from(pods).where(like(pods.leadId, 'sample-lead-%'));
    if (samplePodIds.length > 0) {
      const podIds = samplePodIds.map(p => p.id);
      await db.delete(podMembers).where(inArray(podMembers.podId, podIds));
      await db.delete(joinRequests).where(inArray(joinRequests.podId, podIds));
    }
    await db.delete(pods).where(like(pods.leadId, 'sample-lead-%'));
    
    // Delete only sample users (those with IDs starting with "sample-" or "member-")
    await db.delete(users).where(
      or(
        like(users.id, 'sample-%'),
        like(users.id, 'member-%')
      )
    );

    // First create sample users for pod leads
    const sampleUsers = [
      { id: "sample-lead-1", email: "lead1@example.com", firstName: "Sarah", lastName: "Chen", profileImageUrl: null },
      { id: "sample-lead-2", email: "lead2@example.com", firstName: "Michael", lastName: "Rodriguez", profileImageUrl: null },
      { id: "sample-lead-3", email: "lead3@example.com", firstName: "Emily", lastName: "Thompson", profileImageUrl: null },
      { id: "sample-lead-4", email: "lead4@example.com", firstName: "David", lastName: "Kim", profileImageUrl: null },
      { id: "sample-lead-5", email: "lead5@example.com", firstName: "Jessica", lastName: "Patel", profileImageUrl: null },
      { id: "sample-lead-6", email: "lead6@example.com", firstName: "Ryan", lastName: "Johnson", profileImageUrl: null },
      { id: "sample-lead-7", email: "lead7@example.com", firstName: "Amanda", lastName: "Davis", profileImageUrl: null },
      { id: "sample-lead-8", email: "lead8@example.com", firstName: "Kevin", lastName: "Brown", profileImageUrl: null },
      { id: "sample-lead-9", email: "lead9@example.com", firstName: "Lisa", lastName: "Wilson", profileImageUrl: null },
      { id: "sample-lead-10", email: "lead10@example.com", firstName: "James", lastName: "Martinez", profileImageUrl: null },
      { id: "sample-lead-11", email: "lead11@example.com", firstName: "Nicole", lastName: "Anderson", profileImageUrl: null },
      { id: "sample-lead-12", email: "lead12@example.com", firstName: "Tyler", lastName: "Taylor", profileImageUrl: null },
      { id: "sample-lead-13", email: "lead13@example.com", firstName: "Rachel", lastName: "Moore", profileImageUrl: null },
      { id: "sample-lead-14", email: "lead14@example.com", firstName: "Alex", lastName: "Garcia", profileImageUrl: null },
      { id: "sample-lead-15", email: "lead15@example.com", firstName: "Samantha", lastName: "Lee", profileImageUrl: null },
      // Add sample members too
      { id: "member-1", email: "member1@example.com", firstName: "John", lastName: "Smith", profileImageUrl: null },
      { id: "member-2", email: "member2@example.com", firstName: "Jane", lastName: "Doe", profileImageUrl: null },
      { id: "member-3", email: "member3@example.com", firstName: "Bob", lastName: "Johnson", profileImageUrl: null },
      { id: "member-4", email: "member4@example.com", firstName: "Alice", lastName: "Williams", profileImageUrl: null },
      { id: "member-5", email: "member5@example.com", firstName: "Charlie", lastName: "Brown", profileImageUrl: null },
      { id: "member-6", email: "member6@example.com", firstName: "Diana", lastName: "Miller", profileImageUrl: null },
      { id: "member-7", email: "member7@example.com", firstName: "Frank", lastName: "Davis", profileImageUrl: null },
      { id: "member-8", email: "member8@example.com", firstName: "Grace", lastName: "Wilson", profileImageUrl: null },
      { id: "member-9", email: "member9@example.com", firstName: "Henry", lastName: "Moore", profileImageUrl: null },
      { id: "member-10", email: "member10@example.com", firstName: "Ivy", lastName: "Taylor", profileImageUrl: null },
      { id: "member-11", email: "member11@example.com", firstName: "Jack", lastName: "Anderson", profileImageUrl: null },
      { id: "member-12", email: "member12@example.com", firstName: "Kate", lastName: "Thomas", profileImageUrl: null },
      { id: "member-13", email: "member13@example.com", firstName: "Leo", lastName: "Jackson", profileImageUrl: null },
      { id: "member-14", email: "member14@example.com", firstName: "Mia", lastName: "White", profileImageUrl: null },
      { id: "member-15", email: "member15@example.com", firstName: "Nick", lastName: "Harris", profileImageUrl: null },
      { id: "member-16", email: "member16@example.com", firstName: "Olivia", lastName: "Martin", profileImageUrl: null },
      { id: "member-17", email: "member17@example.com", firstName: "Paul", lastName: "Thompson", profileImageUrl: null },
      { id: "member-18", email: "member18@example.com", firstName: "Quinn", lastName: "Garcia", profileImageUrl: null },
      { id: "member-19", email: "member19@example.com", firstName: "Ruby", lastName: "Martinez", profileImageUrl: null },
      { id: "member-20", email: "member20@example.com", firstName: "Steve", lastName: "Robinson", profileImageUrl: null },
      { id: "member-21", email: "member21@example.com", firstName: "Tina", lastName: "Clark", profileImageUrl: null },
      { id: "member-22", email: "member22@example.com", firstName: "Uma", lastName: "Rodriguez", profileImageUrl: null },
      { id: "member-23", email: "member23@example.com", firstName: "Victor", lastName: "Lewis", profileImageUrl: null },
      { id: "member-24", email: "member24@example.com", firstName: "Wendy", lastName: "Lee", profileImageUrl: null },
      { id: "member-25", email: "member25@example.com", firstName: "Xavier", lastName: "Walker", profileImageUrl: null },
      { id: "member-26", email: "member26@example.com", firstName: "Yara", lastName: "Hall", profileImageUrl: null },
      { id: "member-27", email: "member27@example.com", firstName: "Zoe", lastName: "Allen", profileImageUrl: null },
      { id: "member-28", email: "member28@example.com", firstName: "Adam", lastName: "Young", profileImageUrl: null },
      { id: "member-29", email: "member29@example.com", firstName: "Beth", lastName: "Hernandez", profileImageUrl: null },
      { id: "member-30", email: "member30@example.com", firstName: "Carl", lastName: "King", profileImageUrl: null },
      { id: "member-31", email: "member31@example.com", firstName: "Dana", lastName: "Wright", profileImageUrl: null },
      { id: "member-32", email: "member32@example.com", firstName: "Eric", lastName: "Lopez", profileImageUrl: null },
      { id: "member-33", email: "member33@example.com", firstName: "Fiona", lastName: "Hill", profileImageUrl: null },
      { id: "member-34", email: "member34@example.com", firstName: "Greg", lastName: "Green", profileImageUrl: null },
      { id: "member-35", email: "member35@example.com", firstName: "Helen", lastName: "Adams", profileImageUrl: null }
    ];

    // Insert users first
    await db.insert(users).values(sampleUsers);

    const samplePods: InsertPod[] = [
      {
        leadId: "sample-lead-1", 
        clubName: "Courtside",
        clubRegion: "San Jose",
        clubAddress: "5545 Cribari Bend, San Jose, CA 95123",
        membershipType: "Executive Club South Bay",
        title: "Active Tennis Group at Courtside",
        description: "Join our friendly tennis group! We play 3-4 times per week and love the competition. Looking for intermediate to advanced players who can commit to regular play. Great courts and excellent pro shop.",
        costPerPerson: 18900, // $189/month
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["tennis", "fitness", "pool", "dining"],
        rules: "Must play tennis at least 2x per week. Respectful court etiquette required.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-2",
        clubName: "Redwood Shores", 
        clubRegion: "San Francisco",
        clubAddress: "928 Shoreline Dr, Redwood City, CA 94065",
        membershipType: "Single Site",
        title: "Early Morning Swimmers",
        description: "Perfect for professionals who swim before work. We share lap swimming costs and coordinate early morning sessions. Pool is pristine and rarely crowded at 6 AM.",
        costPerPerson: 17500, // $175/month
        totalSpots: 3,
        availableSpots: 1,
        amenities: ["pool", "fitness", "spa"],
        rules: "Must swim before 8 AM on weekdays. Pool etiquette and lane sharing required.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-3",
        clubName: "Financial District",
        clubRegion: "San Francisco", 
        clubAddress: "505 Montgomery St, San Francisco, CA 94111",
        membershipType: "Executive Club Bay Area",
        title: "Downtown Professionals Network",
        description: "Business networking meets fitness in the heart of SF. Perfect for finance and tech professionals. Access to downtown clubs plus networking events.",
        costPerPerson: 20900, // $209/month
        totalSpots: 6,
        availableSpots: 3,
        amenities: ["fitness", "business_center", "dining", "spa"],
        rules: "Professional conduct required. Networking events encouraged.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-4",
        clubName: "San Francisco",
        clubRegion: "San Francisco",
        clubAddress: "150 Greenwich St, San Francisco, CA 94111",
        membershipType: "Campus Bay Area",
        title: "Family Fitness Fun",
        description: "Great for families with teens. Kids love the pool and fitness classes. Perfect for busy parents who want family time combined with exercise.",
        costPerPerson: 19500, // $195/month  
        totalSpots: 5,
        availableSpots: 2,
        amenities: ["pool", "fitness", "kids_programs", "dining"],
        rules: "Children must be supervised. Family-friendly atmosphere maintained.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-5",
        clubName: "Walnut Creek",
        clubRegion: "East Bay",
        clubAddress: "1375 Locust St, Walnut Creek, CA 94596",
        membershipType: "East Bay Campus", 
        title: "Pickleball Enthusiasts",
        description: "Obsessed with pickleball? Join us! We play daily and compete in local tournaments. Great courts and growing pickleball community.",
        costPerPerson: 16800, // $168/month
        totalSpots: 4,
        availableSpots: 1,
        amenities: ["pickleball", "tennis", "fitness", "pool"],
        rules: "Must play pickleball regularly. Tournament participation encouraged.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-6",
        clubName: "Santa Clara",
        clubRegion: "San Jose", 
        clubAddress: "5050 Stevens Creek Blvd, Santa Clara, CA 95051",
        membershipType: "Single Site",
        title: "Tech Worker Fitness",
        description: "Perfect for tech workers in South Bay. Flexible schedules welcome. Great for relieving work stress with consistent workout routines.",
        costPerPerson: 15000, // $150/month
        totalSpots: 5,
        availableSpots: 3,
        amenities: ["fitness", "pool", "basketball"],
        rules: "Flexible schedule understanding. Professional courtesy expected.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-7",
        clubName: "Fremont",
        clubRegion: "East Bay",
        clubAddress: "47000 Warm Springs Blvd, Fremont, CA 94539", 
        membershipType: "Single Site",
        title: "Marathon Training Group",
        description: "Training for Bay Area marathons and half-marathons. Group runs, training plans, and race support. Welcoming to all pace levels.",
        costPerPerson: 16200, // $162/month
        totalSpots: 6,
        availableSpots: 4,
        amenities: ["fitness", "track", "pool", "spa"],
        rules: "Commitment to training schedule. Supportive of all fitness levels.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-8",
        clubName: "Marin",
        clubRegion: "North Bay",
        clubAddress: "100 Bon Air Center, Greenbrae, CA 94904",
        membershipType: "Single Site", 
        title: "Yoga and Wellness Focus",
        description: "Centered on yoga, meditation, and wellness. Beautiful Marin location with peaceful atmosphere. Great for stress relief and mindfulness.",
        costPerPerson: 18500, // $185/month
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["yoga", "spa", "pool", "meditation"],
        rules: "Respectful, peaceful atmosphere. Wellness-focused mindset.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-9",
        clubName: "Gateway",
        clubRegion: "San Francisco",
        clubAddress: "2500 Marin St, San Francisco, CA 94124",
        membershipType: "Single Site",
        title: "Basketball League Players", 
        description: "Join our competitive basketball league! Games twice weekly with playoffs. Looking for intermediate to advanced players who love team sports.",
        costPerPerson: 15800, // $158/month
        totalSpots: 8,
        availableSpots: 5,
        amenities: ["basketball", "fitness", "pool"],
        rules: "Consistent attendance required. Good sportsmanship essential.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-10",
        clubName: "South San Francisco", 
        clubRegion: "San Francisco",
        clubAddress: "900 Dubuque Ave, South San Francisco, CA 94080",
        membershipType: "Single Site",
        title: "Young Professionals Mixer",
        description: "20s and 30s professionals mixing fitness with social networking. Happy hours, group classes, and weekend activities. Great for meeting new people.",
        costPerPerson: 17200, // $172/month
        totalSpots: 6,
        availableSpots: 4,
        amenities: ["fitness", "dining", "social_events", "pool"],
        rules: "Ages 22-38 preferred. Social and professional networking encouraged.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-11",
        clubName: "Corte Madera",
        clubRegion: "North Bay",
        clubAddress: "1450 Tamalpais Ave, Corte Madera, CA 94925",
        membershipType: "Single Site",
        title: "Spa and Relaxation Group",
        description: "Focus on spa services, massages, and relaxation. Perfect for busy professionals who need to unwind. Beautiful Marin location.",
        costPerPerson: 20200, // $202/month
        totalSpots: 3,
        availableSpots: 1,
        amenities: ["spa", "massage", "pool", "relaxation"],
        rules: "Quiet, relaxing atmosphere maintained. Advance spa bookings coordinated.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-12",
        clubName: "Los Altos",
        clubRegion: "San Jose", 
        clubAddress: "4625 El Camino Real, Los Altos, CA 94022",
        membershipType: "Single Site",
        title: "Parents Escape Pod",
        description: "Parents need fitness time too! Coordinate childcare and workout schedules. Supportive community for busy moms and dads in Los Altos area.",
        costPerPerson: 18200, // $182/month
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["fitness", "pool", "kids_area", "spa"],
        rules: "Understanding of parent schedules. Childcare coordination support.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-13",
        clubName: "Bellevue",
        clubRegion: "Seattle",
        clubAddress: "500 108th Ave NE, Bellevue, WA 98004",
        membershipType: "Campus Washington",
        title: "Seattle Tech Networking",
        description: "Pacific Northwest tech professionals. Access to all Washington locations. Great for Amazon, Microsoft, and startup employees.",
        costPerPerson: 19800, // $198/month
        totalSpots: 5,
        availableSpots: 3,
        amenities: ["fitness", "business_center", "dining", "pool"],
        rules: "Tech industry professionals preferred. Networking and collaboration encouraged.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-14",
        clubName: "Portland",
        clubRegion: "Portland", 
        clubAddress: "4455 SW Griffith Dr, Beaverton, OR 97005",
        membershipType: "Single Site",
        title: "Outdoor Adventure Group", 
        description: "Love hiking, biking, and outdoor activities? We use the club for training and recovery between outdoor adventures. Great Pacific Northwest community.",
        costPerPerson: 16600, // $166/month
        totalSpots: 5,
        availableSpots: 3,
        amenities: ["fitness", "pool", "outdoor_training", "spa"],
        rules: "Active outdoor lifestyle. Adventure planning and group trips welcomed.",
        imageUrl: null
      },
      {
        leadId: "sample-lead-15",
        clubName: "San Ramon",
        clubRegion: "East Bay",
        clubAddress: "9000 Broadmoor Dr, San Ramon, CA 94583",
        membershipType: "Single Site",
        title: "55+ Active Lifestyle",
        description: "Active adults 55+ enjoying fitness, social activities, and wellness programs. Slower pace but consistent activity. Welcoming community.",
        costPerPerson: 15600, // $156/month
        totalSpots: 4,
        availableSpots: 1,
        amenities: ["fitness", "pool", "spa", "social_programs"],
        rules: "Ages 55+ preferred. Respectful, mature community atmosphere.",
        imageUrl: null
      }
    ];

    // Insert all sample pods and get their IDs
    const insertedPods = await db.insert(pods).values(samplePods).returning();
    
    // Add some sample members to make the pods look active using actual pod IDs
    const sampleMembers = [
      { podId: insertedPods[0].id, userId: "member-1" },
      { podId: insertedPods[0].id, userId: "member-2" },
      { podId: insertedPods[1].id, userId: "member-3" },
      { podId: insertedPods[1].id, userId: "member-4" },
      { podId: insertedPods[2].id, userId: "member-5" },
      { podId: insertedPods[2].id, userId: "member-6" },
      { podId: insertedPods[2].id, userId: "member-7" },
      { podId: insertedPods[3].id, userId: "member-8" },
      { podId: insertedPods[3].id, userId: "member-9" },
      { podId: insertedPods[3].id, userId: "member-10" },
      { podId: insertedPods[4].id, userId: "member-11" },
      { podId: insertedPods[4].id, userId: "member-12" },
      { podId: insertedPods[4].id, userId: "member-13" },
      { podId: insertedPods[5].id, userId: "member-14" },
      { podId: insertedPods[5].id, userId: "member-15" },
      { podId: insertedPods[6].id, userId: "member-16" },
      { podId: insertedPods[6].id, userId: "member-17" },
      { podId: insertedPods[7].id, userId: "member-18" },
      { podId: insertedPods[7].id, userId: "member-19" },
      { podId: insertedPods[8].id, userId: "member-20" },
      { podId: insertedPods[8].id, userId: "member-21" },
      { podId: insertedPods[8].id, userId: "member-22" },
      { podId: insertedPods[9].id, userId: "member-23" },
      { podId: insertedPods[9].id, userId: "member-24" },
      { podId: insertedPods[10].id, userId: "member-25" },
      { podId: insertedPods[10].id, userId: "member-26" },
      { podId: insertedPods[11].id, userId: "member-27" },
      { podId: insertedPods[11].id, userId: "member-28" },
      { podId: insertedPods[12].id, userId: "member-29" },
      { podId: insertedPods[12].id, userId: "member-30" },
      { podId: insertedPods[13].id, userId: "member-31" },
      { podId: insertedPods[13].id, userId: "member-32" },
      { podId: insertedPods[14].id, userId: "member-33" },
      { podId: insertedPods[14].id, userId: "member-34" },
      { podId: insertedPods[14].id, userId: "member-35" }
    ];

    await db.insert(podMembers).values(sampleMembers);
  }

  // Platform settings operations
  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.settingKey, key));
    return setting;
  }

  async upsertPlatformSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<PlatformSetting> {
    const [setting] = await db
      .insert(platformSettings)
      .values({
        settingKey: key,
        settingValue: value,
        description,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: platformSettings.settingKey,
        set: {
          settingValue: value,
          description,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  // Pod payment operations
  async createPodPayment(payment: InsertPodPayment): Promise<PodPayment> {
    const [newPayment] = await db.insert(podPayments).values(payment).returning();
    return newPayment;
  }

  async getPodPayment(id: number): Promise<PodPayment | undefined> {
    const [payment] = await db.select().from(podPayments).where(eq(podPayments.id, id));
    return payment;
  }

  async getPodPaymentByCheckoutId(checkoutId: string): Promise<PodPayment | undefined> {
    const [payment] = await db
      .select()
      .from(podPayments)
      .where(eq(podPayments.polarCheckoutId, checkoutId));
    return payment;
  }

  async getPodPaymentsForUser(userId: string): Promise<PodPayment[]> {
    return db.select().from(podPayments).where(eq(podPayments.userId, userId));
  }

  async getPodPaymentsForPod(podId: number): Promise<PodPayment[]> {
    return db.select().from(podPayments).where(eq(podPayments.podId, podId));
  }

  async updatePodPaymentStatus(id: number, status: string, polarOrderId?: string, paidAt?: Date): Promise<PodPayment | undefined> {
    const updateData: Partial<PodPayment> = {
      status,
      updatedAt: new Date(),
    };
    if (polarOrderId) updateData.polarOrderId = polarOrderId;
    if (paidAt) updateData.paidAt = paidAt;

    const [payment] = await db
      .update(podPayments)
      .set(updateData)
      .where(eq(podPayments.id, id))
      .returning();
    return payment;
  }

  async getPendingPaymentsForUserInPod(userId: string, podId: number): Promise<PodPayment[]> {
    return db
      .select()
      .from(podPayments)
      .where(
        and(
          eq(podPayments.userId, userId),
          eq(podPayments.podId, podId),
          inArray(podPayments.status, ["pending", "processing"])
        )
      );
  }

  async updateLeaveRequestWithExitDate(id: number, status: "approved" | "rejected", exitDate: Date | null, leaderResponse?: string): Promise<LeaveRequest | undefined> {
    const updateData: Partial<LeaveRequest> = {
      status,
      updatedAt: new Date(),
    };
    if (status === "approved") {
      updateData.approvedAt = new Date();
      updateData.exitDate = exitDate;
    }
    if (leaderResponse) updateData.leaderResponse = leaderResponse;

    const [request] = await db
      .update(leaveRequests)
      .set(updateData)
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  async updateLeaveRequestOutstandingBalance(id: number, outstandingBalance: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ outstandingBalance, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  async markLeaveRequestBalancePaid(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ balancePaidAt: new Date(), updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  async getUserApprovedLeaveRequest(userId: string): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.userId, userId),
          eq(leaveRequests.status, "approved")
        )
      )
      .orderBy(leaveRequests.createdAt)
      .limit(1);
    return request;
  }

  // Messaging operations
  async getOrCreateGroupConversation(podId: number): Promise<Conversation> {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.podId, podId), eq(conversations.type, 'group')));
    if (existing) return existing;
    const [created] = await db
      .insert(conversations)
      .values({ podId, type: 'group', memberId: null })
      .returning();
    return created;
  }

  async getOrCreateDirectConversation(podId: number, participant1Id: string, participant2Id: string): Promise<Conversation> {
    // Look for existing conversation between these two participants in either order
    const all = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.podId, podId), eq(conversations.type, 'direct')));
    const existing = all.find(c =>
      (c.memberId === participant1Id && c.participant2Id === participant2Id) ||
      (c.memberId === participant2Id && c.participant2Id === participant1Id)
    );
    if (existing) return existing;
    const [created] = await db
      .insert(conversations)
      .values({ podId, type: 'direct', memberId: participant1Id, participant2Id })
      .returning();
    return created;
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    // Get pods where user is a leader
    const leaderPods = await db.select().from(pods).where(and(eq(pods.leadId, userId), eq(pods.isActive, true)));
    const leaderPodIds = leaderPods.map(p => p.id);

    // Get pods where user is an active member
    const memberEntries = await db.select().from(podMembers).where(and(eq(podMembers.userId, userId), eq(podMembers.isActive, true)));
    const memberPodIds = memberEntries.map(m => m.podId);

    const allPodIds = [...new Set([...leaderPodIds, ...memberPodIds])];
    if (allPodIds.length === 0) return [];

    const allConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.podId, allPodIds));

    // User sees a conversation if:
    // - They're the pod leader (sees all convos in their pod)
    // - It's a group chat in a pod they belong to
    // - They're participant1 (memberId) in a direct chat
    // - They're participant2 (participant2Id) in a direct chat
    // - They're the pod leader and participant2Id is null (legacy: leader is implicit)
    return allConversations.filter(conv => {
      const isLeaderPod = leaderPodIds.includes(conv.podId);
      if (conv.type === 'group') {
        return isLeaderPod || memberPodIds.includes(conv.podId);
      }
      // Direct chat access
      if (isLeaderPod && conv.participant2Id === null) return true; // legacy leader chats
      return conv.memberId === userId || conv.participant2Id === userId;
    });
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async getMessagesForConversation(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    return msg;
  }

  async markConversationRead(conversationId: number, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.senderId} != ${userId}`,
          sql`${messages.readAt} IS NULL`
        )
      );
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    // Get all conversations the user can see
    const userConvos = await this.getConversationsForUser(userId);
    if (userConvos.length === 0) return 0;
    const convoIds = userConvos.map(c => c.id);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, convoIds),
          sql`${messages.senderId} != ${userId}`,
          sql`${messages.readAt} IS NULL`
        )
      );
    return result[0]?.count ?? 0;
  }

  // ── Review methods ──────────────────────────────────────────────────────────

  async getReviewsForPod(podId: number): Promise<(PodReview & { reviewerName: string | null; reviewerImage: string | null })[]> {
    const rows = await db
      .select({
        id: podReviews.id,
        podId: podReviews.podId,
        reviewerId: podReviews.reviewerId,
        rating: podReviews.rating,
        comment: podReviews.comment,
        createdAt: podReviews.createdAt,
        updatedAt: podReviews.updatedAt,
        reviewerName: sql<string | null>`concat(${users.firstName}, ' ', ${users.lastName})`,
        reviewerImage: users.profileImageUrl,
      })
      .from(podReviews)
      .leftJoin(users, eq(podReviews.reviewerId, users.id))
      .where(eq(podReviews.podId, podId))
      .orderBy(sql`${podReviews.createdAt} DESC`);
    return rows;
  }

  async getReviewByUserForPod(userId: string, podId: number): Promise<PodReview | undefined> {
    const [review] = await db
      .select()
      .from(podReviews)
      .where(and(eq(podReviews.reviewerId, userId), eq(podReviews.podId, podId)));
    return review;
  }

  async createReview(review: InsertPodReview): Promise<PodReview> {
    const [created] = await db.insert(podReviews).values(review).returning();
    return created;
  }

  async updateReview(id: number, userId: string, rating: number, comment?: string): Promise<PodReview | undefined> {
    const [updated] = await db
      .update(podReviews)
      .set({ rating, comment: comment ?? null, updatedAt: new Date() })
      .where(and(eq(podReviews.id, id), eq(podReviews.reviewerId, userId)))
      .returning();
    return updated;
  }

  async deleteReview(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(podReviews)
      .where(and(eq(podReviews.id, id), eq(podReviews.reviewerId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
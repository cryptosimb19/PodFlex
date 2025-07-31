import {
  users,
  pods,
  joinRequests,
  podMembers,
  type User,
  type Pod,
  type InsertUser,
  type InsertPod,
  type JoinRequest,
  type InsertJoinRequest,
  type PodMember,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Pod operations
  getPods(): Promise<Pod[]>;
  getPod(id: number): Promise<Pod | undefined>;
  searchPods(query: string): Promise<Pod[]>;
  filterPods(filters: { region?: string; membershipType?: string; amenities?: string[] }): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
  updatePodAvailability(id: number, availableSpots: number): Promise<Pod | undefined>;
  
  // Join request operations
  createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest>;
  getJoinRequestsForPod(podId: number): Promise<JoinRequest[]>;
  getJoinRequestsForUser(userId: string): Promise<JoinRequest[]>;
  updateJoinRequestStatus(id: number, status: "accepted" | "rejected"): Promise<JoinRequest | undefined>;
  
  // Pod member operations
  getPodMembers(podId: number): Promise<PodMember[]>;
  addPodMember(podId: number, userId: string): Promise<PodMember>;
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

  // Pod operations
  async getPods(): Promise<Pod[]> {
    return await db.select().from(pods).where(eq(pods.isActive, true));
  }

  async getPod(id: number): Promise<Pod | undefined> {
    const [pod] = await db.select().from(pods).where(eq(pods.id, id));
    return pod;
  }

  async searchPods(query: string): Promise<Pod[]> {
    return await db
      .select()
      .from(pods)
      .where(
        and(
          eq(pods.isActive, true),
          like(pods.title, `%${query}%`)
        )
      );
  }

  async filterPods(filters: { region?: string; membershipType?: string; amenities?: string[] }): Promise<Pod[]> {
    let conditions = [eq(pods.isActive, true)];
    
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

  async updatePodAvailability(id: number, availableSpots: number): Promise<Pod | undefined> {
    const [pod] = await db
      .update(pods)
      .set({ availableSpots })
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }

  // Join request operations
  async createJoinRequest(requestData: InsertJoinRequest): Promise<JoinRequest> {
    const [request] = await db
      .insert(joinRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getJoinRequestsForPod(podId: number): Promise<JoinRequest[]> {
    return await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.podId, podId));
  }

  async getJoinRequestsForUser(userId: string): Promise<JoinRequest[]> {
    return await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.userId, userId));
  }

  async updateJoinRequestStatus(id: number, status: "accepted" | "rejected"): Promise<JoinRequest | undefined> {
    const [request] = await db
      .update(joinRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(joinRequests.id, id))
      .returning();
    return request;
  }

  // Pod member operations
  async getPodMembers(podId: number): Promise<PodMember[]> {
    return await db
      .select()
      .from(podMembers)
      .where(and(eq(podMembers.podId, podId), eq(podMembers.isActive, true)));
  }

  async addPodMember(podId: number, userId: string): Promise<PodMember> {
    const [member] = await db
      .insert(podMembers)
      .values({ podId, userId })
      .returning();
    return member;
  }
}

export const storage = new DatabaseStorage();
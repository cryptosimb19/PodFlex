import { users, pods, joinRequests, podMembers, type User, type Pod, type InsertUser, type InsertPod, type JoinRequest, type InsertJoinRequest, type PodMember } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
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
  getJoinRequestsForUser(userId: number): Promise<JoinRequest[]>;
  updateJoinRequestStatus(id: number, status: "accepted" | "rejected"): Promise<JoinRequest | undefined>;
  
  // Pod member operations
  getPodMembers(podId: number): Promise<PodMember[]>;
  addPodMember(podId: number, userId: number): Promise<PodMember>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pods: Map<number, Pod>;
  private joinRequests: Map<number, JoinRequest>;
  private podMembers: Map<number, PodMember>;
  private currentUserId: number;
  private currentPodId: number;
  private currentJoinRequestId: number;
  private currentPodMemberId: number;

  constructor() {
    this.users = new Map();
    this.pods = new Map();
    this.joinRequests = new Map();
    this.podMembers = new Map();
    this.currentUserId = 1;
    this.currentPodId = 1;
    this.currentJoinRequestId = 1;
    this.currentPodMemberId = 1;
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample users
    const sampleUsers: User[] = [
      {
        id: 1,
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        membershipId: "BC12345",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "San Jose",
        createdAt: new Date(),
      },
      {
        id: 2,
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
        membershipId: "BC67890",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "San Francisco",
        createdAt: new Date(),
      }
    ];

    // Create sample pods
    const samplePods: Pod[] = [
      {
        id: 1,
        leadId: 1,
        clubName: "Bay Club Courtside",
        clubRegion: "San Jose",
        membershipType: "Multi-Club",
        title: "Tennis & Pickleball Multi-Club Pod",
        description: "Looking for 2 more members to share my Bay Club Multi-Club membership. Great for tennis and pickleball enthusiasts. Access to all Bay Club locations.",
        costPerPerson: 12500,
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["tennis", "pickleball", "pool", "spa", "gym"],
        rules: "Must be active and use facilities regularly. Prefer serious tennis players.",
        imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        leadId: 2,
        clubName: "Bay Club San Francisco",
        clubRegion: "San Francisco",
        membershipType: "Single-Club",
        title: "Downtown SF Single Club Membership",
        description: "Sharing single club membership at Bay Club SF. Perfect for downtown workers. Pool and gym access included.",
        costPerPerson: 8500,
        totalSpots: 3,
        availableSpots: 1,
        amenities: ["pool", "gym", "sauna"],
        rules: "Please be respectful of equipment and facilities. No guests without prior approval.",
        imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        leadId: 1,
        clubName: "Bay Club Marin",
        clubRegion: "Marin",
        membershipType: "Family",
        title: "Family Membership in Marin",
        description: "Family with kids looking to share our Bay Club Marin membership. Kid-friendly amenities and family pool access.",
        costPerPerson: 9500,
        totalSpots: 2,
        availableSpots: 1,
        amenities: ["pool", "kids_club", "tennis", "gym"],
        rules: "Family-friendly pod. Kids welcome. Please supervise children at all times.",
        imageUrl: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    sampleUsers.forEach(user => {
      this.users.set(user.id, user);
      this.currentUserId = Math.max(this.currentUserId, user.id + 1);
    });

    samplePods.forEach(pod => {
      this.pods.set(pod.id, pod);
      this.currentPodId = Math.max(this.currentPodId, pod.id + 1);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      membershipId: insertUser.membershipId || null,
      avatar: insertUser.avatar || null,
      preferredRegion: insertUser.preferredRegion || null,
    };
    this.users.set(id, user);
    return user;
  }

  async getPods(): Promise<Pod[]> {
    return Array.from(this.pods.values()).filter(pod => pod.isActive);
  }

  async getPod(id: number): Promise<Pod | undefined> {
    return this.pods.get(id);
  }

  async searchPods(query: string): Promise<Pod[]> {
    const pods = Array.from(this.pods.values()).filter(pod => pod.isActive);
    if (!query.trim()) return pods;
    
    const lowercaseQuery = query.toLowerCase();
    return pods.filter(pod => 
      pod.title.toLowerCase().includes(lowercaseQuery) ||
      pod.description.toLowerCase().includes(lowercaseQuery) ||
      pod.clubName.toLowerCase().includes(lowercaseQuery) ||
      pod.clubRegion.toLowerCase().includes(lowercaseQuery)
    );
  }

  async filterPods(filters: { region?: string; membershipType?: string; amenities?: string[] }): Promise<Pod[]> {
    const pods = Array.from(this.pods.values()).filter(pod => pod.isActive);
    
    return pods.filter(pod => {
      // Filter by region
      if (filters.region && pod.clubRegion !== filters.region) {
        return false;
      }
      
      // Filter by membership type
      if (filters.membershipType && pod.membershipType !== filters.membershipType) {
        return false;
      }
      
      // Filter by amenities
      if (filters.amenities && filters.amenities.length > 0) {
        const podAmenities = pod.amenities || [];
        const hasRequiredAmenities = filters.amenities.some(amenity => 
          podAmenities.includes(amenity)
        );
        if (!hasRequiredAmenities) {
          return false;
        }
      }
      
      return true;
    });
  }

  async createPod(insertPod: InsertPod): Promise<Pod> {
    const id = this.currentPodId++;
    const pod: Pod = { 
      ...insertPod, 
      id, 
      createdAt: new Date(),
      rules: insertPod.rules || null,
      amenities: insertPod.amenities || [],
      isActive: insertPod.isActive ?? true,
    };
    this.pods.set(id, pod);
    return pod;
  }

  async updatePodAvailability(id: number, availableSpots: number): Promise<Pod | undefined> {
    const pod = this.pods.get(id);
    if (!pod) return undefined;
    
    const updatedPod: Pod = { ...pod, availableSpots };
    this.pods.set(id, updatedPod);
    return updatedPod;
  }

  async createJoinRequest(insertRequest: InsertJoinRequest): Promise<JoinRequest> {
    const id = this.currentJoinRequestId++;
    const request: JoinRequest = { 
      ...insertRequest, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      message: insertRequest.message || null,
      status: "pending",
    };
    this.joinRequests.set(id, request);
    return request;
  }

  async getJoinRequestsForPod(podId: number): Promise<JoinRequest[]> {
    return Array.from(this.joinRequests.values()).filter(request => request.podId === podId);
  }

  async getJoinRequestsForUser(userId: number): Promise<JoinRequest[]> {
    return Array.from(this.joinRequests.values()).filter(request => request.userId === userId);
  }

  async updateJoinRequestStatus(id: number, status: "accepted" | "rejected"): Promise<JoinRequest | undefined> {
    const request = this.joinRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest: JoinRequest = { 
      ...request, 
      status, 
      updatedAt: new Date() 
    };
    this.joinRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getPodMembers(podId: number): Promise<PodMember[]> {
    return Array.from(this.podMembers.values()).filter(member => 
      member.podId === podId && member.isActive
    );
  }

  async addPodMember(podId: number, userId: number): Promise<PodMember> {
    const id = this.currentPodMemberId++;
    const member: PodMember = {
      id,
      podId,
      userId,
      joinedAt: new Date(),
      isActive: true,
    };
    this.podMembers.set(id, member);
    return member;
  }
}

export const storage = new MemStorage();
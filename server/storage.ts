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
      },
      {
        id: 3,
        email: "michael.chen@example.com",
        firstName: "Michael",
        lastName: "Chen",
        membershipId: "BC11111",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "San Jose",
        createdAt: new Date(),
      },
      {
        id: 4,
        email: "sarah.wilson@example.com",
        firstName: "Sarah",
        lastName: "Wilson",
        membershipId: "BC22222",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "San Francisco",
        createdAt: new Date(),
      },
      {
        id: 5,
        email: "david.garcia@example.com",
        firstName: "David",
        lastName: "Garcia",
        membershipId: "BC33333",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "Peninsula",
        createdAt: new Date(),
      },
      {
        id: 6,
        email: "emma.taylor@example.com",
        firstName: "Emma",
        lastName: "Taylor",
        membershipId: "BC44444",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        preferredRegion: "East Bay",
        createdAt: new Date(),
      }
    ];

    // Authentic Bay Club locations and pods
    const samplePods: Pod[] = [
      {
        id: 1,
        leadId: 1,
        clubName: "Courtside",
        clubRegion: "San Jose",
        clubAddress: "1413 Kooser Road, San Jose, CA 95118",
        membershipType: "Multi-Club",
        title: "Courtside Tennis & Fitness Pod",
        description: "Join our active tennis community at Bay Club Courtside! We're a group of tennis enthusiasts who share costs for premium access to the courts, fitness facilities, and pool. Perfect for intermediate to advanced players.",
        costPerPerson: 19500,
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["tennis", "pickleball", "pool", "spa", "gym"],
        rules: "Active tennis play required. Weekend group sessions encouraged.",
        imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        leadId: 2,
        clubName: "Financial District",
        clubRegion: "San Francisco",
        clubAddress: "50 California Street, San Francisco, CA 94111",
        membershipType: "Single-Club",
        title: "SF Financial District Professionals",
        description: "Premium downtown Bay Club access for busy professionals! Share costs for the Financial District location - perfect for lunch workouts, after-work fitness, and networking.",
        costPerPerson: 16500,
        totalSpots: 5,
        availableSpots: 3,
        amenities: ["gym", "sauna", "pool"],
        rules: "Business hours usage preferred. Professional networking encouraged.",
        imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        leadId: 1,
        clubName: "Redwood Shores",
        clubRegion: "Peninsula",
        clubAddress: "400 Marine Parkway, Redwood Shores, CA 94065",
        membershipType: "Family",
        title: "Redwood Shores Family Membership",
        description: "Family-friendly Bay Club pod for the beautiful Redwood Shores location! Perfect for families wanting premium access to kids' programs, aquatics, tennis, and family amenities.",
        costPerPerson: 24500,
        totalSpots: 3,
        availableSpots: 1,
        amenities: ["pool", "kids_club", "gym", "tennis", "spa", "sauna"],
        rules: "Family membership - children required. Coordinate pool schedules.",
        imageUrl: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 4,
        leadId: 2,
        clubName: "Walnut Creek",
        clubRegion: "East Bay",
        clubAddress: "1375 Locust Street, Walnut Creek, CA 94596",
        membershipType: "Multi-Club",
        title: "Walnut Creek Active Lifestyle Pod",
        description: "Join our Walnut Creek Bay Club community! We're fitness enthusiasts who love the full range of amenities - from group classes to tennis to swimming. Great for staying active year-round.",
        costPerPerson: 18000,
        totalSpots: 4,
        availableSpots: 2,
        amenities: ["gym", "pool", "tennis", "sauna", "pickleball"],
        rules: "Active participation in group activities encouraged.",
        imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 5,
        leadId: 1,
        clubName: "Santa Clara",
        clubRegion: "Santa Clara",
        clubAddress: "5175 Stevens Creek Boulevard, Santa Clara, CA 95051",
        membershipType: "Single-Club",
        title: "Santa Clara Fitness & Sports Hub",
        description: "Experience the newly renovated Santa Clara Bay Club! Join our pod for access to the amazing new 12,000-square-foot fitness atrium, basketball courts, squash courts, and premium amenities.",
        costPerPerson: 17500,
        totalSpots: 4,
        availableSpots: 1,
        amenities: ["gym", "pool", "tennis", "squash", "basketball"],
        rules: "Enjoy the new facilities responsibly. Group fitness classes welcome.",
        imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 6,
        leadId: 2,
        clubName: "Marin",
        clubRegion: "Marin",
        clubAddress: "335 Tamalpais Drive, Corte Madera, CA 94925",
        membershipType: "Family",
        title: "Marin Family Golf & Recreation",
        description: "Share the luxury of Bay Club Marin! Perfect for families who want access to premium amenities in beautiful Corte Madera. Great for shopping, dining, and staying active with kids.",
        costPerPerson: 22000,
        totalSpots: 3,
        availableSpots: 2,
        amenities: ["gym", "pool", "kids_club", "spa", "tennis"],
        rules: "Family-oriented. Respect shared amenities and schedules.",
        imageUrl: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 7,
        leadId: 1,
        clubName: "San Francisco",
        clubRegion: "San Francisco",
        clubAddress: "150 Greenwich Street, San Francisco, CA 94111",
        membershipType: "Multi-Club",
        title: "SF Greenwich Street Flagship Experience",
        description: "Experience the magic of San Francisco at our flagship location! Share access to our 15,000 sq ft fitness floor, squash facility, basketball, yoga, Pilates, and two indoor pools with city views.",
        costPerPerson: 21500,
        totalSpots: 4,
        availableSpots: 1,
        amenities: ["gym", "pool", "squash", "basketball", "yoga"],
        rules: "Premium experience focused. Respect shared amenities and booking system.",
        imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 8,
        leadId: 2,
        clubName: "Manhattan Country Club",
        clubRegion: "Los Angeles",
        clubAddress: "1400 Parkview Avenue, Manhattan Beach, CA 90266",
        membershipType: "Family",
        title: "Manhattan Beach Country Club Elite",
        description: "Exclusive access to Manhattan Country Club in Manhattan Beach! Join our premium pod for the ultimate SoCal country club experience with ocean views, golf, tennis, and luxury amenities.",
        costPerPerson: 28500,
        totalSpots: 3,
        availableSpots: 1,
        amenities: ["golf", "tennis", "pool", "spa", "dining"],
        rules: "Premium membership standards. Country club etiquette required.",
        imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 9,
        leadId: 1,
        clubName: "Santa Monica",
        clubRegion: "Los Angeles",
        clubAddress: "1025 2nd Street, Santa Monica, CA 90403",
        membershipType: "Multi-Club",
        title: "Santa Monica Beach Club Pod",
        description: "Join our Santa Monica Bay Club community! Perfect for beach lifestyle enthusiasts who want access to premium fitness classes, state-of-the-art equipment, and incredible Pacific Ocean views.",
        costPerPerson: 24000,
        totalSpots: 5,
        availableSpots: 2,
        amenities: ["gym", "pool", "yoga", "spa", "beach_access"],
        rules: "Beach lifestyle focused. Group classes encouraged.",
        imageUrl: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 10,
        leadId: 2,
        clubName: "Carmel Valley",
        clubRegion: "San Diego",
        clubAddress: "11236 El Camino Real, San Diego, CA 92130",
        membershipType: "Family",
        title: "San Diego Family Golf & Recreation",
        description: "Share the luxury of Bay Club Carmel Valley! Perfect for families who want access to our 27-hole golf course with gorgeous views, year-round aquatics, tennis, and state-of-the-art fitness facilities.",
        costPerPerson: 26000,
        totalSpots: 4,
        availableSpots: 3,
        amenities: ["golf", "pool", "tennis", "kids_club", "gym"],
        rules: "Family-oriented. Golf course booking coordination required.",
        imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
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

    // Add sample pod members
    const samplePodMembers: PodMember[] = [
      // Pod 1 (Courtside) - 2 current members
      { id: 1, podId: 1, userId: 1, joinedAt: new Date('2024-01-15'), isActive: true }, // John (leader)
      { id: 2, podId: 1, userId: 3, joinedAt: new Date('2024-02-01'), isActive: true }, // Michael
      
      // Pod 2 (Financial District) - 2 current members
      { id: 3, podId: 2, userId: 2, joinedAt: new Date('2024-01-20'), isActive: true }, // Jane (leader)
      { id: 4, podId: 2, userId: 4, joinedAt: new Date('2024-02-15'), isActive: true }, // Sarah
      
      // Pod 3 (Redwood Shores) - 2 current members
      { id: 5, podId: 3, userId: 1, joinedAt: new Date('2024-01-10'), isActive: true }, // John (leader)
      { id: 6, podId: 3, userId: 5, joinedAt: new Date('2024-03-01'), isActive: true }, // David
      
      // Pod 4 (Walnut Creek) - 2 current members
      { id: 7, podId: 4, userId: 2, joinedAt: new Date('2024-01-25'), isActive: true }, // Jane (leader)
      { id: 8, podId: 4, userId: 6, joinedAt: new Date('2024-02-10'), isActive: true }, // Emma
      
      // Pod 5 (Santa Clara) - 3 current members
      { id: 9, podId: 5, userId: 1, joinedAt: new Date('2024-01-05'), isActive: true }, // John (leader)
      { id: 10, podId: 5, userId: 3, joinedAt: new Date('2024-01-20'), isActive: true }, // Michael
      { id: 11, podId: 5, userId: 4, joinedAt: new Date('2024-02-05'), isActive: true }, // Sarah
    ];

    samplePodMembers.forEach(member => {
      this.podMembers.set(member.id, member);
      this.currentPodMemberId = Math.max(this.currentPodMemberId, member.id + 1);
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
      amenities: Array.isArray(insertPod.amenities) ? insertPod.amenities : [],
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
      userInfo: insertRequest.userInfo || null,
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
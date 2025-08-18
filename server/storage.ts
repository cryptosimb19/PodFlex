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
  
  // Initialization
  initializeSamplePods(): Promise<void>;
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

  // Initialize sample data
  async initializeSamplePods(): Promise<void> {
    // Clear existing sample data first
    await db.delete(podMembers);
    await db.delete(joinRequests);  
    await db.delete(pods);
    await db.delete(users);

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
    const insertedPods = await db.insert(pods).values([...samplePods]).returning();
    
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
}

export const storage = new DatabaseStorage();
import { users, pods, type User, type Pod, type InsertUser, type InsertPod } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(id: number, preferences: any): Promise<User | undefined>;
  
  getPods(): Promise<Pod[]>;
  getPod(id: number): Promise<Pod | undefined>;
  searchPods(query: string): Promise<Pod[]>;
  filterPods(filters: string[]): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pods: Map<number, Pod>;
  private currentUserId: number;
  private currentPodId: number;

  constructor() {
    this.users = new Map();
    this.pods = new Map();
    this.currentUserId = 1;
    this.currentPodId = 1;
    this.initializePods();
  }

  private initializePods() {
    const samplePods: Pod[] = [
      {
        id: 1,
        name: "Tech Hub Pod #1",
        description: "Modern workspace with full accessibility features including adjustable desks, accessible restrooms, and assistive technology support.",
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=200",
        address: "Downtown, Portland",
        distance: "0.3 miles",
        availability: "Available now",
        rating: "4.8 (124 reviews)",
        verified: true,
        contact: {
          phone: "(555) 123-4567",
          email: "techhub@example.com"
        },
        hours: "Monday - Friday: 7:00 AM - 10:00 PM\nWeekend: 8:00 AM - 8:00 PM",
        amenities: ["WiFi", "Printing", "Coffee", "Parking"],
        accessibilityFeatures: {
          mobility: true,
          visual: true,
          audio: true,
          wheelchairAccessible: true,
          adjustableDesks: true,
          screenReader: true,
          hearingLoop: true,
          accessibleRestrooms: true
        },
        detailedFeatures: [
          {
            title: "Wheelchair Accessible Entrance",
            description: "Automatic door with 36\" wide opening",
            verified: true
          },
          {
            title: "Adjustable Height Desks",
            description: "Electric sit-stand desks available",
            verified: true
          },
          {
            title: "Screen Reader Compatible",
            description: "JAWS and NVDA supported systems",
            verified: true
          },
          {
            title: "Hearing Loop System",
            description: "Induction loop for hearing aids",
            verified: true
          },
          {
            title: "Accessible Restrooms",
            description: "ADA compliant facilities nearby",
            verified: true
          }
        ]
      },
      {
        id: 2,
        name: "Library Study Pod #2",
        description: "Quiet study space with assistive technology",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=200",
        address: "Central Library, Portland",
        distance: "0.8 miles",
        availability: "Available in 30 min",
        rating: "4.6 (89 reviews)",
        verified: true,
        contact: {
          phone: "(555) 234-5678",
          email: "library@example.com"
        },
        hours: "Monday - Saturday: 9:00 AM - 9:00 PM\nSunday: 12:00 PM - 6:00 PM",
        amenities: ["WiFi", "Quiet Zone", "Research Materials", "Printing"],
        accessibilityFeatures: {
          mobility: true,
          visual: true,
          audio: false,
          wheelchairAccessible: true,
          adjustableDesks: false,
          screenReader: true,
          hearingLoop: false,
          accessibleRestrooms: true
        },
        detailedFeatures: [
          {
            title: "Wheelchair Accessible Entrance",
            description: "Ramp access with wide doorways",
            verified: true
          },
          {
            title: "Screen Reader Compatible",
            description: "NVDA and JAWS supported workstations",
            verified: true
          },
          {
            title: "Accessible Restrooms",
            description: "ADA compliant facilities on same floor",
            verified: true
          }
        ]
      },
      {
        id: 3,
        name: "Creative Studio Pod #3",
        description: "Creative workspace with adjustable equipment",
        imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=200",
        address: "Arts District, Portland",
        distance: "1.2 miles",
        availability: "Available tomorrow",
        rating: "4.3 (45 reviews)",
        verified: false,
        contact: {
          phone: "(555) 345-6789",
          email: "creative@example.com"
        },
        hours: "Monday - Friday: 10:00 AM - 8:00 PM\nWeekend: 10:00 AM - 6:00 PM",
        amenities: ["WiFi", "Art Supplies", "Natural Light", "Parking"],
        accessibilityFeatures: {
          mobility: true,
          visual: false,
          audio: false,
          wheelchairAccessible: true,
          adjustableDesks: true,
          screenReader: false,
          hearingLoop: false,
          accessibleRestrooms: true
        },
        detailedFeatures: [
          {
            title: "Wheelchair Accessible Entrance",
            description: "Level entrance with accessible parking",
            verified: false
          },
          {
            title: "Adjustable Height Tables",
            description: "Manual height adjustment available",
            verified: false
          }
        ]
      }
    ];

    samplePods.forEach(pod => {
      this.pods.set(pod.id, pod);
      this.currentPodId = Math.max(this.currentPodId, pod.id + 1);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUserPreferences(id: number, preferences: any): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, preferences };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getPods(): Promise<Pod[]> {
    return Array.from(this.pods.values());
  }

  async getPod(id: number): Promise<Pod | undefined> {
    return this.pods.get(id);
  }

  async searchPods(query: string): Promise<Pod[]> {
    const pods = Array.from(this.pods.values());
    if (!query.trim()) return pods;
    
    const lowercaseQuery = query.toLowerCase();
    return pods.filter(pod => 
      pod.name.toLowerCase().includes(lowercaseQuery) ||
      pod.description.toLowerCase().includes(lowercaseQuery) ||
      pod.address.toLowerCase().includes(lowercaseQuery)
    );
  }

  async filterPods(filters: string[]): Promise<Pod[]> {
    const pods = Array.from(this.pods.values());
    if (!filters.length) return pods;
    
    return pods.filter(pod => {
      return filters.some(filter => {
        switch (filter) {
          case 'mobility':
            return pod.accessibilityFeatures?.mobility;
          case 'visual':
            return pod.accessibilityFeatures?.visual;
          case 'audio':
            return pod.accessibilityFeatures?.audio;
          default:
            return true;
        }
      });
    });
  }

  async createPod(insertPod: InsertPod): Promise<Pod> {
    const id = this.currentPodId++;
    const pod: Pod = { ...insertPod, id };
    this.pods.set(id, pod);
    return pod;
  }
}

export const storage = new MemStorage();

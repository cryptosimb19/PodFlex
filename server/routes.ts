import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertPodSchema, insertJoinRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Get all pods
  app.get("/api/pods", async (req, res) => {
    try {
      const pods = await storage.getPods();
      res.json(pods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pods" });
    }
  });

  // Get pod by ID
  app.get("/api/pods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPod(id);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }
      res.json(pod);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pod" });
    }
  });

  // Search pods
  app.get("/api/pods/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const pods = await storage.searchPods(query);
      res.json(pods);
    } catch (error) {
      res.status(500).json({ message: "Failed to search pods" });
    }
  });

  // Filter pods
  app.post("/api/pods/filter", async (req, res) => {
    try {
      const { region, membershipType, amenities } = req.body;
      const filters = { region, membershipType, amenities };
      const pods = await storage.filterPods(filters);
      res.json(pods);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter pods" });
    }
  });

  // Create a new pod
  app.post("/api/pods", async (req, res) => {
    try {
      const podData = insertPodSchema.parse(req.body);
      const pod = await storage.createPod(podData);
      res.status(201).json(pod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pod data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pod" });
    }
  });

  // Create a join request
  app.post("/api/join-requests", async (req, res) => {
    try {
      const requestData = insertJoinRequestSchema.parse(req.body);
      const joinRequest = await storage.createJoinRequest(requestData);
      res.status(201).json(joinRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create join request" });
    }
  });

  // Get join requests for a pod (for pod leaders)
  app.get("/api/pods/:id/join-requests", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const requests = await storage.getJoinRequestsForPod(podId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Update join request status (accept/reject)
  app.patch("/api/join-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedRequest = await storage.updateJoinRequestStatus(id, status);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      // If accepted, add user to pod members
      if (status === "accepted") {
        await storage.addPodMember(updatedRequest.podId, updatedRequest.userId);
        
        // Update pod availability
        const pod = await storage.getPod(updatedRequest.podId);
        if (pod && pod.availableSpots > 0) {
          await storage.updatePodAvailability(updatedRequest.podId, pod.availableSpots - 1);
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update join request" });
    }
  });

  // Get pod members with user details
  app.get("/api/pods/:id/members", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const members = await storage.getPodMembers(podId);
      
      // Fetch user details for each member
      const membersWithUserInfo = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user || null
          };
        })
      );
      
      res.json(membersWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pod members" });
    }
  });

  // Get join requests for a user (for dashboard)
  app.get("/api/join-requests/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getJoinRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user join requests" });
    }
  });

  // Get user by ID (for profile info)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
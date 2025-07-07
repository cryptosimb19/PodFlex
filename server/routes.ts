import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const { filters } = req.body;
      const pods = await storage.filterPods(filters || []);
      res.json(pods);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter pods" });
    }
  });

  // Update user preferences
  app.post("/api/user/preferences", async (req, res) => {
    try {
      const preferencesSchema = z.object({
        mobilityAssistance: z.boolean().optional(),
        visualImpairment: z.boolean().optional(),
        hearingImpairment: z.boolean().optional(),
        cognitiveSupport: z.boolean().optional(),
        location: z.string().optional(),
      });
      
      const preferences = preferencesSchema.parse(req.body);
      
      // For now, assume user ID 1 (would be from session in real app)
      const user = await storage.updateUserPreferences(1, preferences);
      res.json({ success: true, preferences });
    } catch (error) {
      res.status(400).json({ message: "Invalid preferences data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

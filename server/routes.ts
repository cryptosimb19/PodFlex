import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./multiAuth";
import passport from "passport";
import { sendJoinRequestNotification, sendJoinRequestAcceptedNotification, sendJoinRequestRejectedNotification } from "./emailService";
import { z } from "zod";
import { insertPodSchema, insertJoinRequestSchema } from "@shared/schema";
import type { User } from "@shared/schema";

// Sanitize user data to remove sensitive fields
function sanitizeUser(user: User) {
  const { passwordHash, emailVerificationToken, passwordResetToken, passwordResetExpires, ...sanitized } = user;
  return sanitized;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(sanitizeUser(req.user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Local authentication routes
  const registerSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        authProvider: "local",
        isEmailVerified: false, // In a real app, you'd send verification email
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in after registration" });
        }
        res.status(201).json({ user: sanitizeUser(user), message: "Registration successful" });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Invalid credentials" });
        }
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to log in" });
          }
          res.json({ user: sanitizeUser(user), message: "Login successful" });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // Auth providers endpoint
  app.get('/api/auth/providers', (req, res) => {
    const providers = ['local'];
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push('google');
    }
    res.json({ providers });
  });

  // Google OAuth routes (only if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', 
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        // Successful authentication, redirect to user type selection
        res.redirect('/user-type-selection');
      }
    );
  } else {
    // Return error if Google OAuth is not configured
    app.get('/api/auth/google', (req, res) => {
      res.status(503).json({ message: "Google OAuth is not configured" });
    });
  }

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
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
      
      // Send email notification to pod leader
      try {
        const pod = await storage.getPod(joinRequest.podId);
        const podLead = await storage.getUser(pod?.leadId || "");
        const applicant = await storage.getUser(joinRequest.userId);
        
        if (pod && podLead && applicant && podLead.email) {
          const fromEmail = process.env.FROM_EMAIL || "noreply@your-domain.com";
          await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            fromEmail
          );
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
      
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

      // Send email notification to applicant
      try {
        const pod = await storage.getPod(updatedRequest.podId);
        const applicant = await storage.getUser(updatedRequest.userId);
        const fromEmail = process.env.FROM_EMAIL || "noreply@your-domain.com";
        
        if (pod && applicant && applicant.email) {
          if (status === "accepted") {
            const podLeader = await storage.getUser(pod.leadId);
            const podLeaderName = podLeader ? `${podLeader.firstName} ${podLeader.lastName}` : "Pod Leader";
            
            await sendJoinRequestAcceptedNotification(
              applicant.email,
              `${applicant.firstName} ${applicant.lastName}`,
              pod.title,
              podLeaderName,
              fromEmail
            );
          } else if (status === "rejected") {
            await sendJoinRequestRejectedNotification(
              applicant.email,
              `${applicant.firstName} ${applicant.lastName}`,
              pod.title,
              fromEmail
            );
          }
        }
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError);
        // Don't fail the request if email fails
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
            user: user ? sanitizeUser(user) : null
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
      const userId = req.params.userId;
      const requests = await storage.getJoinRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user join requests" });
    }
  });

  // Get user by ID (for profile info)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.put("/api/users/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { membershipId, preferredRegion } = req.body;
      
      // Update user with membership information
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        profileImageUrl: req.user.profileImageUrl,
        ...(membershipId && { membershipId }),
        ...(preferredRegion && { preferredRegion })
      });
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
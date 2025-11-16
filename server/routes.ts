import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { joinRequests } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setupAuth, isAuthenticated, hashPassword, comparePassword } from "./multiAuth";
import passport from "passport";
import { sendJoinRequestNotification, sendJoinRequestAcceptedNotification, sendJoinRequestRejectedNotification, sendPasswordResetEmail, sendWelcomeEmail } from "./emailService";
import crypto from "crypto";
import { z } from "zod";
import { insertPodSchema, insertJoinRequestSchema } from "@shared/schema";
import type { User, Pod } from "@shared/schema";
import rateLimit from "express-rate-limit";

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
      console.log("📥 GET /api/auth/user - Returning user:", {
        id: req.user.id,
        email: req.user.email,
        userType: req.user.userType,
        hasCompletedOnboarding: req.user.hasCompletedOnboarding
      });
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
        
        // Send welcome email to new user
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@flexpod.app';
        sendWelcomeEmail(user.email, user.firstName || 'there', fromEmail)
          .catch(error => console.error('Failed to send welcome email:', error));
        
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
    if (process.env.APPLE_TEAM_ID && process.env.APPLE_CLIENT_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
      providers.push('apple');
    }
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      providers.push('phone');
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
        // Successful authentication, redirect based on user type
        const user = req.user as any;
        if (user?.userType) {
          // User has already selected a type, redirect to appropriate page
          res.redirect('/browse');
        } else {
          // User needs to select user type
          res.redirect('/user-type-selection');
        }
      }
    );
  } else {
    // Return error if Google OAuth is not configured
    app.get('/api/auth/google', (req, res) => {
      res.status(503).json({ message: "Google OAuth is not configured" });
    });
  }

  // Apple OAuth routes (only if configured)
  if (process.env.APPLE_TEAM_ID && process.env.APPLE_CLIENT_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    app.get('/api/auth/apple',
      passport.authenticate('apple')
    );

    app.post('/api/auth/apple/callback',
      passport.authenticate('apple', { failureRedirect: '/login' }),
      (req, res) => {
        // Successful authentication, redirect based on user type
        const user = req.user as any;
        if (user?.userType) {
          // User has already selected a type, redirect to appropriate page
          res.redirect('/browse');
        } else {
          // User needs to select user type
          res.redirect('/user-type-selection');
        }
      }
    );
  } else {
    // Return error if Apple OAuth is not configured
    app.get('/api/auth/apple', (req, res) => {
      res.status(503).json({ message: "Apple OAuth is not configured. Please configure Apple OAuth credentials." });
    });
  }

  // Phone number authentication routes - Rate limiting
  const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each phone number to 3 OTP requests per window
    message: "Too many OTP requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.phoneNumber || 'unknown', // Rate limit by phone number
    skip: (req) => !req.body.phoneNumber, // Skip if no phone number provided
  });

  const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each phone number to 5 verification attempts per window
    message: "Too many verification attempts. Please request a new code.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.phoneNumber || 'unknown',
    skip: (req) => !req.body.phoneNumber,
  });

  app.post('/api/auth/phone/send-otp', otpSendLimiter, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Basic phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
      if (!phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ''))) {
        return res.status(400).json({ message: "Please enter a valid phone number" });
      }

      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        return res.status(503).json({ 
          message: "SMS service is not configured. Please contact support." 
        });
      }

      // Clean up any existing OTPs for this phone number before creating new one
      await storage.cleanupExpiredOtps();
      await storage.markOtpAsVerified(phoneNumber); // Remove any pending OTPs

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database with 5 minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpVerification({
        phoneNumber,
        otp,
        expiresAt,
      });

      // Send SMS with Twilio
      const twilio = require('twilio');
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await twilioClient.messages.create({
        body: `Your FlexPod verification code is: ${otp}. This code expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      res.json({ 
        message: "OTP sent successfully", 
        expiresIn: 300 // 5 minutes in seconds
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
  });

  app.post('/api/auth/phone/verify', otpVerifyLimiter, (req, res, next) => {
    passport.authenticate('phone', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Verification error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid OTP" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in" });
        }
        res.json({ 
          user: sanitizeUser(user), 
          message: "Phone verification successful" 
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      // Destroy the session to completely clear user data
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: "Logout successful" });
      });
    });
  });

  // Forgot password route
  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);
      
      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (user && user.authProvider === 'local') {
        // Generate reset token (32 bytes, hex encoded = 64 characters)
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token expiration to 1 hour from now
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour
        
        // Save token to database
        await storage.setPasswordResetToken(validatedData.email, resetToken, resetExpires);
        
        // Send password reset email
        const fromEmail = process.env.FROM_EMAIL || "noreply@flexpod.com";
        const userName = user.firstName || user.email.split('@')[0];
        
        await sendPasswordResetEmail(
          user.email,
          userName,
          resetToken,
          fromEmail
        );
      }
      
      // Always return success message
      res.json({ 
        message: "If an account exists with that email, a password reset link has been sent." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid email format", 
          errors: error.errors 
        });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Reset password route
  const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Get user by reset token (validates token and expiration)
      const user = await storage.getUserByResetToken(validatedData.token);
      
      if (!user) {
        return res.status(400).json({ 
          message: "Invalid or expired reset token. Please request a new password reset." 
        });
      }
      
      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);
      
      // Update user password
      await storage.updateUser(user.id, { passwordHash });
      
      // Clear reset token
      await storage.clearPasswordResetToken(user.id);
      
      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
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
  app.post("/api/pods", isAuthenticated, async (req: any, res) => {
    try {
      const podData = insertPodSchema.parse(req.body);
      
      // Validate total spots doesn't exceed 8
      if (podData.totalSpots > 8) {
        return res.status(400).json({ message: "Total spots cannot exceed 8 members" });
      }
      
      // Check if the leader already has a pod
      const existingPods = await storage.getPodsByLeaderId(req.user.id);
      if (existingPods && existingPods.length > 0) {
        return res.status(400).json({ message: "You can only create one pod. Please edit your existing pod or delete it to create a new one." });
      }
      
      // Set the leadId from the authenticated user
      const pod = await storage.createPod({
        ...podData,
        leadId: req.user.id
      });
      res.status(201).json(pod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pod data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pod" });
    }
  });

  // Update a pod
  app.patch("/api/pods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPod(id);
      
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }
      
      // Check if user is the pod leader
      if (pod.leadId !== req.user.id) {
        return res.status(403).json({ message: "Only the pod leader can update this pod" });
      }
      
      // Validate and update pod data
      const updateSchema = insertPodSchema.partial();
      const updateData = updateSchema.parse(req.body) as Partial<Pod>;
      
      // Validate required text fields
      if (updateData.title !== undefined && !updateData.title.trim()) {
        return res.status(400).json({ message: "Pod title cannot be empty" });
      }
      
      if (updateData.description !== undefined && !updateData.description.trim()) {
        return res.status(400).json({ message: "Pod description cannot be empty" });
      }
      
      if (updateData.clubName !== undefined && !updateData.clubName.trim()) {
        return res.status(400).json({ message: "Club name cannot be empty" });
      }
      
      if (updateData.clubRegion !== undefined && !updateData.clubRegion.trim()) {
        return res.status(400).json({ message: "Club region cannot be empty" });
      }
      
      if (updateData.clubAddress !== undefined && !updateData.clubAddress.trim()) {
        return res.status(400).json({ message: "Club address cannot be empty" });
      }
      
      // Server-side bounds checking for numeric fields
      if (updateData.costPerPerson !== undefined) {
        if (!Number.isFinite(updateData.costPerPerson)) {
          return res.status(400).json({ message: "Please enter a valid cost per person" });
        }
        if (updateData.costPerPerson <= 0) {
          return res.status(400).json({ message: "Cost per person must be greater than 0" });
        }
      }
      
      if (updateData.totalSpots !== undefined) {
        if (!Number.isFinite(updateData.totalSpots)) {
          return res.status(400).json({ message: "Please enter a valid number of total spots" });
        }
        if (updateData.totalSpots <= 0) {
          return res.status(400).json({ message: "Total spots must be at least 1" });
        }
        if (updateData.totalSpots > 8) {
          return res.status(400).json({ message: "Total spots cannot exceed 8 members" });
        }
        
        // Check if reducing total spots would affect existing members
        const currentMembers = pod.totalSpots - pod.availableSpots;
        if (updateData.totalSpots < currentMembers) {
          return res.status(400).json({ 
            message: `Cannot reduce total spots to ${updateData.totalSpots}. You have ${currentMembers} current members.` 
          });
        }
      }
      
      if (updateData.availableSpots !== undefined) {
        if (!Number.isFinite(updateData.availableSpots)) {
          return res.status(400).json({ message: "Please enter a valid number of available spots" });
        }
        if (updateData.availableSpots < 0) {
          return res.status(400).json({ message: "Available spots cannot be negative" });
        }
        
        const totalSpots = updateData.totalSpots ?? pod.totalSpots;
        if (updateData.availableSpots > totalSpots) {
          return res.status(400).json({ 
            message: `Available spots (${updateData.availableSpots}) cannot exceed total spots (${totalSpots})` 
          });
        }
      }
      
      const updatedPod = await storage.updatePod(id, updateData);
      
      res.json(updatedPod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pod data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pod" });
    }
  });

  // Delete a pod
  app.delete("/api/pods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPod(id);
      
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }
      
      // Check if user is the pod leader
      if (pod.leadId !== req.user.id) {
        return res.status(403).json({ message: "Only the pod leader can delete this pod" });
      }
      
      // Soft delete the pod (includes soft deletion of members and join requests)
      const success = await storage.deletePod(id, req.user.id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete pod" });
      }
      
      res.json({ message: "Pod deleted successfully" });
    } catch (error) {
      console.error("Error deleting pod:", error);
      res.status(500).json({ message: "Failed to delete pod" });
    }
  });

  // Create a join request
  app.post("/api/join-requests", async (req, res) => {
    try {
      const requestData = insertJoinRequestSchema.parse(req.body);
      let emailStatus = "sent";
      
      // Create the join request first
      const joinRequest = await storage.createJoinRequest({
        ...requestData,
        emailStatus: "pending"
      });
      
      // Send email notification to pod leader
      try {
        const pod = await storage.getPod(joinRequest.podId);
        const podLead = await storage.getUser(pod?.leadId || "");
        const applicant = await storage.getUser(joinRequest.userId);
        
        if (pod && podLead && applicant && podLead.email) {
          const fromEmail = process.env.FROM_EMAIL || "noreply@your-domain.com";
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            fromEmail
          );
          
          emailStatus = emailSent ? "sent" : "failed";
        } else {
          emailStatus = "failed";
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        emailStatus = "failed";
      }
      
      // Update the join request with email status
      const updatedRequest = await storage.updateJoinRequestEmailStatus(joinRequest.id, emailStatus);
      
      res.status(201).json({
        ...updatedRequest,
        emailStatus
      });
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

  // Resend join request email notification
  app.post("/api/join-requests/:id/resend-email", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the join request
      const joinRequest = await db
        .select()
        .from(joinRequests)
        .where(eq(joinRequests.id, id))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      let emailStatus = "sent";
      
      // Send email notification to pod leader
      try {
        const pod = await storage.getPod(joinRequest.podId);
        const podLead = await storage.getUser(pod?.leadId || "");
        const applicant = await storage.getUser(joinRequest.userId);
        
        if (pod && podLead && applicant && podLead.email) {
          const fromEmail = process.env.FROM_EMAIL || "noreply@your-domain.com";
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            fromEmail
          );
          
          emailStatus = emailSent ? "sent" : "failed";
        } else {
          emailStatus = "failed";
        }
      } catch (emailError) {
        console.error("Failed to resend email notification:", emailError);
        emailStatus = "failed";
      }
      
      // Update the join request with email status
      const updatedRequest = await storage.updateJoinRequestEmailStatus(id, emailStatus);
      
      res.json({
        ...updatedRequest,
        emailStatus
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to resend email" });
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
      const { 
        membershipId, 
        preferredRegion, 
        primaryClub,
        membershipLevel,
        phone,
        street,
        aptUnit,
        city,
        state,
        zipCode,
        country,
        dateOfBirth,
        userType, 
        hasCompletedOnboarding 
      } = req.body;
      
      // Update user with all onboarding information
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        profileImageUrl: req.user.profileImageUrl,
        ...(membershipId !== undefined && { membershipId }),
        ...(preferredRegion !== undefined && { preferredRegion }),
        ...(primaryClub !== undefined && { primaryClub }),
        ...(membershipLevel !== undefined && { membershipLevel }),
        ...(phone !== undefined && { phone }),
        ...(street !== undefined && { street }),
        ...(aptUnit !== undefined && { aptUnit }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(country !== undefined && { country }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(userType !== undefined && { userType }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding })
      });
      
      // Update the session with the new user data
      req.user = updatedUser;
      
      // Explicitly save the session to persist the updated user data
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("✅ Session saved successfully. User data:", {
              id: updatedUser.id,
              userType: updatedUser.userType,
              hasCompletedOnboarding: updatedUser.hasCompletedOnboarding
            });
            resolve();
          }
        });
      });
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin Audit Log Endpoints - View deleted records
  app.get("/api/admin/deleted-pods", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin (for now, just check if they're authenticated)
      // TODO: Add proper admin role checking
      const deletedPods = await storage.getDeletedPods();
      
      // Include user who deleted each pod
      const podsWithDetails = await Promise.all(
        deletedPods.map(async (pod) => {
          const deletedByUser = pod.deletedBy ? await storage.getUser(pod.deletedBy) : null;
          return {
            ...pod,
            deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null
          };
        })
      );
      
      res.json(podsWithDetails);
    } catch (error) {
      console.error("Error fetching deleted pods:", error);
      res.status(500).json({ message: "Failed to fetch deleted pods" });
    }
  });

  app.get("/api/admin/deleted-join-requests", isAuthenticated, async (req: any, res) => {
    try {
      const deletedRequests = await storage.getDeletedJoinRequests();
      
      const requestsWithDetails = await Promise.all(
        deletedRequests.map(async (request) => {
          const deletedByUser = request.deletedBy ? await storage.getUser(request.deletedBy) : null;
          return {
            ...request,
            deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null
          };
        })
      );
      
      res.json(requestsWithDetails);
    } catch (error) {
      console.error("Error fetching deleted join requests:", error);
      res.status(500).json({ message: "Failed to fetch deleted join requests" });
    }
  });

  app.get("/api/admin/deleted-members", isAuthenticated, async (req: any, res) => {
    try {
      const deletedMembers = await storage.getDeletedPodMembers();
      
      const membersWithDetails = await Promise.all(
        deletedMembers.map(async (member) => {
          const deletedByUser = member.deletedBy ? await storage.getUser(member.deletedBy) : null;
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? sanitizeUser(user) : null,
            deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null
          };
        })
      );
      
      res.json(membersWithDetails);
    } catch (error) {
      console.error("Error fetching deleted members:", error);
      res.status(500).json({ message: "Failed to fetch deleted members" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
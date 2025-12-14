import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { joinRequests } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setupAuth, isAuthenticated, hashPassword, comparePassword } from "./multiAuth";
import passport from "passport";
import { sendJoinRequestNotification, sendJoinRequestAcceptedNotification, sendJoinRequestRejectedNotification, sendPasswordResetEmail, sendWelcomeEmail, sendPodCreatedEmail, sendMemberRemovedNotification, send2FAVerificationEmail, sendEmailVerification, sendLeaveRequestNotification, sendLeaveRequestApprovedNotification, sendLeaveRequestRejectedNotification, FROM_EMAIL } from "./emailService";
import crypto from "crypto";
import { z } from "zod";
import { insertPodSchema, insertJoinRequestSchema } from "@shared/schema";
import type { User, Pod } from "@shared/schema";
import rateLimit from "express-rate-limit";

// Sanitize user data to remove sensitive fields
function sanitizeUser(user: User) {
  const { passwordHash, emailVerificationToken, emailVerificationExpires, passwordResetToken, passwordResetExpires, ...sanitized } = user;
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

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Hash password and create user
      const passwordHash = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        authProvider: "local",
        isEmailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      });

      // Send verification email (don't log the user in yet)
      console.log(`Sending verification email to ${user.email}`);
      const emailSent = await sendEmailVerification(
        user.email,
        user.firstName || 'there',
        emailVerificationToken,
        FROM_EMAIL
      );

      if (!emailSent) {
        console.error('Failed to send verification email');
      }

      // Return success without logging in - user must verify email first
      res.status(201).json({ 
        message: "Registration successful. Please check your email to verify your account.",
        email: user.email,
        requiresVerification: true
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

  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Check if token has expired
      if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
        return res.status(400).json({ message: "Verification token has expired. Please request a new one." });
      }

      // Mark email as verified and clear the token
      await storage.verifyUserEmail(user.id);

      // Send welcome email now that email is verified
      console.log(`Sending welcome email to verified user ${user.email}`);
      sendWelcomeEmail(user.email, user.firstName || 'there', FROM_EMAIL)
        .catch(error => console.error('Failed to send welcome email:', error));

      res.json({ message: "Email verified successfully! You can now log in.", success: true });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Resend verification email endpoint
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If an account exists with this email, a verification email will be sent." });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified. You can log in." });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await storage.updateUserVerificationToken(user.id, emailVerificationToken, emailVerificationExpires);

      // Send verification email
      const emailSent = await sendEmailVerification(
        user.email,
        user.firstName || 'there',
        emailVerificationToken,
        FROM_EMAIL
      );

      if (!emailSent) {
        console.error('Failed to send verification email');
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate('local', async (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Invalid credentials" });
        }
        
        // Check if email is verified (only for local auth users)
        if (user.authProvider === 'local' && !user.isEmailVerified) {
          return res.status(403).json({ 
            message: "Please verify your email before logging in.",
            requiresEmailVerification: true,
            email: user.email
          });
        }
        
        // Generate 6-digit 2FA verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        try {
          // Store the 2FA verification code
          await storage.createEmail2FAVerification({
            userId: user.id,
            email: user.email,
            code: verificationCode,
            expiresAt,
          });
          
          // Send verification email
          const userName = user.firstName || user.email.split('@')[0];
          const emailSent = await send2FAVerificationEmail(
            user.email,
            userName,
            verificationCode,
            FROM_EMAIL
          );
          
          if (!emailSent) {
            console.error('Failed to send 2FA verification email');
            // Still continue - user can request a resend
          }
          
          console.log(`2FA code generated for user ${user.email}`);
          
          // Return response indicating 2FA is required (without logging in)
          return res.json({
            requires2FA: true,
            userId: user.id,
            email: user.email,
            message: "Verification code sent to your email"
          });
        } catch (error) {
          console.error('Error creating 2FA verification:', error);
          return res.status(500).json({ message: "Failed to send verification code" });
        }
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

  // 2FA verification endpoint
  const verify2FASchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    code: z.string().length(6, "Verification code must be 6 digits"),
  });

  // Rate limiter for 2FA verification attempts (5 attempts per 15 minutes)
  const verify2FALimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { message: "Too many verification attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post('/api/auth/verify-2fa', verify2FALimiter, async (req, res) => {
    try {
      const validatedData = verify2FASchema.parse(req.body);
      
      // Verify the 2FA code
      const isValid = await storage.verifyEmail2FACode(validatedData.userId, validatedData.code);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid or expired verification code" });
      }
      
      // Get the user
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete the 2FA verification record
      await storage.deleteEmail2FAVerification(validatedData.userId);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in user after 2FA:', err);
          return res.status(500).json({ message: "Failed to complete login" });
        }
        console.log(`2FA verification successful for user ${user.email}`);
        res.json({ user: sanitizeUser(user), message: "Login successful" });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      console.error('Error verifying 2FA:', error);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  // Resend 2FA code endpoint
  const resend2FASchema = z.object({
    userId: z.string().min(1, "User ID is required"),
  });

  // Rate limiter for resending 2FA codes (3 requests per 15 minutes)
  const resend2FALimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 requests per windowMs
    message: { message: "Too many resend requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post('/api/auth/resend-2fa', resend2FALimiter, async (req, res) => {
    try {
      const validatedData = resend2FASchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a new 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      // Store the new verification code (this deletes any existing code)
      await storage.createEmail2FAVerification({
        userId: user.id,
        email: user.email,
        code: verificationCode,
        expiresAt,
      });
      
      // Send the verification email
      const userName = user.firstName || user.email.split('@')[0];
      const emailSent = await send2FAVerificationEmail(
        user.email,
        userName,
        verificationCode,
        FROM_EMAIL
      );
      
      if (!emailSent) {
        console.error('Failed to resend 2FA verification email');
        return res.status(500).json({ message: "Failed to send verification code" });
      }
      
      console.log(`2FA code resent for user ${user.email}`);
      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      console.error('Error resending 2FA code:', error);
      return res.status(500).json({ message: "Failed to resend verification code" });
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
      async (req, res) => {
        // Successful authentication, redirect based on user type
        // Fetch fresh user data from database to ensure we have latest userType
        const sessionUser = req.user as any;
        
        // Try to fetch by email first (more reliable), fallback to ID if no valid email
        let user;
        if (sessionUser?.email && sessionUser.email.trim() !== '') {
          user = await storage.getUserByEmail(sessionUser.email);
        }
        
        // Fallback to ID if email lookup failed or email was invalid
        if (!user && sessionUser?.id) {
          user = await storage.getUser(sessionUser.id);
        }
        
        if (!user) {
          return res.redirect('/login');
        }
        
        if (user.userType) {
          // User has already selected a type, redirect to their dashboard
          if (user.userType === 'pod_leader') {
            res.redirect('/pod-leader-dashboard');
          } else {
            res.redirect('/dashboard');
          }
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
      async (req, res) => {
        // Successful authentication, redirect based on user type
        // Fetch fresh user data from database to ensure we have latest userType
        const sessionUser = req.user as any;
        
        // Try to fetch by email first (more reliable), fallback to ID if no valid email
        let user;
        if (sessionUser?.email && sessionUser.email.trim() !== '') {
          user = await storage.getUserByEmail(sessionUser.email);
        }
        
        // Fallback to ID if email lookup failed or email was invalid
        if (!user && sessionUser?.id) {
          user = await storage.getUser(sessionUser.id);
        }
        
        if (!user) {
          return res.redirect('/login');
        }
        
        if (user.userType) {
          // User has already selected a type, redirect to their dashboard
          if (user.userType === 'pod_leader') {
            res.redirect('/pod-leader-dashboard');
          } else {
            res.redirect('/dashboard');
          }
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
        const userName = user.firstName || user.email.split('@')[0];
        
        console.log(`Sending password reset email to ${user.email}`);
        await sendPasswordResetEmail(
          user.email,
          userName,
          resetToken,
          FROM_EMAIL
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

  // Get pod by ID (includes leader info)
  app.get("/api/pods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPodWithLeader(id);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }
      res.json(pod);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pod" });
    }
  });

  // Get pods by leader ID (for dual-role support)
  app.get("/api/pods/leader/:leaderId", async (req, res) => {
    try {
      const leaderId = req.params.leaderId;
      const pods = await storage.getPodsByLeaderId(leaderId);
      res.json(pods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leader pods" });
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
      
      // Send congratulatory email to pod leader
      console.log(`Sending pod created email to ${req.user.email}`);
      sendPodCreatedEmail(
        req.user.email,
        req.user.firstName || 'Pod Leader',
        pod.title,
        pod.clubName,
        pod.totalSpots,
        FROM_EMAIL
      ).catch(error => console.error('Failed to send pod created email:', error));
      
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
      
      // Check if user already has an active pod membership (accepted join request)
      const existingRequests = await storage.getJoinRequestsForUser(requestData.userId);
      const hasActiveMembership = existingRequests.some(r => r.status === 'accepted');
      
      if (hasActiveMembership) {
        return res.status(400).json({ 
          message: "You can only be a member of one pod at a time. Please leave your current pod before joining another." 
        });
      }
      
      // Check if user already has a pending request for this pod
      const hasPendingRequest = existingRequests.some(
        r => r.podId === requestData.podId && r.status === 'pending'
      );
      
      if (hasPendingRequest) {
        return res.status(400).json({ 
          message: "You already have a pending request for this pod." 
        });
      }
      
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
          console.log(`Sending join request notification to pod leader: ${podLead.email}`);
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            FROM_EMAIL
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
        
        if (pod && applicant && applicant.email) {
          if (status === "accepted") {
            const podLeader = await storage.getUser(pod.leadId);
            const podLeaderName = podLeader ? `${podLeader.firstName} ${podLeader.lastName}` : "Pod Leader";
            
            console.log(`Sending join request accepted email to ${applicant.email}`);
            await sendJoinRequestAcceptedNotification(
              applicant.email,
              `${applicant.firstName} ${applicant.lastName}`,
              pod.title,
              podLeaderName,
              FROM_EMAIL
            );
          } else if (status === "rejected") {
            console.log(`Sending join request rejected email to ${applicant.email}`);
            await sendJoinRequestRejectedNotification(
              applicant.email,
              `${applicant.firstName} ${applicant.lastName}`,
              pod.title,
              FROM_EMAIL
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

  // Cancel a pending join request (by the user who created it)
  app.delete("/api/join-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get the join request
      const joinRequest = await storage.getJoinRequest(id);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Check if the user owns this request
      if (joinRequest.userId !== userId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }
      
      // Check if the request is still pending
      if (joinRequest.status !== 'pending') {
        return res.status(400).json({ message: "Only pending requests can be cancelled" });
      }
      
      // Update status to cancelled
      const cancelledRequest = await storage.updateJoinRequestStatus(id, 'cancelled' as any);
      
      res.json({ message: "Join request cancelled successfully", request: cancelledRequest });
    } catch (error) {
      console.error("Error cancelling join request:", error);
      res.status(500).json({ message: "Failed to cancel join request" });
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
          const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null;
          return {
            ...member,
            userName: userName || 'Unknown Member',
            userEmail: user?.email || null,
            userPhone: user?.phone || null,
            user: user ? sanitizeUser(user) : null
          };
        })
      );
      
      res.json(membersWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pod members" });
    }
  });

  // Remove a pod member (pod leader only)
  app.delete("/api/pods/:podId/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const podId = parseInt(req.params.podId);
      const memberUserId = req.params.userId;
      
      // Get the pod to verify the requester is the leader
      const pod = await storage.getPod(podId);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }
      
      // Check if the requester is the pod leader
      if (pod.leadId !== req.user.id) {
        return res.status(403).json({ message: "Only the pod leader can remove members" });
      }
      
      // Cannot remove yourself (the leader) from the pod
      if (memberUserId === req.user.id) {
        return res.status(400).json({ message: "Pod leaders cannot remove themselves from their own pod" });
      }
      
      // Get the member user info before removal (for email notification)
      const memberUser = await storage.getUser(memberUserId);
      if (!memberUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove the member from the pod
      const removedMember = await storage.removePodMember(podId, memberUserId, req.user.id);
      if (!removedMember) {
        return res.status(404).json({ message: "Member not found in this pod" });
      }
      
      // Update pod availability (add back the spot)
      const currentMembers = await storage.getPodMembers(podId);
      const newAvailableSpots = pod.totalSpots - currentMembers.length;
      await storage.updatePodAvailability(podId, newAvailableSpots);
      
      // Send email notification to the removed member
      try {
        if (memberUser.email) {
          console.log(`Sending member removal notification to ${memberUser.email}`);
          await sendMemberRemovedNotification(
            memberUser.email,
            `${memberUser.firstName || ''} ${memberUser.lastName || ''}`.trim() || 'Member',
            pod.title,
            pod.clubName,
            FROM_EMAIL
          );
        }
      } catch (emailError) {
        console.error("Failed to send member removal email:", emailError);
        // Don't fail the request if email fails
      }
      
      res.json({ 
        message: "Member removed successfully",
        removedMember: {
          ...removedMember,
          user: sanitizeUser(memberUser)
        }
      });
    } catch (error) {
      console.error("Error removing pod member:", error);
      res.status(500).json({ message: "Failed to remove pod member" });
    }
  });

  // ========== LEAVE REQUEST ROUTES ==========

  // Create a leave request (member requests to leave a pod)
  app.post("/api/pods/:podId/leave-request", isAuthenticated, async (req: any, res) => {
    try {
      const podId = parseInt(req.params.podId);
      const userId = req.user.id;
      const { reason } = req.body;

      // Get the pod
      const pod = await storage.getPod(podId);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }

      // Check if user is a member of the pod
      const members = await storage.getPodMembers(podId);
      const isMember = members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this pod" });
      }

      // Check if there's already a pending leave request
      const existingRequest = await storage.getPendingLeaveRequestForUserInPod(userId, podId);
      if (existingRequest) {
        return res.status(400).json({ message: "You already have a pending leave request for this pod" });
      }

      // Get user info
      const user = await storage.getUser(userId);
      const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Member';
      const memberEmail = user?.email || '';

      // Create the leave request
      const leaveRequest = await storage.createLeaveRequest({
        podId,
        userId,
        status: "pending",
        reason: reason || null,
        userInfo: {
          name: memberName,
          email: memberEmail,
          phone: user?.phone || undefined
        },
        emailStatus: "pending"
      });

      // Send email notification to pod leader
      let emailStatus = "sent";
      try {
        const podLead = await storage.getUser(pod.leadId);
        if (podLead && podLead.email) {
          console.log(`Sending leave request notification to pod leader: ${podLead.email}`);
          const emailSent = await sendLeaveRequestNotification(
            podLead.email,
            pod.title,
            memberName,
            memberEmail,
            reason || null,
            FROM_EMAIL
          );
          emailStatus = emailSent ? "sent" : "failed";
        } else {
          emailStatus = "failed";
        }
      } catch (emailError) {
        console.error("Failed to send leave request email:", emailError);
        emailStatus = "failed";
      }

      // Update email status
      await storage.updateLeaveRequestEmailStatus(leaveRequest.id, emailStatus);

      res.status(201).json({
        ...leaveRequest,
        emailStatus
      });
    } catch (error) {
      console.error("Error creating leave request:", error);
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });

  // Get leave requests for a pod (leader only)
  app.get("/api/pods/:podId/leave-requests", isAuthenticated, async (req: any, res) => {
    try {
      const podId = parseInt(req.params.podId);
      const userId = req.user.id;

      // Get the pod
      const pod = await storage.getPod(podId);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }

      // Check if user is the pod leader
      if (pod.leadId !== userId) {
        return res.status(403).json({ message: "Only the pod leader can view leave requests" });
      }

      const leaveRequests = await storage.getLeaveRequestsForPod(podId);
      
      // Enrich with user info
      const enrichedRequests = await Promise.all(
        leaveRequests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          return {
            ...request,
            user: user ? sanitizeUser(user) : null
          };
        })
      );

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  // Get leave requests for current user
  app.get("/api/leave-requests/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const leaveRequests = await storage.getLeaveRequestsForUser(userId);
      
      // Enrich with pod info
      const enrichedRequests = await Promise.all(
        leaveRequests.map(async (request) => {
          const pod = await storage.getPod(request.podId);
          return {
            ...request,
            pod: pod || null
          };
        })
      );

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching user leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  // Approve leave request (leader only)
  app.post("/api/leave-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const leaveRequestId = parseInt(req.params.id);
      const userId = req.user.id;
      const { response } = req.body; // Optional leader response

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(leaveRequestId);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      if (leaveRequest.status !== "pending") {
        return res.status(400).json({ message: "This leave request has already been processed" });
      }

      // Get the pod
      const pod = await storage.getPod(leaveRequest.podId);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }

      // Check if user is the pod leader
      if (pod.leadId !== userId) {
        return res.status(403).json({ message: "Only the pod leader can approve leave requests" });
      }

      // Update leave request status
      const updatedRequest = await storage.updateLeaveRequestStatus(leaveRequestId, "approved", response);

      // Remove the member from the pod
      await storage.removePodMember(leaveRequest.podId, leaveRequest.userId, userId);

      // Update pod availability
      await storage.updatePodAvailability(leaveRequest.podId, pod.availableSpots + 1);

      // Send email notification to member
      try {
        const member = await storage.getUser(leaveRequest.userId);
        if (member && member.email) {
          const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
          console.log(`Sending leave request approved notification to: ${member.email}`);
          await sendLeaveRequestApprovedNotification(
            member.email,
            memberName,
            pod.title,
            response || null,
            FROM_EMAIL
          );
        }
      } catch (emailError) {
        console.error("Failed to send leave request approved email:", emailError);
      }

      res.json({
        message: "Leave request approved. Member has been removed from the pod.",
        leaveRequest: updatedRequest
      });
    } catch (error) {
      console.error("Error approving leave request:", error);
      res.status(500).json({ message: "Failed to approve leave request" });
    }
  });

  // Reject leave request (leader only)
  app.post("/api/leave-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const leaveRequestId = parseInt(req.params.id);
      const userId = req.user.id;
      const { response } = req.body; // Optional leader response

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(leaveRequestId);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      if (leaveRequest.status !== "pending") {
        return res.status(400).json({ message: "This leave request has already been processed" });
      }

      // Get the pod
      const pod = await storage.getPod(leaveRequest.podId);
      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }

      // Check if user is the pod leader
      if (pod.leadId !== userId) {
        return res.status(403).json({ message: "Only the pod leader can reject leave requests" });
      }

      // Update leave request status
      const updatedRequest = await storage.updateLeaveRequestStatus(leaveRequestId, "rejected", response);

      // Send email notification to member
      try {
        const member = await storage.getUser(leaveRequest.userId);
        if (member && member.email) {
          const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
          console.log(`Sending leave request rejected notification to: ${member.email}`);
          await sendLeaveRequestRejectedNotification(
            member.email,
            memberName,
            pod.title,
            response || null,
            FROM_EMAIL
          );
        }
      } catch (emailError) {
        console.error("Failed to send leave request rejected email:", emailError);
      }

      res.json({
        message: "Leave request rejected. Member remains in the pod.",
        leaveRequest: updatedRequest
      });
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      res.status(500).json({ message: "Failed to reject leave request" });
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
          console.log(`Resending join request notification to pod leader: ${podLead.email}`);
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            FROM_EMAIL
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
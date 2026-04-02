import type { Express } from "express";
import { createServer, type Server } from "http";
import { findMatchingPods, generateJoinMessage } from "./aiPodMatching";
import { processAgentMessage } from "./podAgent";
import { addSSEClient, notifyUsers } from "./messagingSSE";
import { storage } from "./storage";
import { db } from "./db";
import { joinRequests } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  setupAuth,
  isAuthenticated,
  hashPassword,
  comparePassword,
} from "./multiAuth";
import passport from "passport";
import {
  sendJoinRequestNotification,
  sendJoinRequestAcceptedNotification,
  sendJoinRequestRejectedNotification,
  sendJoinRequestsAutoCancelledNotification,
  sendPasswordResetEmail,
  sendPasswordSetupEmail,
  sendWelcomeEmail,
  sendPodCreatedEmail,
  sendMemberRemovedNotification,
  send2FAVerificationEmail,
  sendEmailVerification,
  sendLeaveRequestNotification,
  sendLeaveRequestApprovedNotification,
  sendLeaveRequestRejectedNotification,
  sendOutstandingBalanceNotification,
  FROM_EMAIL,
} from "./emailService";
import crypto from "crypto";
import { z } from "zod";
import { insertPodSchema, insertJoinRequestSchema } from "@shared/schema";
import type { User, Pod } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { Polar } from "@polar-sh/sdk";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import * as client from "openid-client";

// Platform fee constants
const DEFAULT_PLATFORM_FEE_PERCENTAGE = 5; // 5% default platform fee

// Initialize Polar SDK
const polar = process.env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    })
  : null;

// Sanitize user data to remove sensitive fields
function sanitizeUser(user: User) {
  const {
    passwordHash,
    emailVerificationToken,
    emailVerificationExpires,
    passwordResetToken,
    passwordResetExpires,
    ...sanitized
  } = user;
  return sanitized;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      console.log("📥 GET /api/auth/user - Returning user:", {
        id: req.user.id,
        email: req.user.email,
        userType: req.user.userType,
        hasCompletedOnboarding: req.user.hasCompletedOnboarding,
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

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const emailVerificationExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ); // 24 hours

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
        user.firstName || "there",
        emailVerificationToken,
        FROM_EMAIL,
      );

      if (!emailSent) {
        console.error("Failed to send verification email");
      }

      // Return success without logging in - user must verify email first
      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
        email: user.email,
        requiresVerification: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res
          .status(400)
          .json({ message: "Verification token is required" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired verification token" });
      }

      // Check if token has expired
      if (
        user.emailVerificationExpires &&
        new Date() > new Date(user.emailVerificationExpires)
      ) {
        return res.status(400).json({
          message: "Verification token has expired. Please request a new one.",
        });
      }

      // Mark email as verified and clear the token
      await storage.verifyUserEmail(user.id);

      // Send welcome email now that email is verified
      console.log(`Sending welcome email to verified user ${user.email}`);
      sendWelcomeEmail(user.email, user.firstName || "there", FROM_EMAIL).catch(
        (error) => console.error("Failed to send welcome email:", error),
      );

      res.json({
        message: "Email verified successfully! You can now log in.",
        success: true,
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists
        return res.json({
          message:
            "If an account exists with this email, a verification email will be sent.",
        });
      }

      if (user.isEmailVerified) {
        return res
          .status(400)
          .json({ message: "Email is already verified. You can log in." });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const emailVerificationExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ); // 24 hours

      // Update user with new token
      await storage.updateUserVerificationToken(
        user.id,
        emailVerificationToken,
        emailVerificationExpires,
      );

      // Send verification email
      const emailSent = await sendEmailVerification(
        user.email,
        user.firstName || "there",
        emailVerificationToken,
        FROM_EMAIL,
      );

      if (!emailSent) {
        console.error("Failed to send verification email");
        return res
          .status(500)
          .json({ message: "Failed to send verification email" });
      }

      res.json({
        message: "Verification email sent. Please check your inbox.",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Check if user exists and needs password setup (signed up with OAuth but trying email/password login)
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser && !existingUser.passwordHash) {
        // User signed up with OAuth and needs to set up a password
        return res.status(403).json({
          message: "This account was created using Google Sign-In. Please set up a password to log in with email.",
          requiresPasswordSetup: true,
          email: existingUser.email,
        });
      }

      passport.authenticate("local", async (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info.message || "Invalid credentials" });
        }

        // Check if email is verified (only for local auth users)
        if (user.authProvider === "local" && !user.isEmailVerified) {
          return res.status(403).json({
            message: "Please verify your email before logging in.",
            requiresEmailVerification: true,
            email: user.email,
          });
        }

        // Generate 6-digit 2FA verification code
        const verificationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();
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
          const userName = user.firstName || user.email.split("@")[0];
          const emailSent = await send2FAVerificationEmail(
            user.email,
            userName,
            verificationCode,
            FROM_EMAIL,
          );

          if (!emailSent) {
            console.error("Failed to send 2FA verification email");
            // Still continue - user can request a resend
          }

          console.log(`2FA code generated for user ${user.email}`);

          // Return response indicating 2FA is required (without logging in)
          return res.json({
            requires2FA: true,
            userId: user.id,
            email: user.email,
            message: "Verification code sent to your email",
          });
        } catch (error) {
          console.error("Error creating 2FA verification:", error);
          return res
            .status(500)
            .json({ message: "Failed to send verification code" });
        }
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
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
    message: {
      message: "Too many verification attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/auth/verify-2fa", verify2FALimiter, async (req, res) => {
    try {
      const validatedData = verify2FASchema.parse(req.body);

      // Verify the 2FA code
      const isValid = await storage.verifyEmail2FACode(
        validatedData.userId,
        validatedData.code,
      );

      if (!isValid) {
        return res
          .status(401)
          .json({ message: "Invalid or expired verification code" });
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
          console.error("Error logging in user after 2FA:", err);
          return res.status(500).json({ message: "Failed to complete login" });
        }
        console.log(`2FA verification successful for user ${user.email}`);
        res.json({ user: sanitizeUser(user), message: "Login successful" });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Error verifying 2FA:", error);
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

  app.post("/api/auth/resend-2fa", resend2FALimiter, async (req, res) => {
    try {
      const validatedData = resend2FASchema.parse(req.body);

      // Get the user
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a new 6-digit verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Store the new verification code (this deletes any existing code)
      await storage.createEmail2FAVerification({
        userId: user.id,
        email: user.email,
        code: verificationCode,
        expiresAt,
      });

      // Send the verification email
      const userName = user.firstName || user.email.split("@")[0];
      const emailSent = await send2FAVerificationEmail(
        user.email,
        userName,
        verificationCode,
        FROM_EMAIL,
      );

      if (!emailSent) {
        console.error("Failed to resend 2FA verification email");
        return res
          .status(500)
          .json({ message: "Failed to send verification code" });
      }

      console.log(`2FA code resent for user ${user.email}`);
      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Error resending 2FA code:", error);
      return res
        .status(500)
        .json({ message: "Failed to resend verification code" });
    }
  });

  // Auth providers endpoint
  app.get("/api/auth/providers", (req, res) => {
    const providers = ["local"];
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push("google");
    }
    if (
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
    ) {
      providers.push("apple");
    }
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      providers.push("phone");
    }
    res.json({ providers });
  });

  // Google OAuth routes (only if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] }),
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login" }),
      async (req, res) => {
        // Successful authentication, redirect based on user type
        // Fetch fresh user data from database to ensure we have latest userType
        const sessionUser = req.user as any;

        // Try to fetch by email first (more reliable), fallback to ID if no valid email
        let user;
        if (sessionUser?.email && sessionUser.email.trim() !== "") {
          user = await storage.getUserByEmail(sessionUser.email);
        }

        // Fallback to ID if email lookup failed or email was invalid
        if (!user && sessionUser?.id) {
          user = await storage.getUser(sessionUser.id);
        }

        if (!user) {
          return res.redirect("/login");
        }

        if (user.userType) {
          // User has already selected a type, redirect to their dashboard
          if (user.userType === "pod_leader") {
            res.redirect("/pod-leader-dashboard");
          } else {
            res.redirect("/dashboard");
          }
        } else {
          // User needs to select user type
          res.redirect("/user-type-selection");
        }
      },
    );
  } else {
    // Return error if Google OAuth is not configured
    app.get("/api/auth/google", (req, res) => {
      res.status(503).json({ message: "Google OAuth is not configured" });
    });
  }

  // Apple OAuth routes (only if configured)
  if (
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    app.get("/api/auth/apple", passport.authenticate("apple"));

    app.post(
      "/api/auth/apple/callback",
      passport.authenticate("apple", { failureRedirect: "/login" }),
      async (req, res) => {
        // Successful authentication, redirect based on user type
        // Fetch fresh user data from database to ensure we have latest userType
        const sessionUser = req.user as any;

        // Try to fetch by email first (more reliable), fallback to ID if no valid email
        let user;
        if (sessionUser?.email && sessionUser.email.trim() !== "") {
          user = await storage.getUserByEmail(sessionUser.email);
        }

        // Fallback to ID if email lookup failed or email was invalid
        if (!user && sessionUser?.id) {
          user = await storage.getUser(sessionUser.id);
        }

        if (!user) {
          return res.redirect("/login");
        }

        if (user.userType) {
          // User has already selected a type, redirect to their dashboard
          if (user.userType === "pod_leader") {
            res.redirect("/pod-leader-dashboard");
          } else {
            res.redirect("/dashboard");
          }
        } else {
          // User needs to select user type
          res.redirect("/user-type-selection");
        }
      },
    );
  } else {
    // Return error if Apple OAuth is not configured
    app.get("/api/auth/apple", (req, res) => {
      res.status(503).json({
        message:
          "Apple OAuth is not configured. Please configure Apple OAuth credentials.",
      });
    });
  }

  // Phone number authentication routes - Rate limiting
  const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each phone number to 3 OTP requests per window
    message: "Too many OTP requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.phoneNumber || "unknown", // Rate limit by phone number
    skip: (req) => !req.body.phoneNumber, // Skip if no phone number provided
  });

  const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each phone number to 5 verification attempts per window
    message: "Too many verification attempts. Please request a new code.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.phoneNumber || "unknown",
    skip: (req) => !req.body.phoneNumber,
  });

  app.post("/api/auth/phone/send-otp", otpSendLimiter, async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Basic phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
      if (!phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ""))) {
        return res
          .status(400)
          .json({ message: "Please enter a valid phone number" });
      }

      // Check if Twilio is configured
      if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN ||
        !process.env.TWILIO_PHONE_NUMBER
      ) {
        return res.status(503).json({
          message: "SMS service is not configured. Please contact support.",
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
      const twilio = require("twilio");
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      await twilioClient.messages.create({
        body: `Your FlexPod verification code is: ${otp}. This code expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      res.json({
        message: "OTP sent successfully",
        expiresIn: 300, // 5 minutes in seconds
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again." });
    }
  });

  app.post("/api/auth/phone/verify", otpVerifyLimiter, (req, res, next) => {
    passport.authenticate("phone", (err: any, user: any, info: any) => {
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
          message: "Phone verification successful",
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.get("/api/auth/logout", async (req, res) => {
    // const config = await getOidcConfig(); // Get the OIDC config for the redirect

    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });

      req.session.destroy((destroyErr) => {
        if (destroyErr)
          return res.status(500).json({ message: "Failed to destroy session" });


        // 1. Clear the local cookie - match EXACTLY how it was set in multiAuth.ts
        // The session cookie is set with: httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', no domain
        const cookieOptions = {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
        };

        console.log("🔓 Logout: Clearing session cookie with options:", cookieOptions);
        
        res.clearCookie("connect.sid", cookieOptions);
        
        // Also try clearing with minimal options as fallback
        res.clearCookie("connect.sid");
        res.clearCookie("connect.sid", { path: "/" });
        
        req.user = undefined;

        // 2. Redirect to OIDC provider to end the global session
        // const endSessionUrl = client.buildEndSessionUrl(config, {
        //   client_id: process.env.REPL_ID!,
        //   post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        // }).href;
        res.redirect("/");
      });
    });
  });

  // Forgot password route
  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);

      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);

      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (user && user.authProvider === "local") {
        // Generate reset token (32 bytes, hex encoded = 64 characters)
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Set token expiration to 1 hour from now
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Save token to database
        await storage.setPasswordResetToken(
          validatedData.email,
          resetToken,
          resetExpires,
        );

        // Send password reset email
        const userName = user.firstName || user.email.split("@")[0];

        console.log(`Sending password reset email to ${user.email}`);
        await sendPasswordResetEmail(
          user.email,
          userName,
          resetToken,
          FROM_EMAIL,
        );
      }

      // Always return success message
      res.json({
        message:
          "If an account exists with that email, a password reset link has been sent.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid email format",
          errors: error.errors,
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

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      // Get user by reset token (validates token and expiration)
      const user = await storage.getUserByResetToken(validatedData.token);

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid or expired reset token. Please request a new password reset.",
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);

      // Update user password
      await storage.updateUser(user.id, { passwordHash });

      // Clear reset token
      await storage.clearPasswordResetToken(user.id);

      res.json({
        message:
          "Password reset successful. You can now log in with your new password.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Request password setup for OAuth users
  const requestPasswordSetupSchema = z.object({
    email: z.string().email("Invalid email format"),
  });

  app.post("/api/auth/request-password-setup", async (req, res) => {
    try {
      const validatedData = requestPasswordSetupSchema.parse(req.body);

      // Check if user exists and has no password (OAuth user)
      const user = await storage.getUserByEmail(validatedData.email);

      if (!user) {
        // Return success to prevent email enumeration
        return res.json({
          message: "If an account exists with that email, a password setup link has been sent.",
        });
      }

      // Only allow password setup for OAuth users without password
      if (user.passwordHash) {
        return res.status(400).json({
          message: "This account already has a password. Use 'Forgot Password' if you need to reset it.",
        });
      }

      // Generate setup token (32 bytes, hex encoded = 64 characters)
      const setupToken = crypto.randomBytes(32).toString("hex");

      // Set token expiration to 24 hours from now
      const setupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save token to database (reuse password reset token fields)
      await storage.setPasswordResetToken(
        validatedData.email,
        setupToken,
        setupExpires,
      );

      // Send password setup email
      const userName = user.firstName || user.email.split("@")[0];

      console.log(`Sending password setup email to ${user.email}`);
      await sendPasswordSetupEmail(
        user.email,
        userName,
        setupToken,
        FROM_EMAIL,
      );

      res.json({
        message: "Password setup link has been sent to your email.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid email format",
          errors: error.errors,
        });
      }
      console.error("Request password setup error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Setup password for OAuth users
  const setupPasswordSchema = z.object({
    token: z.string().min(1, "Setup token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/auth/setup-password", async (req, res) => {
    try {
      const validatedData = setupPasswordSchema.parse(req.body);

      // Get user by reset token (validates token and expiration)
      const user = await storage.getUserByResetToken(validatedData.token);

      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired setup token. Please request a new password setup link.",
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);

      // Update user with password and update auth provider
      const newAuthProvider = user.googleId 
        ? "local+google" 
        : (user.appleId ? "local+apple" : "local");
      
      await storage.updateUser(user.id, { 
        passwordHash,
        authProvider: newAuthProvider,
      });

      // Clear setup token
      await storage.clearPasswordResetToken(user.id);

      res.json({
        message: "Password setup successful. You can now log in with your email and password.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Setup password error:", error);
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

      // Validate total spots doesn't exceed 10
      if (podData.totalSpots > 10) {
        return res.status(400).json({
          message:
            "Total spots cannot exceed 10 members (including pod leader)",
        });
      }

      // Check if the leader already has a pod
      const existingPods = await storage.getPodsByLeaderId(req.user.id);
      if (existingPods && existingPods.length > 0) {
        return res.status(400).json({
          message:
            "You can only create one pod. Please edit your existing pod or delete it to create a new one.",
        });
      }

      // Set the leadId from the authenticated user
      // Available spots = total spots - 1 (leader takes one spot)
      const pod = await storage.createPod({
        ...podData,
        leadId: req.user.id,
        availableSpots: podData.totalSpots - 1,
      });

      // Send congratulatory email to pod leader
      console.log(`Sending pod created email to ${req.user.email}`);
      sendPodCreatedEmail(
        req.user.email,
        req.user.firstName || "Pod Leader",
        pod.title,
        pod.clubName,
        pod.totalSpots,
        FROM_EMAIL,
      ).catch((error) =>
        console.error("Failed to send pod created email:", error),
      );

      res.status(201).json(pod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid pod data", errors: error.errors });
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
        return res
          .status(403)
          .json({ message: "Only the pod leader can update this pod" });
      }

      // Validate and update pod data
      const updateSchema = insertPodSchema.partial();
      const updateData = updateSchema.parse(req.body) as Partial<Pod>;

      // Validate required text fields
      if (updateData.title !== undefined && !updateData.title.trim()) {
        return res.status(400).json({ message: "Pod title cannot be empty" });
      }

      if (
        updateData.description !== undefined &&
        !updateData.description.trim()
      ) {
        return res
          .status(400)
          .json({ message: "Pod description cannot be empty" });
      }

      if (updateData.clubName !== undefined && !updateData.clubName.trim()) {
        return res.status(400).json({ message: "Club name cannot be empty" });
      }

      if (
        updateData.clubRegion !== undefined &&
        !updateData.clubRegion.trim()
      ) {
        return res.status(400).json({ message: "Club region cannot be empty" });
      }

      if (
        updateData.clubAddress !== undefined &&
        !updateData.clubAddress.trim()
      ) {
        return res
          .status(400)
          .json({ message: "Club address cannot be empty" });
      }

      // Server-side bounds checking for numeric fields
      if (updateData.costPerPerson !== undefined) {
        if (!Number.isFinite(updateData.costPerPerson)) {
          return res
            .status(400)
            .json({ message: "Please enter a valid cost per person" });
        }
        if (updateData.costPerPerson <= 0) {
          return res
            .status(400)
            .json({ message: "Cost per person must be greater than 0" });
        }
      }

      if (updateData.totalSpots !== undefined) {
        if (!Number.isFinite(updateData.totalSpots)) {
          return res
            .status(400)
            .json({ message: "Please enter a valid number of total spots" });
        }
        if (updateData.totalSpots <= 0) {
          return res
            .status(400)
            .json({ message: "Total spots must be at least 1" });
        }
        if (updateData.totalSpots > 10) {
          return res.status(400).json({
            message:
              "Total spots cannot exceed 10 members (including pod leader)",
          });
        }

        // Check if reducing total spots would affect existing members
        const currentMembers = pod.totalSpots - pod.availableSpots;
        if (updateData.totalSpots < currentMembers) {
          return res.status(400).json({
            message: `Cannot reduce total spots to ${updateData.totalSpots}. You have ${currentMembers} current members.`,
          });
        }
      }

      if (updateData.availableSpots !== undefined) {
        if (!Number.isFinite(updateData.availableSpots)) {
          return res.status(400).json({
            message: "Please enter a valid number of available spots",
          });
        }
        if (updateData.availableSpots < 0) {
          return res
            .status(400)
            .json({ message: "Available spots cannot be negative" });
        }

        const totalSpots = updateData.totalSpots ?? pod.totalSpots;
        if (updateData.availableSpots > totalSpots) {
          return res.status(400).json({
            message: `Available spots (${updateData.availableSpots}) cannot exceed total spots (${totalSpots})`,
          });
        }
      }

      const updatedPod = await storage.updatePod(id, updateData);

      res.json(updatedPod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid pod data", errors: error.errors });
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
        return res
          .status(403)
          .json({ message: "Only the pod leader can delete this pod" });
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
      const existingRequests = await storage.getJoinRequestsForUser(
        requestData.userId,
      );
      const hasActiveMembership = existingRequests.some(
        (r) => r.status === "accepted",
      );

      if (hasActiveMembership) {
        return res.status(400).json({
          message:
            "You can only be a member of one pod at a time. Please leave your current pod before joining another.",
        });
      }

      // Check if user has an approved leave request with unpaid outstanding balance
      const activeLeaveRequest = await storage.getUserApprovedLeaveRequest(requestData.userId);
      if (
        activeLeaveRequest &&
        activeLeaveRequest.outstandingBalance > 0 &&
        !activeLeaveRequest.balancePaidAt
      ) {
        const balanceDollars = (activeLeaveRequest.outstandingBalance / 100).toFixed(2);
        return res.status(400).json({
          message: `You have an outstanding balance of $${balanceDollars} for your current pod. Please pay this balance before joining a new pod.`,
          code: "OUTSTANDING_BALANCE",
          outstandingBalance: activeLeaveRequest.outstandingBalance,
          leaveRequestId: activeLeaveRequest.id,
        });
      }

      // Check if user already has a pending request for this pod
      const hasPendingRequest = existingRequests.some(
        (r) => r.podId === requestData.podId && r.status === "pending",
      );

      if (hasPendingRequest) {
        return res.status(400).json({
          message: "You already have a pending request for this pod.",
        });
      }

      // If user has an approved leave request (balance cleared), set scheduled start date
      let scheduledStartDate: Date | undefined;
      if (activeLeaveRequest && activeLeaveRequest.exitDate) {
        scheduledStartDate = new Date(activeLeaveRequest.exitDate);
      }

      // Create the join request first
      const joinRequest = await storage.createJoinRequest({
        ...requestData,
        emailStatus: "pending",
        ...(scheduledStartDate ? { scheduledStartDate } : {}),
      });

      // Send email notification to pod leader
      try {
        const pod = await storage.getPod(joinRequest.podId);
        const podLead = await storage.getUser(pod?.leadId || "");
        const applicant = await storage.getUser(joinRequest.userId);

        if (pod && podLead && applicant && podLead.email) {
          console.log(
            `Sending join request notification to pod leader: ${podLead.email}`,
          );
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            FROM_EMAIL,
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
      const updatedRequest = await storage.updateJoinRequestEmailStatus(
        joinRequest.id,
        emailStatus,
      );

      res.status(201).json({
        ...updatedRequest,
        emailStatus,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid request data", errors: error.errors });
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

      // If accepted, add user to pod members and cancel other pending requests
      let cancelledRequests: any[] = [];
      if (status === "accepted") {
        await storage.addPodMember(updatedRequest.podId, updatedRequest.userId);

        // Update pod availability
        const pod = await storage.getPod(updatedRequest.podId);
        if (pod && pod.availableSpots > 0) {
          await storage.updatePodAvailability(
            updatedRequest.podId,
            pod.availableSpots - 1,
          );
        }

        // Cancel all other pending requests from this user
        cancelledRequests = await storage.cancelOtherPendingRequests(
          updatedRequest.userId,
          updatedRequest.id,
        );
        if (cancelledRequests.length > 0) {
          console.log(
            `Auto-cancelled ${cancelledRequests.length} other pending requests for user ${updatedRequest.userId}`,
          );
        }
      }

      // Send email notification to applicant
      try {
        const pod = await storage.getPod(updatedRequest.podId);
        const applicant = await storage.getUser(updatedRequest.userId);

        if (pod && applicant && applicant.email) {
          if (status === "accepted") {
            const podLeader = await storage.getUser(pod.leadId);
            const podLeaderName = podLeader
              ? `${podLeader.firstName} ${podLeader.lastName}`
              : "Pod Leader";

            // If there were cancelled requests, send combined notification
            if (cancelledRequests.length > 0) {
              // Get the pod titles for cancelled requests
              const cancelledPodTitles: string[] = [];
              for (const req of cancelledRequests) {
                const cancelledPod = await storage.getPod(req.podId);
                if (cancelledPod) {
                  cancelledPodTitles.push(cancelledPod.title);
                }
              }

              console.log(
                `Sending combined accepted + auto-cancelled email to ${applicant.email}`,
              );
              await sendJoinRequestsAutoCancelledNotification(
                applicant.email,
                `${applicant.firstName} ${applicant.lastName}`,
                pod.title,
                cancelledPodTitles,
                FROM_EMAIL,
              );
            } else {
              console.log(
                `Sending join request accepted email to ${applicant.email}`,
              );
              await sendJoinRequestAcceptedNotification(
                applicant.email,
                `${applicant.firstName} ${applicant.lastName}`,
                pod.title,
                podLeaderName,
                FROM_EMAIL,
              );
            }
          } else if (status === "rejected") {
            console.log(
              `Sending join request rejected email to ${applicant.email}`,
            );
            await sendJoinRequestRejectedNotification(
              applicant.email,
              `${applicant.firstName} ${applicant.lastName}`,
              pod.title,
              FROM_EMAIL,
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
  app.delete(
    "/api/join-requests/:id",
    isAuthenticated,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ message: "You can only cancel your own requests" });
        }

        // Check if the request is still pending
        if (joinRequest.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Only pending requests can be cancelled" });
        }

        // Update status to cancelled
        const cancelledRequest = await storage.updateJoinRequestStatus(
          id,
          "cancelled",
        );

        res.json({
          message: "Join request cancelled successfully",
          request: cancelledRequest,
        });
      } catch (error) {
        console.error("Error cancelling join request:", error);
        res.status(500).json({ message: "Failed to cancel join request" });
      }
    },
  );

  // Get pod members with user details
  app.get("/api/pods/:id/members", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const members = await storage.getPodMembers(podId);

      // Fetch user details for each member
      const membersWithUserInfo = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          const userName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : null;
          return {
            ...member,
            userName: userName || "Unknown Member",
            userEmail: user?.email || null,
            userPhone: user?.phone || null,
            user: user ? sanitizeUser(user) : null,
          };
        }),
      );

      res.json(membersWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pod members" });
    }
  });

  // Remove a pod member (pod leader only)
  app.delete(
    "/api/pods/:podId/members/:userId",
    isAuthenticated,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ message: "Only the pod leader can remove members" });
        }

        // Cannot remove yourself (the leader) from the pod
        if (memberUserId === req.user.id) {
          return res.status(400).json({
            message: "Pod leaders cannot remove themselves from their own pod",
          });
        }

        // Get the member user info before removal (for email notification)
        const memberUser = await storage.getUser(memberUserId);
        if (!memberUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove the member from the pod
        const removedMember = await storage.removePodMember(
          podId,
          memberUserId,
          req.user.id,
        );
        if (!removedMember) {
          return res
            .status(404)
            .json({ message: "Member not found in this pod" });
        }

        // Update pod availability (add back the spot)
        const currentMembers = await storage.getPodMembers(podId);
        const newAvailableSpots = pod.totalSpots - currentMembers.length;
        await storage.updatePodAvailability(podId, newAvailableSpots);

        // Send email notification to the removed member
        try {
          if (memberUser.email) {
            console.log(
              `Sending member removal notification to ${memberUser.email}`,
            );
            await sendMemberRemovedNotification(
              memberUser.email,
              `${memberUser.firstName || ""} ${memberUser.lastName || ""}`.trim() ||
                "Member",
              pod.title,
              pod.clubName,
              FROM_EMAIL,
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
            user: sanitizeUser(memberUser),
          },
        });
      } catch (error) {
        console.error("Error removing pod member:", error);
        res.status(500).json({ message: "Failed to remove pod member" });
      }
    },
  );

  // ========== LEAVE REQUEST ROUTES ==========

  // Create a leave request (member requests to leave a pod)
  app.post(
    "/api/pods/:podId/leave-request",
    isAuthenticated,
    async (req: any, res) => {
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
        const isMember = members.some((m) => m.userId === userId);
        if (!isMember) {
          return res
            .status(403)
            .json({ message: "You are not a member of this pod" });
        }

        // Check if there's already a pending leave request
        const existingRequest =
          await storage.getPendingLeaveRequestForUserInPod(userId, podId);
        if (existingRequest) {
          return res.status(400).json({
            message: "You already have a pending leave request for this pod",
          });
        }

        // Check for pending payments - members can only leave if no pending payments
        const pendingPayments = await storage.getPendingPaymentsForUserInPod(
          userId,
          podId,
        );
        if (pendingPayments.length > 0) {
          return res.status(400).json({
            message:
              "You cannot leave the pod while you have pending payments. Please complete all outstanding payments first.",
            pendingPaymentsCount: pendingPayments.length,
          });
        }

        // Get user info
        const user = await storage.getUser(userId);
        const memberName =
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Member";
        const memberEmail = user?.email || "";

        // Create the leave request
        const leaveRequest = await storage.createLeaveRequest({
          podId,
          userId,
          status: "pending",
          reason: reason || null,
          userInfo: {
            name: memberName,
            email: memberEmail,
            phone: user?.phone || undefined,
          },
          emailStatus: "pending",
        });

        // Send email notification to pod leader
        let emailStatus = "sent";
        try {
          const podLead = await storage.getUser(pod.leadId);
          if (podLead && podLead.email) {
            console.log(
              `Sending leave request notification to pod leader: ${podLead.email}`,
            );
            const emailSent = await sendLeaveRequestNotification(
              podLead.email,
              pod.title,
              memberName,
              memberEmail,
              reason || null,
              FROM_EMAIL,
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
        await storage.updateLeaveRequestEmailStatus(
          leaveRequest.id,
          emailStatus,
        );

        res.status(201).json({
          ...leaveRequest,
          emailStatus,
        });
      } catch (error) {
        console.error("Error creating leave request:", error);
        res.status(500).json({ message: "Failed to create leave request" });
      }
    },
  );

  // Get leave requests for a pod (leader only)
  app.get(
    "/api/pods/:podId/leave-requests",
    isAuthenticated,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ message: "Only the pod leader can view leave requests" });
        }

        const leaveRequests = await storage.getLeaveRequestsForPod(podId);

        // Enrich with user info
        const enrichedRequests = await Promise.all(
          leaveRequests.map(async (request) => {
            const user = await storage.getUser(request.userId);
            return {
              ...request,
              user: user ? sanitizeUser(user) : null,
            };
          }),
        );

        res.json(enrichedRequests);
      } catch (error) {
        console.error("Error fetching leave requests:", error);
        res.status(500).json({ message: "Failed to fetch leave requests" });
      }
    },
  );

  // Get leave requests for current user
  app.get(
    "/api/leave-requests/user",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const leaveRequests = await storage.getLeaveRequestsForUser(userId);

        // Enrich with pod info
        const enrichedRequests = await Promise.all(
          leaveRequests.map(async (request) => {
            const pod = await storage.getPod(request.podId);
            return {
              ...request,
              pod: pod || null,
            };
          }),
        );

        res.json(enrichedRequests);
      } catch (error) {
        console.error("Error fetching user leave requests:", error);
        res.status(500).json({ message: "Failed to fetch leave requests" });
      }
    },
  );

  // Approve leave request (leader only)
  app.post(
    "/api/leave-requests/:id/approve",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const leaveRequestId = parseInt(req.params.id);
        const userId = req.user.id;
        const { response, exitTimelineDays: exitTimelineDaysOverride } = req.body; // Optional leader overrides

        // Get the leave request
        const leaveRequest = await storage.getLeaveRequest(leaveRequestId);
        if (!leaveRequest) {
          return res.status(404).json({ message: "Leave request not found" });
        }

        if (leaveRequest.status !== "pending") {
          return res
            .status(400)
            .json({ message: "This leave request has already been processed" });
        }

        // Get the pod
        const pod = await storage.getPod(leaveRequest.podId);
        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        // Check if user is the pod leader
        if (pod.leadId !== userId) {
          return res.status(403).json({
            message: "Only the pod leader can approve leave requests",
          });
        }

        // Calculate exit date based on billing cycle end + exit timeline
        // Exit date = end of current billing month + exitTimelineDays
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // End of current billing cycle (end of current month)
        const billingCycleEnd = new Date(
          currentYear,
          currentMonth + 1,
          0,
          23,
          59,
          59,
        );

        // Add exit timeline days — use leader's per-approval override, else pod default, else 30
        let exitTimelineDays = pod.exitTimelineDays ?? 30;
        if (
          typeof exitTimelineDaysOverride === "number" &&
          exitTimelineDaysOverride >= 0 &&
          exitTimelineDaysOverride <= 180
        ) {
          exitTimelineDays = exitTimelineDaysOverride;
        }
        const exitDate = new Date(billingCycleEnd);
        exitDate.setDate(exitDate.getDate() + exitTimelineDays);

        // Update leave request status with exit date
        const updatedRequest = await storage.updateLeaveRequestWithExitDate(
          leaveRequestId,
          "approved",
          exitDate,
          response,
        );

        // Note: Member is NOT removed immediately - they will be removed on the exit date
        // The actual removal should be handled by a scheduled job or when the exit date passes

        // Calculate outstanding balance from pending/failed payments for this member in this pod
        let outstandingBalance = 0;
        try {
          const pendingPayments = await storage.getPendingPaymentsForUserInPod(
            leaveRequest.userId,
            leaveRequest.podId,
          );
          outstandingBalance = pendingPayments.reduce(
            (sum, p) => sum + (p.status === "pending" || p.status === "failed" ? p.totalAmount : 0),
            0,
          );
          if (outstandingBalance > 0) {
            await storage.updateLeaveRequestOutstandingBalance(leaveRequestId, outstandingBalance);
          }
        } catch (balanceError) {
          console.error("Error calculating outstanding balance:", balanceError);
        }

        // Send email notification to member with exit date info
        try {
          const member = await storage.getUser(leaveRequest.userId);
          if (member && member.email) {
            const memberName =
              `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
              "Member";
            console.log(
              `Sending leave request approved notification to: ${member.email}`,
            );
            await sendLeaveRequestApprovedNotification(
              member.email,
              memberName,
              pod.title,
              response
                ? `${response}\n\nYour exit date is: ${exitDate.toLocaleDateString()}`
                : `Your exit date is: ${exitDate.toLocaleDateString()}`,
              FROM_EMAIL,
            );

            // Also send outstanding balance email if balance > 0
            if (outstandingBalance > 0) {
              console.log(
                `Sending outstanding balance notification to: ${member.email} - $${(outstandingBalance / 100).toFixed(2)}`,
              );
              await sendOutstandingBalanceNotification(
                member.email,
                memberName,
                pod.title,
                outstandingBalance,
                exitDate,
                FROM_EMAIL,
              );
            }
          }
        } catch (emailError) {
          console.error(
            "Failed to send leave request approved email:",
            emailError,
          );
        }

        res.json({
          message: `Leave request approved. Member will be removed from the pod on ${exitDate.toLocaleDateString()}.`,
          leaveRequest: updatedRequest,
          exitDate: exitDate.toISOString(),
        });
      } catch (error) {
        console.error("Error approving leave request:", error);
        res.status(500).json({ message: "Failed to approve leave request" });
      }
    },
  );

  // Mark outstanding balance as paid (called by member after payment)
  app.post(
    "/api/leave-requests/:id/mark-balance-paid",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const leaveRequestId = parseInt(req.params.id);
        const userId = req.user.id;

        const leaveRequest = await storage.getLeaveRequest(leaveRequestId);
        if (!leaveRequest) {
          return res.status(404).json({ message: "Leave request not found" });
        }

        // Only the member themselves (or admin) can mark balance as paid
        if (leaveRequest.userId !== userId) {
          return res.status(403).json({ message: "You can only update your own leave request" });
        }

        if (leaveRequest.outstandingBalance === 0) {
          return res.status(400).json({ message: "No outstanding balance on this leave request" });
        }

        if (leaveRequest.balancePaidAt) {
          return res.status(400).json({ message: "Balance has already been marked as paid" });
        }

        const updated = await storage.markLeaveRequestBalancePaid(leaveRequestId);

        res.json({
          message: "Balance marked as paid. You can now apply to join a new pod.",
          leaveRequest: updated,
        });
      } catch (error) {
        console.error("Error marking balance as paid:", error);
        res.status(500).json({ message: "Failed to mark balance as paid" });
      }
    },
  );

  // Process approved leave requests that have reached their exit date
  app.post(
    "/api/leave-requests/process-exits",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // Get all approved leave requests for pods where user is the leader
        const userPods = await storage.getPodsByLeaderId(userId);
        const processedExits: any[] = [];

        for (const pod of userPods) {
          const leaveRequests = await storage.getLeaveRequestsForPod(pod.id);
          const approvedRequests = leaveRequests.filter(
            (lr) =>
              lr.status === "approved" &&
              lr.exitDate &&
              new Date(lr.exitDate) <= new Date(),
          );

          for (const leaveRequest of approvedRequests) {
            // Remove the member from the pod
            await storage.removePodMember(
              leaveRequest.podId,
              leaveRequest.userId,
              userId,
            );

            // Update the original join request status to 'left'
            const joinRequests = await storage.getJoinRequestsForUser(
              leaveRequest.userId,
            );
            const originalJoinRequest = joinRequests.find(
              (jr) =>
                jr.podId === leaveRequest.podId && jr.status === "accepted",
            );
            if (originalJoinRequest) {
              await storage.updateJoinRequestStatus(
                originalJoinRequest.id,
                "left",
              );
            }

            // Update pod availability
            await storage.updatePodAvailability(
              leaveRequest.podId,
              pod.availableSpots + 1,
            );

            // Mark leave request as completed
            await storage.updateLeaveRequestStatus(leaveRequest.id, "approved");

            processedExits.push({
              leaveRequestId: leaveRequest.id,
              userId: leaveRequest.userId,
              podId: leaveRequest.podId,
            });
          }
        }

        res.json({
          message: `Processed ${processedExits.length} exit(s).`,
          processedExits,
        });
      } catch (error) {
        console.error("Error processing leave request exits:", error);
        res.status(500).json({ message: "Failed to process exits" });
      }
    },
  );

  // Reject leave request (leader only)
  app.post(
    "/api/leave-requests/:id/reject",
    isAuthenticated,
    async (req: any, res) => {
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
          return res
            .status(400)
            .json({ message: "This leave request has already been processed" });
        }

        // Get the pod
        const pod = await storage.getPod(leaveRequest.podId);
        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        // Check if user is the pod leader
        if (pod.leadId !== userId) {
          return res
            .status(403)
            .json({ message: "Only the pod leader can reject leave requests" });
        }

        // Update leave request status
        const updatedRequest = await storage.updateLeaveRequestStatus(
          leaveRequestId,
          "rejected",
          response,
        );

        // Send email notification to member
        try {
          const member = await storage.getUser(leaveRequest.userId);
          if (member && member.email) {
            const memberName =
              `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
              "Member";
            console.log(
              `Sending leave request rejected notification to: ${member.email}`,
            );
            await sendLeaveRequestRejectedNotification(
              member.email,
              memberName,
              pod.title,
              response || null,
              FROM_EMAIL,
            );
          }
        } catch (emailError) {
          console.error(
            "Failed to send leave request rejected email:",
            emailError,
          );
        }

        res.json({
          message: "Leave request rejected. Member remains in the pod.",
          leaveRequest: updatedRequest,
        });
      } catch (error) {
        console.error("Error rejecting leave request:", error);
        res.status(500).json({ message: "Failed to reject leave request" });
      }
    },
  );

  // Update pod exit timeline days (leader only)
  app.patch(
    "/api/pods/:id/exit-timeline",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const podId = parseInt(req.params.id);
        const userId = req.user.id;
        const { exitTimelineDays } = req.body;

        // Validate exit timeline days
        if (
          typeof exitTimelineDays !== "number" ||
          exitTimelineDays < 0 ||
          exitTimelineDays > 90
        ) {
          return res
            .status(400)
            .json({ message: "Exit timeline must be between 0 and 90 days" });
        }

        // Get the pod
        const pod = await storage.getPod(podId);
        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        // Check if user is the pod leader
        if (pod.leadId !== userId) {
          return res.status(403).json({
            message: "Only the pod leader can update exit timeline settings",
          });
        }

        // Update the pod
        const updatedPod = await storage.updatePod(podId, { exitTimelineDays });

        res.json({
          message: "Exit timeline updated successfully",
          pod: updatedPod,
        });
      } catch (error) {
        console.error("Error updating exit timeline:", error);
        res.status(500).json({ message: "Failed to update exit timeline" });
      }
    },
  );

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
        .then((rows) => rows[0]);

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
          console.log(
            `Resending join request notification to pod leader: ${podLead.email}`,
          );
          const emailSent = await sendJoinRequestNotification(
            podLead.email,
            pod.title,
            `${applicant.firstName} ${applicant.lastName}`,
            applicant.email || "",
            FROM_EMAIL,
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
      const updatedRequest = await storage.updateJoinRequestEmailStatus(
        id,
        emailStatus,
      );

      res.json({
        ...updatedRequest,
        emailStatus,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to resend email" });
    }
  });

  // Send membership verification email to Bay Club
  app.post(
    "/api/join-requests/:id/verify-membership",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        const { bayClubEmail, membershipId } = req.body;

        if (!bayClubEmail || !membershipId) {
          return res
            .status(400)
            .json({ message: "Bay Club email and membership ID are required" });
        }

        // Get the join request
        const joinRequest = await storage.getJoinRequest(id);

        if (!joinRequest) {
          return res.status(404).json({ message: "Join request not found" });
        }

        // Get the pod and verify the requester is the pod leader
        const pod = await storage.getPod(joinRequest.podId);

        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        if (pod.leadId !== userId) {
          return res.status(403).json({
            message: "Only the pod leader can request membership verification",
          });
        }

        // Get pod leader info
        const podLeader = await storage.getUser(userId);
        if (!podLeader) {
          return res.status(404).json({ message: "Pod leader not found" });
        }

        // Get applicant info
        const applicant = await storage.getUser(joinRequest.userId);
        if (!applicant) {
          return res.status(404).json({ message: "Applicant not found" });
        }

        // Send verification email
        const {
          sendMembershipVerificationRequest,
          SUPPORT_EMAIL,
          FROM_EMAIL: emailFromAddress,
        } = await import("./emailService");

        const emailSent = await sendMembershipVerificationRequest(
          bayClubEmail,
          [SUPPORT_EMAIL], // CC support team
          `${podLeader.firstName} ${podLeader.lastName}`,
          podLeader.email || "",
          podLeader.phoneNumber || "",
          pod.title,
          pod.clubName,
          joinRequest.userInfo?.name ||
            `${applicant.firstName} ${applicant.lastName}`,
          joinRequest.userInfo?.email || applicant.email || "",
          joinRequest.userInfo?.phone || applicant.phoneNumber,
          membershipId,
          emailFromAddress,
        );

        if (!emailSent) {
          return res
            .status(500)
            .json({ message: "Failed to send verification email" });
        }

        // Update the join request verification status
        const updatedRequest = await storage.updateMembershipVerificationStatus(
          id,
          "sent",
        );

        res.json({
          message: "Membership verification email sent successfully",
          request: updatedRequest,
        });
      } catch (error) {
        console.error("Error sending membership verification email:", error);
        res
          .status(500)
          .json({ message: "Failed to send membership verification email" });
      }
    },
  );

  // Mark membership as verified (after receiving confirmation from Bay Club)
  app.post(
    "/api/join-requests/:id/confirm-verification",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;

        // Get the join request
        const joinRequest = await storage.getJoinRequest(id);

        if (!joinRequest) {
          return res.status(404).json({ message: "Join request not found" });
        }

        // Get the pod and verify the requester is the pod leader
        const pod = await storage.getPod(joinRequest.podId);

        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        if (pod.leadId !== userId) {
          return res.status(403).json({
            message: "Only the pod leader can confirm membership verification",
          });
        }

        // Update the verification status to confirmed
        const updatedRequest = await storage.updateMembershipVerificationStatus(
          id,
          "confirmed",
        );

        res.json({
          message: "Membership verification confirmed",
          request: updatedRequest,
        });
      } catch (error) {
        console.error("Error confirming membership verification:", error);
        res
          .status(500)
          .json({ message: "Failed to confirm membership verification" });
      }
    },
  );

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
        hasCompletedOnboarding,
        profileImageUrl,
        firstName,
        lastName,
      } = req.body;

      // Build only the fields that were explicitly provided in the request
      const updateFields: Record<string, any> = {};
      if (firstName !== undefined && firstName !== "") updateFields.firstName = firstName;
      if (lastName !== undefined && lastName !== "") updateFields.lastName = lastName;
      if (profileImageUrl !== undefined) updateFields.profileImageUrl = profileImageUrl;
      if (membershipId !== undefined) updateFields.membershipId = membershipId;
      if (preferredRegion !== undefined) updateFields.preferredRegion = preferredRegion;
      if (primaryClub !== undefined) updateFields.primaryClub = primaryClub;
      if (membershipLevel !== undefined) updateFields.membershipLevel = membershipLevel;
      if (phone !== undefined) updateFields.phone = phone;
      if (street !== undefined) updateFields.street = street;
      if (aptUnit !== undefined) updateFields.aptUnit = aptUnit;
      if (city !== undefined) updateFields.city = city;
      if (state !== undefined) updateFields.state = state;
      if (zipCode !== undefined) updateFields.zipCode = zipCode;
      if (country !== undefined) updateFields.country = country;
      if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
      if (userType !== undefined) updateFields.userType = userType;
      if (hasCompletedOnboarding !== undefined) updateFields.hasCompletedOnboarding = hasCompletedOnboarding;

      const updatedUser = await storage.updateUser(userId, updateFields);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

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
              hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
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
          const deletedByUser = pod.deletedBy
            ? await storage.getUser(pod.deletedBy)
            : null;
          return {
            ...pod,
            deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null,
          };
        }),
      );

      res.json(podsWithDetails);
    } catch (error) {
      console.error("Error fetching deleted pods:", error);
      res.status(500).json({ message: "Failed to fetch deleted pods" });
    }
  });

  app.get(
    "/api/admin/deleted-join-requests",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const deletedRequests = await storage.getDeletedJoinRequests();

        const requestsWithDetails = await Promise.all(
          deletedRequests.map(async (request) => {
            const deletedByUser = request.deletedBy
              ? await storage.getUser(request.deletedBy)
              : null;
            return {
              ...request,
              deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null,
            };
          }),
        );

        res.json(requestsWithDetails);
      } catch (error) {
        console.error("Error fetching deleted join requests:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch deleted join requests" });
      }
    },
  );

  app.get(
    "/api/admin/deleted-members",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const deletedMembers = await storage.getDeletedPodMembers();

        const membersWithDetails = await Promise.all(
          deletedMembers.map(async (member) => {
            const deletedByUser = member.deletedBy
              ? await storage.getUser(member.deletedBy)
              : null;
            const user = await storage.getUser(member.userId);
            return {
              ...member,
              user: user ? sanitizeUser(user) : null,
              deletedByUser: deletedByUser ? sanitizeUser(deletedByUser) : null,
            };
          }),
        );

        res.json(membersWithDetails);
      } catch (error) {
        console.error("Error fetching deleted members:", error);
        res.status(500).json({ message: "Failed to fetch deleted members" });
      }
    },
  );

  // ==========================================
  // PAYMENT ROUTES
  // ==========================================

  // Get platform fee settings
  app.get("/api/settings/platform-fee", async (req, res) => {
    try {
      const setting = await storage.getPlatformSetting(
        "platform_fee_percentage",
      );
      const feePercentage = setting
        ? parseFloat(setting.settingValue)
        : DEFAULT_PLATFORM_FEE_PERCENTAGE;
      res.json({ feePercentage });
    } catch (error) {
      console.error("Error fetching platform fee:", error);
      res.status(500).json({ message: "Failed to fetch platform fee" });
    }
  });

  // Update platform fee (admin only - for now any authenticated user can update)
  app.patch(
    "/api/settings/platform-fee",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { feePercentage } = req.body;

        if (
          typeof feePercentage !== "number" ||
          feePercentage < 0 ||
          feePercentage > 50
        ) {
          return res
            .status(400)
            .json({ message: "Fee percentage must be between 0 and 50" });
        }

        const setting = await storage.upsertPlatformSetting(
          "platform_fee_percentage",
          feePercentage.toString(),
          "Platform fee percentage charged on pod membership payments",
          req.user.id,
        );

        res.json({ feePercentage: parseFloat(setting.settingValue) });
      } catch (error) {
        console.error("Error updating platform fee:", error);
        res.status(500).json({ message: "Failed to update platform fee" });
      }
    },
  );

  // Calculate payment breakdown for a pod
  app.get(
    "/api/pods/:id/payment-breakdown",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const podId = parseInt(req.params.id);
        const pod = await storage.getPod(podId);

        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        const setting = await storage.getPlatformSetting(
          "platform_fee_percentage",
        );
        const feePercentage = setting
          ? parseFloat(setting.settingValue)
          : DEFAULT_PLATFORM_FEE_PERCENTAGE;

        const baseAmount = pod.costPerPerson; // Already in cents
        const platformFeeAmount = Math.round(
          baseAmount * (feePercentage / 100),
        );
        const totalAmount = baseAmount + platformFeeAmount;

        res.json({
          baseAmount,
          platformFeeAmount,
          platformFeePercentage: feePercentage,
          totalAmount,
          currency: "usd",
        });
      } catch (error) {
        console.error("Error calculating payment breakdown:", error);
        res
          .status(500)
          .json({ message: "Failed to calculate payment breakdown" });
      }
    },
  );

  // Create a checkout session for pod membership payment
  app.post(
    "/api/payments/create-checkout",
    isAuthenticated,
    async (req: any, res) => {
      try {
        if (!polar) {
          return res
            .status(503)
            .json({ message: "Payment service not configured" });
        }

        const { podId } = req.body;
        const userId = req.user.id;

        if (!podId) {
          return res.status(400).json({ message: "Pod ID is required" });
        }

        const pod = await storage.getPod(podId);
        if (!pod) {
          return res.status(404).json({ message: "Pod not found" });
        }

        // Get platform fee percentage
        const setting = await storage.getPlatformSetting(
          "platform_fee_percentage",
        );
        const feePercentage = setting
          ? parseFloat(setting.settingValue)
          : DEFAULT_PLATFORM_FEE_PERCENTAGE;

        // Calculate amounts
        const baseAmount = pod.costPerPerson;
        const platformFeeAmount = Math.round(
          baseAmount * (feePercentage / 100),
        );
        const totalAmount = baseAmount + platformFeeAmount;

        // Get user info for prefilling checkout
        const user = await storage.getUser(userId);

        // Get the base URL for redirects
        const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
          ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
          : process.env.REPL_SLUG
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
            : "http://localhost:5000";

        // Create checkout session with Polar
        // Note: This requires a product to be created in Polar dashboard first
        // The product should be a "Pay What You Want" or custom-priced product
        const productId = process.env.POLAR_PRODUCT_ID;
        if (!productId) {
          return res
            .status(503)
            .json({ message: "Payment product not configured" });
        }

        const checkout = await polar.checkouts.create({
          products: [productId],
          customerEmail: user?.email,
          customerName: user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : undefined,
          successUrl: `${baseUrl}/payment-success?checkout_id={CHECKOUT_ID}`,
          metadata: {
            podId: podId.toString(),
            userId: userId,
            baseAmount: baseAmount.toString(),
            platformFeeAmount: platformFeeAmount.toString(),
            platformFeePercentage: feePercentage.toString(),
          },
        });

        // Create payment record in database
        const payment = await storage.createPodPayment({
          podId,
          userId,
          polarCheckoutId: checkout.id,
          status: "pending",
          baseAmount,
          platformFeeAmount,
          totalAmount,
          platformFeePercentage: feePercentage.toString(),
          currency: "usd",
          checkoutUrl: checkout.url,
          metadata: {
            podTitle: pod.title,
            podClubName: pod.clubName,
          } as Record<string, any>,
        });

        res.json({
          checkoutUrl: checkout.url,
          checkoutId: checkout.id,
          paymentId: payment.id,
        });
      } catch (error: any) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({
          message: error.message || "Failed to create checkout session",
        });
      }
    },
  );

  // Get payment history for current user (alias for frontend)
  app.get(
    "/api/payments/my-history",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const payments = await storage.getPodPaymentsForUser(req.user.id);

        // Enrich with pod details
        const paymentsWithDetails = await Promise.all(
          payments.map(async (payment) => {
            const pod = await storage.getPod(payment.podId);
            return {
              ...payment,
              pod: pod
                ? {
                    id: pod.id,
                    title: pod.title,
                    clubName: pod.clubName,
                  }
                : null,
            };
          }),
        );

        res.json(paymentsWithDetails);
      } catch (error) {
        console.error("Error fetching user payments:", error);
        res.status(500).json({ message: "Failed to fetch payments" });
      }
    },
  );

  // Get payment history for current user (legacy route)
  app.get("/api/payments/user", isAuthenticated, async (req: any, res) => {
    try {
      const payments = await storage.getPodPaymentsForUser(req.user.id);

      // Enrich with pod details
      const paymentsWithDetails = await Promise.all(
        payments.map(async (payment) => {
          const pod = await storage.getPod(payment.podId);
          return {
            ...payment,
            pod: pod
              ? {
                  id: pod.id,
                  title: pod.title,
                  clubName: pod.clubName,
                }
              : null,
          };
        }),
      );

      res.json(paymentsWithDetails);
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get payments for a pod (leader only)
  app.get("/api/pods/:id/payments", isAuthenticated, async (req: any, res) => {
    try {
      const podId = parseInt(req.params.id);
      const pod = await storage.getPod(podId);

      if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
      }

      // Only pod leader can see all pod payments
      if (pod.leadId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to view pod payments" });
      }

      const payments = await storage.getPodPaymentsForPod(podId);

      // Enrich with user details
      const paymentsWithDetails = await Promise.all(
        payments.map(async (payment) => {
          const user = await storage.getUser(payment.userId);
          return {
            ...payment,
            user: user
              ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                }
              : null,
          };
        }),
      );

      res.json(paymentsWithDetails);
    } catch (error) {
      console.error("Error fetching pod payments:", error);
      res.status(500).json({ message: "Failed to fetch pod payments" });
    }
  });

  // Polar webhook endpoint
  app.post(
    "/api/webhooks/polar",
    // Raw body needed for webhook signature verification
    (req, res, next) => {
      if (req.headers["content-type"] === "application/json") {
        let data = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => {
          data += chunk;
        });
        req.on("end", () => {
          (req as any).rawBody = data;
          try {
            req.body = JSON.parse(data);
          } catch (e) {
            req.body = {};
          }
          next();
        });
      } else {
        next();
      }
    },
    async (req: any, res) => {
      try {
        const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

        if (!webhookSecret) {
          console.error("POLAR_WEBHOOK_SECRET not configured");
          return res.status(500).send("Webhook secret not configured");
        }

        // Verify webhook signature
        let event;
        try {
          event = validateEvent(req.rawBody, req.headers, webhookSecret);
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error("Webhook signature verification failed");
            return res.status(403).send("Invalid signature");
          }
          throw error;
        }

        console.log(`Received Polar webhook: ${event.type}`);

        // Handle checkout events
        if (
          event.type === "checkout.updated" ||
          event.type === "checkout.created"
        ) {
          const checkoutData = event.data as any;

          if (
            checkoutData.status === "confirmed" ||
            checkoutData.status === "succeeded"
          ) {
            // Find payment by checkout ID
            const payment = await storage.getPodPaymentByCheckoutId(
              checkoutData.id,
            );

            if (payment) {
              await storage.updatePodPaymentStatus(
                payment.id,
                "completed",
                checkoutData.order_id || checkoutData.orderId || undefined,
                new Date(),
              );
              console.log(`Payment ${payment.id} marked as completed`);
            }
          } else if (
            checkoutData.status === "expired" ||
            checkoutData.status === "failed"
          ) {
            const payment = await storage.getPodPaymentByCheckoutId(
              checkoutData.id,
            );

            if (payment) {
              await storage.updatePodPaymentStatus(
                payment.id,
                checkoutData.status === "expired" ? "expired" : "failed",
              );
              console.log(
                `Payment ${payment.id} marked as ${checkoutData.status}`,
              );
            }
          }
        }

        // Handle order events
        if (event.type === "order.created") {
          const orderData = event.data;
          const checkoutId = orderData.checkoutId;

          if (checkoutId) {
            const payment = await storage.getPodPaymentByCheckoutId(checkoutId);

            if (payment) {
              await storage.updatePodPaymentStatus(
                payment.id,
                "completed",
                orderData.id,
                new Date(),
              );
              console.log(
                `Payment ${payment.id} completed via order ${orderData.id}`,
              );
            }
          }
        }

        res.status(202).send("");
      } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("Webhook processing failed");
      }
    },
  );

  // Get payment status by checkout ID
  app.get(
    "/api/payments/status/:checkoutId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const payment = await storage.getPodPaymentByCheckoutId(
          req.params.checkoutId,
        );

        if (!payment) {
          return res.status(404).json({ message: "Payment not found" });
        }

        // Verify user owns this payment
        if (payment.userId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        res.json(payment);
      } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({ message: "Failed to fetch payment status" });
      }
    },
  );

  // ============================================================
  // AI POD MATCHING ROUTE
  // ============================================================

  // Generate a personalized join request message using AI
  app.post("/api/ai/generate-join-message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { podId } = req.body;
      if (!podId) return res.status(400).json({ message: "podId is required" });

      const [user, pod] = await Promise.all([
        storage.getUser(userId),
        storage.getPod(parseInt(podId)),
      ]);
      if (!pod) return res.status(404).json({ message: "Pod not found" });

      const message = await generateJoinMessage(user ?? {}, pod);
      res.json({ message });
    } catch (error) {
      console.error("Error generating join message:", error);
      res.status(500).json({ message: "Failed to generate message" });
    }
  });

  app.post("/api/ai/match-pods", isAuthenticated, async (req: any, res) => {
    try {
      const { region, city, zipCode, maxBudget, membershipType, amenities, notes } = req.body;

      // Get all active pods with available spots
      const allPods = await storage.getPods();
      const availablePods = allPods.filter(p => p.isActive && p.availableSpots > 0 && !p.deletedAt);

      const result = await findMatchingPods(
        { region, city, zipCode, maxBudget, membershipType, amenities, notes },
        availablePods
      );

      res.json(result);
    } catch (error) {
      console.error("Error in AI pod matching:", error);
      res.status(500).json({ message: "Failed to get pod recommendations" });
    }
  });

  // ============================================================
  // PODAGENT CONVERSATIONAL AI
  // ============================================================

  app.post("/api/agent/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { messages } = req.body;

      if (!Array.isArray(messages)) {
        return res.status(400).json({ message: "messages array is required" });
      }

      const user = await storage.getUser(userId);
      const userName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        "User";

      const context = {
        userId,
        userType: (user as any)?.userType ?? null,
        userName,
      };

      const response = await processAgentMessage(messages, context);
      res.json(response);
    } catch (error) {
      console.error("[PodAgent] Error:", error);
      res.status(500).json({ message: "Agent unavailable. Please try again." });
    }
  });

  // ============================================================
  // REVIEWS ROUTES
  // ============================================================

  // Get reviews for a pod (public)
  app.get("/api/pods/:id/reviews", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) return res.status(400).json({ message: "Invalid pod ID" });
      const reviews = await storage.getReviewsForPod(podId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Create a review — only active pod members can review
  app.post("/api/pods/:id/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) return res.status(400).json({ message: "Invalid pod ID" });
      const userId = req.user.id;

      // Check reviewer is an active member of this pod
      const members = await storage.getPodMembers(podId);
      const isMember = members.some(m => m.userId === userId && m.isActive);
      if (!isMember) {
        return res.status(403).json({ message: "Only active pod members can leave a review" });
      }

      // One review per user per pod
      const existing = await storage.getReviewByUserForPod(userId, podId);
      if (existing) {
        return res.status(409).json({ message: "You have already reviewed this pod" });
      }

      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const review = await storage.createReview({ podId, reviewerId: userId, rating, comment });
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Update own review
  app.patch("/api/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      if (isNaN(reviewId)) return res.status(400).json({ message: "Invalid review ID" });
      const userId = req.user.id;
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const updated = await storage.updateReview(reviewId, userId, rating, comment);
      if (!updated) return res.status(404).json({ message: "Review not found or not yours" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Delete own review
  app.delete("/api/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      if (isNaN(reviewId)) return res.status(400).json({ message: "Invalid review ID" });
      const userId = req.user.id;
      const deleted = await storage.deleteReview(reviewId, userId);
      if (!deleted) return res.status(404).json({ message: "Review not found or not yours" });
      res.json({ message: "Review deleted" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ============================================================
  // MESSAGING ROUTES
  // ============================================================

  // Get all conversations for the current user
  // SSE endpoint for real-time message delivery
  app.get("/api/messages/stream", isAuthenticated, (req: any, res) => {
    const cleanup = addSSEClient(req.user.id, res);
    req.on("close", cleanup);
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const convos = await storage.getConversationsForUser(userId);

      // Enrich each conversation with pod info, participant info, last message, and unread count
      const enriched = await Promise.all(
        convos.map(async (conv) => {
          const pod = await storage.getPod(conv.podId);
          // For direct chats, load both participant infos
          let participant1Info = conv.memberId ? await storage.getUser(conv.memberId) : null;
          let participant2Info = conv.participant2Id ? await storage.getUser(conv.participant2Id) : null;
          // Legacy support: if participant2Id is null, the other party is the pod leader
          if (conv.type === 'direct' && !conv.participant2Id && pod) {
            participant2Info = await storage.getUser(pod.leadId);
          }
          const msgs = await storage.getMessagesForConversation(conv.id);
          const lastMessage = msgs[msgs.length - 1] || null;
          const unread = msgs.filter(m => m.senderId !== userId && !m.readAt).length;
          return { ...conv, pod, participant1Info, participant2Info, lastMessage, unreadCount: unread };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get or create a group conversation for a pod (leader only)
  app.post("/api/conversations/group", isAuthenticated, async (req: any, res) => {
    try {
      const { podId } = req.body;
      if (!podId) return res.status(400).json({ message: "podId required" });

      const pod = await storage.getPod(podId);
      if (!pod) return res.status(404).json({ message: "Pod not found" });
      if (pod.leadId !== req.user.id) return res.status(403).json({ message: "Only pod leaders can start group conversations" });

      const conv = await storage.getOrCreateGroupConversation(podId);
      res.json(conv);
    } catch (error) {
      console.error("Error creating group conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get or create a direct conversation between any two pod participants (leader, member, or member-to-member)
  app.post("/api/conversations/direct", isAuthenticated, async (req: any, res) => {
    try {
      const { podId, recipientId } = req.body;
      if (!podId || !recipientId) return res.status(400).json({ message: "podId and recipientId required" });

      const pod = await storage.getPod(podId);
      if (!pod) return res.status(404).json({ message: "Pod not found" });

      const currentUserId = req.user.id;

      // Verify the current user is a participant of this pod (leader or active member)
      const podMemberList = await storage.getPodMembers(podId);
      const activeMemberIds = podMemberList.filter(m => m.isActive).map(m => m.userId);
      const isLeader = pod.leadId === currentUserId;
      const isMember = activeMemberIds.includes(currentUserId);
      if (!isLeader && !isMember) {
        return res.status(403).json({ message: "You must be a pod participant to start a conversation" });
      }

      // Verify the recipient is also a participant of this pod
      const recipientIsLeader = pod.leadId === recipientId;
      const recipientIsMember = activeMemberIds.includes(recipientId);
      if (!recipientIsLeader && !recipientIsMember) {
        return res.status(403).json({ message: "Recipient must be a pod participant" });
      }

      // Cannot message yourself
      if (currentUserId === recipientId) {
        return res.status(400).json({ message: "Cannot start a conversation with yourself" });
      }

      const conv = await storage.getOrCreateDirectConversation(podId, currentUserId, recipientId);
      res.json(conv);
    } catch (error) {
      console.error("Error creating direct conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const convId = parseInt(req.params.id);
      const conv = await storage.getConversation(convId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      // Check access
      const userId = req.user.id;
      const userConvos = await storage.getConversationsForUser(userId);
      const hasAccess = userConvos.some(c => c.id === convId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const msgs = await storage.getMessagesForConversation(convId);

      // Enrich messages with sender info
      const enriched = await Promise.all(
        msgs.map(async (msg) => {
          const sender = await storage.getUser(msg.senderId);
          return {
            ...msg,
            senderName: sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Unknown",
            senderAvatar: sender?.profileImageUrl || null,
          };
        })
      );

      // Mark as read
      await storage.markConversationRead(convId, userId);

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message in a conversation
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const convId = parseInt(req.params.id);
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message content required" });

      const conv = await storage.getConversation(convId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      // Check access
      const userId = req.user.id;
      const userConvos = await storage.getConversationsForUser(userId);
      const hasAccess = userConvos.some(c => c.id === convId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const msg = await storage.createMessage({
        conversationId: convId,
        senderId: userId,
        content: content.trim(),
      });

      const sender = await storage.getUser(userId);
      const enrichedMsg = {
        ...msg,
        senderName: sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Unknown",
        senderAvatar: sender?.profileImageUrl || null,
      };

      // Determine all participants to notify via SSE
      let participantIds: string[] = [];
      if (conv.type === "group") {
        const pod = await storage.getPod(conv.podId);
        if (pod) {
          const members = await storage.getPodMembers(conv.podId);
          participantIds = [pod.leadId, ...members.filter(m => m.isActive).map(m => m.userId)];
        }
      } else {
        if (conv.memberId) participantIds.push(conv.memberId);
        if (conv.participant2Id) participantIds.push(conv.participant2Id);
        else {
          const pod = await storage.getPod(conv.podId);
          if (pod) participantIds.push(pod.leadId);
        }
      }
      const uniqueParticipants = [...new Set(participantIds)];
      notifyUsers(uniqueParticipants, { type: "new_message", conversationId: convId });

      res.json(enrichedMsg);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get unread message count for current user
  app.get("/api/conversations/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const count = await storage.getUnreadCountForUser(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

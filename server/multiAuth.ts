import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import AppleStrategy from "passport-apple";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { Express } from "express";
import { storage } from "./storage";
import { sendWelcomeEmail, FROM_EMAIL } from "./emailService";

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Setup authentication strategies
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user has a password (local account)
        if (!user.passwordHash) {
          return done(null, false, { message: 'Please sign in with Google' });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with Google ID
          let user = await storage.getUserByGoogleId(profile.id);
          
          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email
          user = await storage.getUserByEmail(profile.emails?.[0]?.value || "");
          
          if (user) {
            // Link Google account to existing user
            // Preserve existing auth provider if they have local login, add google
            const newAuthProvider = user.passwordHash 
              ? (user.authProvider === "google" ? "google" : "local+google")
              : "google";
            
            await storage.updateUser(user.id, {
              googleId: profile.id,
              authProvider: newAuthProvider,
              isEmailVerified: true, // Google verifies email
              // Only update profile image if user doesn't have one
              ...(user.profileImageUrl ? {} : { profileImageUrl: profile.photos?.[0]?.value }),
            });
            user = await storage.getUser(user.id);
            return done(null, user);
          }

          // Create new user with Google account
          const newUser = await storage.createUser({
            email: profile.emails?.[0]?.value || "",
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            profileImageUrl: profile.photos?.[0]?.value,
            authProvider: "google",
            googleId: profile.id,
            isEmailVerified: true, // Google emails are pre-verified
          });

          // Send welcome email to new user
          console.log(`Sending welcome email to new Google user: ${newUser.email}`);
          sendWelcomeEmail(
            newUser.email, 
            newUser.firstName || 'there', 
            FROM_EMAIL
          ).catch(error => console.error('Failed to send welcome email:', error));

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Apple OAuth strategy
  if (process.env.APPLE_TEAM_ID && process.env.APPLE_CLIENT_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: "/api/auth/apple/callback",
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY,
        passReqToCallback: true
      },
      async (req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          const appleId = idToken.sub;
          const email = idToken.email;
          
          // Check if user already exists with Apple ID
          let user = await storage.getUserByAppleId(appleId);
          
          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email
          if (email) {
            user = await storage.getUserByEmail(email);
            
            if (user) {
              // Link Apple account to existing user
              await storage.updateUser(user.id, {
                appleId: appleId,
                authProvider: "apple",
              });
              user = await storage.getUser(user.id);
              return done(null, user);
            }
          }

          // Apple sends name in POST body on first login only
          const firstTimeUser = req.body.user ? JSON.parse(req.body.user) : undefined;

          // Create new user with Apple account
          const newUser = await storage.createUser({
            email: email || `${appleId}@privaterelay.appleid.com`,
            firstName: firstTimeUser?.name?.firstName || "User",
            lastName: firstTimeUser?.name?.lastName || "",
            authProvider: "apple",
            appleId: appleId,
            isEmailVerified: true, // Apple emails are pre-verified
          });

          // Send welcome email to new user
          console.log(`Sending welcome email to new Apple user: ${newUser.email}`);
          sendWelcomeEmail(
            newUser.email, 
            newUser.firstName || 'there', 
            FROM_EMAIL
          ).catch(error => console.error('Failed to send welcome email:', error));

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Phone number authentication strategy (OTP-based)
  passport.use('phone', new LocalStrategy(
    {
      usernameField: 'phoneNumber',
      passwordField: 'otp',
    },
    async (phoneNumber, otp, done) => {
      try {
        // Verify OTP
        const otpRecord = await storage.getOtpVerification(phoneNumber);
        
        if (!otpRecord) {
          return done(null, false, { message: 'Invalid or expired OTP' });
        }

        if (otpRecord.otp !== otp) {
          return done(null, false, { message: 'Invalid OTP code' });
        }

        // Mark OTP as verified
        await storage.markOtpAsVerified(phoneNumber);

        // Find or create user with this phone number
        let user = await storage.getUserByPhone(phoneNumber);
        
        if (!user) {
          // Create new user with phone number
          user = await storage.createUser({
            email: `${phoneNumber.replace(/\D/g, '')}@phone.flexpod.app`,
            firstName: "User",
            lastName: "",
            phone: phoneNumber,
            phoneVerified: true,
            authProvider: "phone",
            isEmailVerified: false,
          });

          // Send welcome email to new user (skip for phone-only accounts with placeholder emails)
          if (!user.email.includes('@phone.flexpod.app')) {
            console.log(`Sending welcome email to new phone user: ${user.email}`);
            sendWelcomeEmail(
              user.email, 
              user.firstName || 'there', 
              FROM_EMAIL
            ).catch(error => console.error('Failed to send welcome email:', error));
          }
        } else {
          // Update existing user to mark phone as verified
          await storage.updateUser(user.id, {
            phoneVerified: true,
          });
          user = await storage.getUser(user.id);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Authentication middleware
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Optional authentication middleware (doesn't block if not authenticated)
export const optionalAuth = (req: any, res: any, next: any) => {
  // Always proceed, but req.user will be undefined if not authenticated
  next();
};
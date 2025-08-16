import type { Express, Request, Response } from 'express';
import { AuthService } from './authService';
import { storage } from './storage';
import { registerUserSchema, loginUserSchema } from '@shared/schema';
import { z } from 'zod';

export function setupAuthRoutes(app: Express) {
  // Register route
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(userData.password);
      
      // Create user
      const user = await storage.registerUser({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      // Generate tokens
      const tokens = AuthService.generateTokens(user);

      res.status(201).json({
        message: 'User registered successfully',
        ...tokens,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const loginData = loginUserSchema.parse(req.body);
      
      // Authenticate user
      const user = await storage.authenticateUser(loginData.email, loginData.password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate tokens
      const tokens = AuthService.generateTokens(user);

      res.json({
        message: 'Login successful',
        ...tokens,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Get current user route (for JWT authentication)
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Logout route (client-side token removal, no server action needed)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.json({ message: 'Logout successful' });
  });
}
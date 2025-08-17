import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User } from '@shared/schema';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '7d';

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password with hash
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT tokens
  static generateTokens(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
    };
  }

  // Verify JWT token
  static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      return null;
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
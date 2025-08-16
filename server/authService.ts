import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  user: Omit<User, 'password'>;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateTokens(user: User): AuthTokens {
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      membershipId: user.membershipId,
      preferredRegion: user.preferredRegion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      JWT_SECRET,
      { 
        expiresIn: '7d' // Token expires in 7 days
      }
    );

    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return {
        userId: payload.userId,
        email: payload.email,
      };
    } catch (error) {
      return null;
    }
  }
}
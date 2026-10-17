import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAuthToken, AuthTokenPayload } from '../utils/auth.token';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please sign in to continue.', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload: AuthTokenPayload | null = verifyAuthToken(token);

    if (!payload) {
      throw new AppError('Session expired or invalid authentication token. Please sign in again.', 401);
    }

    req.user = {
      id: payload.id,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

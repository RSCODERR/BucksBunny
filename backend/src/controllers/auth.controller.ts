import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { hashPassword, verifyPassword } from '../utils/password';

export const signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, agreedToTerms } = req.body;

    // Validate mandatory agreedToTerms checkbox
    if (agreedToTerms !== true) {
      throw new AppError('You must agree to the Terms and Conditions and Privacy Policy to proceed.', 400);
    }

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      throw new AppError('Username is required and must be at least 3 characters.', 400);
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError('A valid email address is required.', 400);
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new AppError('Password is required and must be at least 8 characters.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        throw new AppError('An account with this email address already exists.', 409);
      }
      throw new AppError('This username is already taken. Please choose another.', 409);
    }

    // Hash password and store user record with mandatory agreedToTerms value
    const hashedPassword = hashPassword(password);
    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      agreedToTerms: true,
      agreedToTermsAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully.',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          agreedToTerms: newUser.agreedToTerms,
          agreedToTermsAt: newUser.agreedToTermsAt,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new AppError('Email or username is required.', 400);
    }

    if (!password || typeof password !== 'string') {
      throw new AppError('Password is required.', 400);
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    });

    if (!user || !verifyPassword(password, user.password)) {
      throw new AppError('Invalid email or password. Please try again.', 401);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Signed in successfully.',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          agreedToTerms: user.agreedToTerms,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

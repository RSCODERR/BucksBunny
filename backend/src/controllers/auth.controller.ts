import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';
import { generateAuthToken } from '../utils/auth.token';

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

    // Generate 6-digit verification code and expiration (15 minutes)
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Hash password and store user record with verification details
    const hashedPassword = hashPassword(password);
    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      agreedToTerms: true,
      agreedToTermsAt: new Date(),
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    // Send transactional verification email via Brevo HTTPS API
    await sendVerificationEmail({
      toEmail: normalizedEmail,
      username: normalizedUsername,
      code: verificationCode,
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created. We sent a 6-digit verification code to your email.',
        email: newUser.email,
        isEmailVerified: false,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          agreedToTerms: newUser.agreedToTerms,
          isEmailVerified: newUser.isEmailVerified,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email address is required.', 400);
    }

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      throw new AppError('Please provide a valid 6-digit verification code.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new AppError('No account found with this email address.', 404);
    }

    if (user.isEmailVerified) {
      res.status(200).json({
        success: true,
        data: {
          message: 'Your email address is already verified. You can sign in.',
          isEmailVerified: true,
        },
      });
      return;
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
      throw new AppError('This verification code has expired. Please request a new one.', 400);
    }

    if (user.emailVerificationCode !== code.trim()) {
      throw new AppError('Invalid verification code. Please check your inbox and try again.', 400);
    }

    // Mark as verified and clear temporary code
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Email address verified successfully. You can now sign in.',
        isEmailVerified: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email address is required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new AppError('No account found with this email address.', 404);
    }

    if (user.isEmailVerified) {
      res.status(200).json({
        success: true,
        data: {
          message: 'Your email address is already verified.',
          isEmailVerified: true,
        },
      });
      return;
    }

    // Generate fresh 6-digit code and update expiry
    const newCode = crypto.randomInt(100000, 1000000).toString();
    user.emailVerificationCode = newCode;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send email via Brevo
    await sendVerificationEmail({
      toEmail: user.email,
      username: user.username,
      code: newCode,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'A fresh verification code has been sent to your email address.',
        email: user.email,
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

    // Check email verification status
    if (!user.isEmailVerified) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Please verify your email address before signing in.',
          statusCode: 403,
          requiresVerification: true,
          email: user.email,
        },
      });
      return;
    }

    const token = generateAuthToken({
      id: user._id.toString(),
      email: user.email,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Signed in successfully.',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          agreedToTerms: user.agreedToTerms,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetCode = crypto.randomInt(100000, 1000000).toString();
      user.resetPasswordCode = resetCode;
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      await sendPasswordResetEmail({
        toEmail: user.email,
        username: user.username,
        code: resetCode,
      });
    }

    // Always respond with a consistent message to prevent account enumeration
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email address, a 6-digit password reset code has been sent.',
        email: normalizedEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required.', 400);
    }

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      throw new AppError('Please enter a valid 6-digit password reset code.', 400);
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new AppError('New password is required and must be at least 8 characters.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new AppError('No account found with this email address.', 404);
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
      throw new AppError('The password reset code has expired. Please request a new one.', 400);
    }

    if (user.resetPasswordCode !== code.trim()) {
      throw new AppError('Invalid password reset code. Please check your email and try again.', 400);
    }

    // Hash and store new password, clear reset code, mark email as verified
    user.password = hashPassword(newPassword);
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Password has been reset successfully. You can now sign in with your new password.',
      },
    });
  } catch (error) {
    next(error);
  }
};


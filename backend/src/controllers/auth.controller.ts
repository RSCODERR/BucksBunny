import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';
import { generateAuthToken } from '../utils/auth.token';

export const signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, username, email, password, agreedToTerms } = req.body;

    // Validate mandatory agreedToTerms checkbox
    if (agreedToTerms !== true) {
      throw new AppError('You must agree to the Terms and Conditions and Privacy Policy to proceed.', 400);
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('Full name is required and must be at least 2 characters.', 400);
    }

    if (name.trim().length > 100) {
      throw new AppError('Full name cannot exceed 100 characters.', 400);
    }

    if (!username || typeof username !== 'string' || !/^(?=.*\d)[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      throw new AppError(
        'Username must be 3-20 characters long, contain at least one number, and only use letters, numbers, and underscores.',
        400
      );
    }

    const reservedUsernames = ['you', 'admin', 'bucksbunny', 'system', 'root', 'support'];
    if (reservedUsernames.includes(username.trim().toLowerCase())) {
      throw new AppError('This username is reserved. Please choose another.', 400);
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError('A valid email address is required.', 400);
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new AppError('Password is required and must be at least 8 characters.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Purge any lingering expired unverified users
    await purgeExpiredUnverifiedUsers();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      // If the existing user never verified their email and the 20-minute window expired, delete it and allow registration
      if (
        !existingUser.isEmailVerified &&
        existingUser.emailVerificationExpires &&
        existingUser.emailVerificationExpires.getTime() < Date.now()
      ) {
        await User.deleteOne({ _id: existingUser._id });
      } else {
        if (existingUser.email === normalizedEmail) {
          throw new AppError('An account with this email address already exists.', 409);
        }
        throw new AppError('This username is already taken. Please choose another.', 409);
      }
    }

    // Generate 6-digit verification code and expiration (20 minutes)
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const verificationExpires = new Date(Date.now() + 20 * 60 * 1000);

    // Hash password and store user record with verification details
    const hashedPassword = hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
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
      name: newUser.name,
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
          name: newUser.name,
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
      await User.deleteOne({ _id: user._id });
      throw new AppError(
        'This verification code has expired after 20 minutes. The unverified registration was removed. Please sign up again.',
        400
      );
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
          name: user.name || user.username,
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

    if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
      await User.deleteOne({ _id: user._id });
      throw new AppError(
        'The 20-minute verification window has expired. The unverified account was removed. Please sign up again.',
        400
      );
    }

    // Generate fresh 6-digit code and update expiry (20 minutes)
    const newCode = crypto.randomInt(100000, 1000000).toString();
    user.emailVerificationCode = newCode;
    user.emailVerificationExpires = new Date(Date.now() + 20 * 60 * 1000);
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
      if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() < Date.now()) {
        await User.deleteOne({ _id: user._id });
        throw new AppError(
          'Your verification code expired after 20 minutes. The unverified account was removed. Please sign up again.',
          400
        );
      }

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
          name: user.name || user.username,
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

// Purge any expired reset password codes from MongoDB
export const purgeExpiredResetCodes = async (): Promise<void> => {
  try {
    await User.updateMany(
      {
        resetPasswordExpires: { $ne: null, $lt: new Date() },
      },
      {
        $set: { resetPasswordCode: null, resetPasswordExpires: null },
      }
    );
  } catch (err) {
    console.error('[Auth] Error purging expired password reset codes:', err);
  }
};

// Purge any unverified users whose 20-minute OTP window has expired from MongoDB
export const purgeExpiredUnverifiedUsers = async (): Promise<void> => {
  try {
    const result = await User.deleteMany({
      isEmailVerified: false,
      emailVerificationExpires: { $ne: null, $lt: new Date() },
    });
    if (result.deletedCount && result.deletedCount > 0) {
      console.log(`[Auth Cleanup] Purged ${result.deletedCount} unverified account(s) with expired OTP (> 20 minutes).`);
    }
  } catch (err) {
    console.error('[Auth] Error purging expired unverified accounts:', err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required.', 400);
    }

    // Clean up any previously expired codes
    await purgeExpiredResetCodes();

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetCode = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      user.resetPasswordCode = resetCode;
      user.resetPasswordExpires = expiresAt;
      await user.save();

      // Ensure the reset OTP is deleted from the backend after 15 minutes if not used
      setTimeout(async () => {
        try {
          await User.updateOne(
            { _id: user._id, resetPasswordCode: resetCode },
            { $set: { resetPasswordCode: null, resetPasswordExpires: null } }
          );
        } catch (timerErr) {
          console.error('[Auth] Error clearing 15-minute expired reset OTP:', timerErr);
        }
      }, 15 * 60 * 1000);

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


import { Router } from 'express';
import {
  signUp,
  signIn,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../../../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', signUp);

// POST /api/v1/auth/signin
router.post('/signin', signIn);

// POST /api/v1/auth/verify-email
router.post('/verify-email', verifyEmail);

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', resendVerification);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;

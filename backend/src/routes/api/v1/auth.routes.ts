import { Router } from 'express';
import { signUp, signIn } from '../../../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', signUp);

// POST /api/v1/auth/signin
router.post('/signin', signIn);

export default router;

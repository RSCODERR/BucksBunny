import { Router } from 'express';
import v1Router from './api/v1';

const router = Router();

// Mount API v1 router under /api/v1
router.use('/api/v1', v1Router);

export default router;

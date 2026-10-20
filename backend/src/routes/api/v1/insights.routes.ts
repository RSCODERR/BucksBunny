import { Router } from 'express';
import { getInsights } from '../../../controllers/insights.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/insights - Personal spending analytics and breakdown
router.get('/', authenticateUser, getInsights);

export default router;

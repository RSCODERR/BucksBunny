import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import expenseRoutes from './expense.routes';
import peopleRoutes from './people.routes';

const router = Router();

// API v1 Sub-routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/people', peopleRoutes);

export default router;

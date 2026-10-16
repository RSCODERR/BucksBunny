import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// API v1 Sub-routes
router.use('/health', healthRoutes);

export default router;

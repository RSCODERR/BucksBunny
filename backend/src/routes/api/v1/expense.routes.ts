import { Router } from 'express';
import { createExpense } from '../../../controllers/expense.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/expenses
router.post('/', authenticateUser, createExpense);

export default router;

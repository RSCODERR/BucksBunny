import { Router } from 'express';
import {
  createExpense,
  getAllTransactions,
  getExpenseById,
  updateExpense,
  getExpenseOverview,
  settleDebt,
  repayDebt,
  getRepayments,
  deleteExpense,
  deleteDebt,
} from '../../../controllers/expense.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/expenses - All unified transactions (expenses & settlements)
router.get('/', authenticateUser, getAllTransactions);

// GET /api/v1/expenses/overview
router.get('/overview', authenticateUser, getExpenseOverview);

// GET /api/v1/expenses/repayments - Repayment audit log
router.get('/repayments', authenticateUser, getRepayments);

// POST /api/v1/expenses
router.post('/', authenticateUser, createExpense);

// GET /api/v1/expenses/:id
router.get('/:id', authenticateUser, getExpenseById);

// PUT /api/v1/expenses/:id
router.put('/:id', authenticateUser, updateExpense);

// DELETE /api/v1/expenses/:id
router.delete('/:id', authenticateUser, deleteExpense);

// POST /api/v1/expenses/debts/:id/repay - Record partial or full repayment
router.post('/debts/:id/repay', authenticateUser, repayDebt);

// PATCH /api/v1/expenses/debts/:id/settle
router.patch('/debts/:id/settle', authenticateUser, settleDebt);

// DELETE /api/v1/expenses/debts/:id
router.delete('/debts/:id', authenticateUser, deleteDebt);

export default router;



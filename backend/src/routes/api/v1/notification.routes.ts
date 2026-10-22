import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getAttentionItems,
} from '../../../controllers/notification.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// Static endpoints placed before :id parameters
router.get('/unread-count', authenticateUser, getUnreadCount);
router.get('/attention', authenticateUser, getAttentionItems);
router.patch('/mark-all-read', authenticateUser, markAllAsRead);

// Parameterized endpoint
router.patch('/:id/read', authenticateUser, markAsRead);

// Root notifications feed
router.get('/', authenticateUser, getNotifications);

export default router;

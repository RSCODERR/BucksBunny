import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { notificationService } from '../services/notification.service';
import { AppError } from '../errors/AppError';

/**
 * GET /api/v1/notifications
 * List active notifications for the authenticated user
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const result = await notificationService.getNotifications(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count
 * Retrieve unread active notification count for the authenticated user
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const notificationId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID.', 400);
    }

    const updated = await notificationService.markAsRead(req.user.id, notificationId);
    if (!updated) {
      throw new AppError('Notification not found or already expired.', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Notification marked as read.',
        id: notificationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/mark-all-read
 * Mark all active notifications for current user as read
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const updatedCount = await notificationService.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        message: 'All notifications marked as read.',
        updatedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/attention
 * Retrieve high-priority actionable items for "Needs Your Attention"
 */
export const getAttentionItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const items = await notificationService.getAttentionItems(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        items,
        count: items.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

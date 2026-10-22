import { apiClient } from './apiClient';

export type NotificationType =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'repayment_recorded'
  | 'friend_request_received'
  | 'friend_request_accepted';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string;
  relatedEntityId: string | null;
  data: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string;
  actor: {
    id: string;
    name: string;
    username: string;
  } | null;
}

export interface AttentionItem {
  id: string;
  type: 'friend_request' | 'expense_action' | string;
  title: string;
  message: string;
  date: string;
  actionUrl: string;
  actionLabel: string;
  entityId?: string | null;
  actorName?: string;
}

export interface NotificationFeedResponse {
  notifications: NotificationItem[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(page = 1, limit = 20): Promise<{ success: boolean; data: NotificationFeedResponse }> {
    return apiClient<{ success: boolean; data: NotificationFeedResponse }>(
      `/notifications?page=${page}&limit=${limit}`
    );
  },

  async getUnreadCount(): Promise<{ success: boolean; data: { unreadCount: number } }> {
    return apiClient<{ success: boolean; data: { unreadCount: number } }>('/notifications/unread-count');
  },

  async markAsRead(id: string): Promise<{ success: boolean; data: { message: string; id: string } }> {
    return apiClient<{ success: boolean; data: { message: string; id: string } }>(
      `/notifications/${id}/read`,
      { method: 'PATCH' }
    );
  },

  async markAllAsRead(): Promise<{ success: boolean; data: { message: string; updatedCount: number } }> {
    return apiClient<{ success: boolean; data: { message: string; updatedCount: number } }>(
      '/notifications/mark-all-read',
      { method: 'PATCH' }
    );
  },

  async getAttentionItems(): Promise<{ success: boolean; data: { items: AttentionItem[]; count: number } }> {
    return apiClient<{ success: boolean; data: { items: AttentionItem[]; count: number } }>(
      '/notifications/attention'
    );
  },
};

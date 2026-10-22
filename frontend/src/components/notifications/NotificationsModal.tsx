import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Receipt,
  UserPlus,
  UserCheck,
  RefreshCw,
  Trash2,
  ArrowDownLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { NotificationItem } from '../../services/notificationService';
import { NotificationDetailsModal } from './NotificationDetailsModal';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [selectedNotificationForDetails, setSelectedNotificationForDetails] = useState<NotificationItem | null>(null);

  if (!isOpen) return null;

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_created':
        return <Receipt className="w-4 h-4 text-[#064E3B]" />;
      case 'expense_updated':
        return <RefreshCw className="w-4 h-4 text-[#2563EB]" />;
      case 'expense_deleted':
        return <Trash2 className="w-4 h-4 text-[#DC2626]" />;
      case 'repayment_recorded':
        return <ArrowDownLeft className="w-4 h-4 text-[#059669]" />;
      case 'friend_request_received':
        return <UserPlus className="w-4 h-4 text-[#064E3B]" />;
      case 'friend_request_accepted':
        return <UserCheck className="w-4 h-4 text-[#059669]" />;
      default:
        return <Bell className="w-4 h-4 text-[#4B5563]" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await onMarkAsRead(notif.id);
    }
    setSelectedNotificationForDetails(notif);
  };

  const handleMarkAll = async () => {
    try {
      setIsMarkingAll(true);
      await onMarkAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#CBD5E1] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Notifications</h3>
              <p className="text-xs text-[#6B7280]">
                Activity and updates from the last 24 hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:bg-[#E8F3EE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#9CA3AF] hover:text-[#111827] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-2.5 bg-[#F8FAF9] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F3F4F6]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#4B5563] hover:bg-[#F3F4F6]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <span className="text-[11px] text-[#6B7280]">Auto-clears after 24h</span>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] p-2">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#111827]">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                {filter === 'unread'
                  ? 'You are all caught up on your shared expenses and requests.'
                  : 'Relevant updates involving shared expenses, settlements, and friend requests appear here.'}
              </p>
            </div>
          ) : (
            filteredList.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 sm:p-4 rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${
                  notif.isRead
                    ? 'hover:bg-[#F8FAF9]'
                    : 'bg-[#F4F9F6] hover:bg-[#EBF5EF]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                      {notif.title}
                    </h4>
                    <span className="text-[11px] text-[#9CA3AF] whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    {!notif.isRead && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#064E3B]" />
                    )}
                    <span className="text-[11px] font-semibold text-[#064E3B] flex items-center gap-0.5 hover:underline">
                      <span>View details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Preview Modal */}
      <NotificationDetailsModal
        isOpen={Boolean(selectedNotificationForDetails)}
        notification={selectedNotificationForDetails}
        onClose={() => setSelectedNotificationForDetails(null)}
        onNavigateToTab={(tab) => {
          setSelectedNotificationForDetails(null);
          onClose();
          onNavigateToTab?.(tab);
        }}
      />
    </div>
  );
};

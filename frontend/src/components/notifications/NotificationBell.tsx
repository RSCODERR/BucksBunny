import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
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
  Loader2,
} from 'lucide-react';
import {
  notificationService,
  NotificationItem,
} from '../../services/notificationService';
import { NotificationsModal } from './NotificationsModal';
import { NotificationDetailsModal } from './NotificationDetailsModal';

interface NotificationBellProps {
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people') => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToTab }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedNotificationForDetails, setSelectedNotificationForDetails] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadAndFeed = useCallback(async () => {
    try {
      const [countRes, feedRes] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getNotifications(1, 10),
      ]);

      if (countRes.data) {
        setUnreadCount(countRes.data.unreadCount);
      }
      if (feedRes.data) {
        setNotifications(feedRes.data.notifications);
      }
    } catch {
      // Quiet background polling failure
    }
  }, []);

  // Polling every 30 seconds while mounted
  useEffect(() => {
    fetchUnreadAndFeed();
    const interval = setInterval(fetchUnreadAndFeed, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadAndFeed]);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Failed to mark as read
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Failed to mark all as read
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    setSelectedNotificationForDetails(notif);
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_created':
        return <Receipt className="w-3.5 h-3.5 text-[#064E3B]" />;
      case 'expense_updated':
        return <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />;
      case 'expense_deleted':
        return <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />;
      case 'repayment_recorded':
        return <ArrowDownLeft className="w-3.5 h-3.5 text-[#059669]" />;
      case 'friend_request_received':
        return <UserPlus className="w-3.5 h-3.5 text-[#064E3B]" />;
      case 'friend_request_accepted':
        return <UserCheck className="w-3.5 h-3.5 text-[#059669]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#4B5563]" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchUnreadAndFeed();
          }
        }}
        title="Notifications"
        aria-label="Notifications"
        className="relative p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-[#CBD5E1] transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-2xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in max-h-[80vh]">
          {/* Header */}
          <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111827]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EE] text-[#064E3B]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-[11px] font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Quick List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#064E3B]" />
                <p className="text-xs text-[#6B7280]">Loading updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <p className="text-xs font-semibold text-[#111827]">All caught up</p>
                <p className="text-[11px] text-[#6B7280]">
                  No notifications in the last 24 hours.
                </p>
              </div>
            ) : (
              notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                    notif.isRead
                      ? 'hover:bg-[#F8FAF9]'
                      : 'bg-[#F4F9F6] hover:bg-[#EBF5EF]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-white border border-[#CBD5E1] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-[#111827] truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#4B5563] mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {!notif.isRead && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#064E3B]" />
                        <span className="text-[10px] font-semibold text-[#064E3B]">Unread</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="w-full py-1.5 text-center font-semibold text-[#064E3B] hover:bg-white rounded-md border border-transparent hover:border-[#CBD5E1] transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Full Modal */}
      <NotificationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Details Preview Modal */}
      <NotificationDetailsModal
        isOpen={Boolean(selectedNotificationForDetails)}
        notification={selectedNotificationForDetails}
        onClose={() => setSelectedNotificationForDetails(null)}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};

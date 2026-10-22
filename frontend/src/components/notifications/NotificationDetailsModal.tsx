import React from 'react';
import {
  X,
  Receipt,
  UserPlus,
  UserCheck,
  RefreshCw,
  Trash2,
  ArrowDownLeft,
  Bell,
  Clock,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { NotificationItem } from '../../services/notificationService';

interface NotificationDetailsModalProps {
  isOpen: boolean;
  notification: NotificationItem | null;
  onClose: () => void;
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people') => void;
}

export const NotificationDetailsModal: React.FC<NotificationDetailsModalProps> = ({
  isOpen,
  notification,
  onClose,
  onNavigateToTab,
}) => {
  if (!isOpen || !notification) return null;

  const notif = notification;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'expense_created':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F3EE] text-[#064E3B] text-xs font-bold border border-[#A7D7B9]">
            <Receipt className="w-3.5 h-3.5 text-[#064E3B]" />
            <span>Shared Expense</span>
          </span>
        );
      case 'expense_updated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold border border-[#BFDBFE]">
            <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Expense Updated</span>
          </span>
        );
      case 'expense_deleted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FDF2F2] text-[#DC2626] text-xs font-bold border border-[#FECACA]">
            <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Expense Removed</span>
          </span>
        );
      case 'repayment_recorded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold border border-[#A7F3D0]">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#059669]" />
            <span>Repayment Recorded</span>
          </span>
        );
      case 'friend_request_received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F3EE] text-[#064E3B] text-xs font-bold border border-[#A7D7B9]">
            <UserPlus className="w-3.5 h-3.5 text-[#064E3B]" />
            <span>Incoming Friend Request</span>
          </span>
        );
      case 'friend_request_accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold border border-[#A7F3D0]">
            <UserCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Friend Request Accepted</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#475569] text-xs font-bold border border-[#CBD5E1]">
            <Bell className="w-3.5 h-3.5 text-[#475569]" />
            <span>Notification</span>
          </span>
        );
    }
  };

  const formattedDate = new Date(notif.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const actorDisplayName = notif.actor ? notif.actor.name || notif.actor.username : null;
  const shareInPaise = notif.data?.shareInPaise || notif.data?.previousShareInPaise;
  const shareFormatted = typeof shareInPaise === 'number' ? `₹${(shareInPaise / 100).toFixed(2)}` : null;

  const handleAction = () => {
    onClose();
    if (notif.type === 'friend_request_received' || notif.type === 'friend_request_accepted') {
      onNavigateToTab?.('people');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#CBD5E1] w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeBadge(notif.type)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#111827] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#111827]">
              {notif.title}
            </h3>
            <p className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Received {formattedDate}</span>
            </p>
          </div>

          {/* Description Card */}
          <div className="p-3.5 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg text-xs sm:text-sm text-[#374151] leading-relaxed">
            {notif.message}
          </div>

          {/* Contextual Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {actorDisplayName && (
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-1">
                <span className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1">
                  <User className="w-3 h-3 text-[#9CA3AF]" />
                  <span>Initiated by</span>
                </span>
                <p className="font-bold text-[#111827]">
                  {actorDisplayName} {notif.actor?.username ? `(@${notif.actor.username})` : ''}
                </p>
              </div>
            )}

            {shareFormatted && (
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-1">
                <span className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-[#9CA3AF]" />
                  <span>Your Share</span>
                </span>
                <p className="font-bold font-mono text-[#064E3B] text-sm">
                  {shareFormatted}
                </p>
              </div>
            )}
          </div>

          {/* Deleted Item Notice */}
          {notif.type === 'expense_deleted' && (
            <div className="p-3 bg-[#FDF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
              <span>
                This shared expense was removed by the creator.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          {(notif.type === 'friend_request_received' || notif.type === 'friend_request_accepted') && (
            <button
              type="button"
              onClick={handleAction}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>Go to Friend Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

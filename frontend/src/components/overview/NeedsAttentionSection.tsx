import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Bell,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  notificationService,
  AttentionItem,
} from '../../services/notificationService';

interface NeedsAttentionSectionProps {
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people') => void;
  refreshTrigger?: number;
}

export const NeedsAttentionSection: React.FC<NeedsAttentionSectionProps> = ({
  onNavigateToTab,
  refreshTrigger = 0,
}) => {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAttentionItems = useCallback(async () => {
    try {
      const res = await notificationService.getAttentionItems();
      if (res.data?.items) {
        setItems(res.data.items);
      }
    } catch {
      // Quiet failure, section will remain hidden if data cannot be fetched
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttentionItems();
  }, [fetchAttentionItems, refreshTrigger]);

  // Hide the section entirely if loading or no actionable items exist
  if (isLoading || items.length === 0) {
    return null;
  }

  const handleAction = (item: AttentionItem) => {
    if (item.type === 'friend_request') {
      onNavigateToTab?.('people');
    }
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

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5 shadow-xs animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#064E3B] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold text-[#111827] uppercase tracking-wider">
            Needs Your Attention
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EE] text-[#064E3B]">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {items.length > 2 && (
          <button
            type="button"
            onClick={() => onNavigateToTab?.('people')}
            className="text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Compact List of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {items.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg flex items-start justify-between gap-3 hover:border-[#CBD5E1] transition-colors"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-white border border-[#CBD5E1] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {item.type === 'friend_request' ? (
                  <UserPlus className="w-3.5 h-3.5 text-[#064E3B]" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-[#111827] truncate">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
                <p className="text-[11px] text-[#4B5563] mt-0.5 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAction(item)}
              className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-[#E8F3EE] text-[#064E3B] border border-[#CBD5E1] hover:border-[#A7D7B9] text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <span>{item.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

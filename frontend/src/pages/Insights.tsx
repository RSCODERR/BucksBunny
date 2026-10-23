import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  Receipt,
  Store,
  ShoppingBag,
  Tag,
  Info,
} from 'lucide-react';
import {
  insightsService,
  InsightsData,
  InsightsDateRange,
} from '../services/insightsService';

interface InsightsProps {
  onOpenAddExpense: () => void;
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people' | 'budgets' | 'insights' | 'import' | 'settings') => void;
  refreshTrigger?: number;
}

export const Insights: React.FC<InsightsProps> = ({
  onOpenAddExpense,
  onNavigateToTab,
  refreshTrigger = 0,
}) => {
  const [selectedRange, setSelectedRange] = useState<InsightsDateRange>('this-month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);

  // Stale request protection
  const latestRequestId = useRef<number>(0);

  const fetchInsights = useCallback(
    async (range: InsightsDateRange, start?: string, end?: string) => {
      const requestId = ++latestRequestId.current;
      setLoading(true);
      setError(null);

      try {
        const response = await insightsService.getInsights(range, start, end);
        // Only update state if this is still the most recent request
        if (requestId === latestRequestId.current && response.data) {
          setInsightsData(response.data);
        }
      } catch (err: unknown) {
        if (requestId === latestRequestId.current) {
          const msg = err instanceof Error ? err.message : 'Unable to load spending insights.';
          setError(msg);
        }
      } finally {
        if (requestId === latestRequestId.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (selectedRange === 'custom') {
      fetchInsights('custom', customStartDate, customEndDate);
    } else {
      fetchInsights(selectedRange);
    }
  }, [fetchInsights, selectedRange, refreshTrigger]);

  const handleRangeChange = (range: InsightsDateRange) => {
    setSelectedRange(range);
    if (range === 'custom') {
      setIsCustomExpanded(true);
      fetchInsights('custom', customStartDate, customEndDate);
    } else {
      setIsCustomExpanded(false);
      fetchInsights(range);
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      setError('Both start date and end date are required.');
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError(null);
    setSelectedRange('custom');
    fetchInsights('custom', customStartDate, customEndDate);
  };

  const formatRupees = (rupees: number) => {
    return (
      '₹' +
      rupees.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatShortRupees = (rupees: number) => {
    return '₹' + rupees.toLocaleString('en-IN');
  };

  // Find max monthly trend amount to compute proportional bar heights safely
  const maxTrendAmount = insightsData?.monthlyTrend?.months
    ? Math.max(...insightsData.monthlyTrend.months.map((m) => m.amountInRupees), 1)
    : 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Insights
          </h1>
          <p className="text-sm font-medium text-[#4B5563] mt-1">
            Understand where your money goes.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-white border border-[#CBD5E1] rounded-lg shadow-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleRangeChange('this-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                selectedRange === 'this-month'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange('last-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                selectedRange === 'last-month'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              Last month
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange('last-3-months')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                selectedRange === 'last-3-months'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              Last 3 months
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                selectedRange === 'custom'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              Custom range
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedRange === 'custom') {
                fetchInsights('custom', customStartDate, customEndDate);
              } else {
                fetchInsights(selectedRange);
              }
            }}
            disabled={loading}
            title="Refresh insights"
            className="self-end sm:self-auto p-2 text-[#4B5563] hover:text-[#111827] bg-white border border-[#CBD5E1] rounded-lg shadow-xs hover:bg-[#F8FAF9] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Range Drawer */}
      {isCustomExpanded && (
        <form
          onSubmit={handleApplyCustomDates}
          className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#064E3B]" />
            <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              Select Custom Dates:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="custom-start-date" className="text-xs font-medium text-[#4B5563]">
              From:
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs font-semibold text-[#111827] bg-[#F8FAF9] border border-[#CBD5E1] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#064E3B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="custom-end-date" className="text-xs font-medium text-[#4B5563]">
              To:
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs font-semibold text-[#111827] bg-[#F8FAF9] border border-[#CBD5E1] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#064E3B]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start justify-between gap-3 text-[#991B1B]">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#DC2626]" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedRange === 'custom') {
                fetchInsights('custom', customStartDate, customEndDate);
              } else {
                fetchInsights(selectedRange);
              }
            }}
            className="px-3 py-1 bg-white border border-[#FCA5A5] text-xs font-semibold text-[#991B1B] rounded-md hover:bg-[#FEF2F2] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !insightsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white border border-[#E2E8F0] rounded-xl p-4 animate-pulse flex flex-col justify-between"
              >
                <div className="w-24 h-3 bg-[#E2E8F0] rounded" />
                <div className="w-36 h-6 bg-[#E2E8F0] rounded" />
                <div className="w-28 h-3 bg-[#E2E8F0] rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-white border border-[#E2E8F0] rounded-xl p-6 animate-pulse" />
            <div className="h-64 bg-white border border-[#E2E8F0] rounded-xl p-6 animate-pulse" />
          </div>
        </div>
      )}

      {/* Content View */}
      {insightsData && (
        <>
          {/* Active Period Header Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider whitespace-nowrap">
                Viewing Period:
              </span>
              <span className="text-xs font-semibold text-[#064E3B] bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-[#A7F3D0] whitespace-nowrap">
                {insightsData.period.label}
              </span>
              {insightsData.period.isPartial && insightsData.period.partialNotice && (
                <span className="text-xs text-[#6B7280]">
                  • {insightsData.period.partialNotice}
                </span>
              )}
            </div>
            <span className="text-xs text-[#4B5563] whitespace-nowrap">
              {insightsData.summary.transactionCount} transaction
              {insightsData.summary.transactionCount === 1 ? '' : 's'} recorded in this period
            </span>
          </div>

          {/* Empty State: If user has no expenses at all across all time */}
          {!insightsData.hasAnyExpenses && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-center mx-auto text-[#064E3B]">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-[#111827]">
                  No expenses recorded yet
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563]">
                  Add your first expense to begin tracking personal spending, category distributions, and monthly trends.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            </div>
          )}

          {/* Empty Period State: User has records overall, but none in this period */}
          {insightsData.hasAnyExpenses && !insightsData.hasPeriodExpenses && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-10 h-10 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg flex items-center justify-center mx-auto text-[#4B5563]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-[#111827]">
                  No spending recorded for this period
                </h3>
                <p className="text-xs text-[#4B5563]">
                  No expenses were recorded between {new Date(insightsData.period.startDate).toLocaleDateString()} and {new Date(insightsData.period.endDate).toLocaleDateString()}.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRangeChange('this-month')}
                  className="px-3.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2937] text-xs font-semibold rounded-lg border border-[#CBD5E1] transition-colors cursor-pointer"
                >
                  View Current Month
                </button>
                <button
                  type="button"
                  onClick={onOpenAddExpense}
                  className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Add Expense
                </button>
              </div>
            </div>
          )}

          {/* 1. Summary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Personal Spending */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-[#4B5563] tracking-wider uppercase">
                  TOTAL PERSONAL SPENDING
                </span>
                <p className="text-2xl font-extrabold text-[#111827] font-mono tracking-tight">
                  {formatRupees(insightsData.summary.totalPersonalSpendingInRupees)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] text-xs text-[#4B5563] flex items-center justify-between">
                <span>{insightsData.period.label}</span>
                {insightsData.summary.totalBillTurnoverInRupees > insightsData.summary.totalPersonalSpendingInRupees && (
                  <span className="text-[11px] text-[#059669] font-medium" title="Gross turnover before splitting with counterparties">
                    Bill vol: {formatShortRupees(insightsData.summary.totalBillTurnoverInRupees)}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 2: Average Monthly Spending */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-[#4B5563] tracking-wider uppercase">
                  AVERAGE MONTHLY SPENDING
                </span>
                <p className="text-2xl font-extrabold text-[#111827] font-mono tracking-tight">
                  {insightsData.summary.isAverageMonthlyAvailable
                    ? formatRupees(insightsData.summary.averageMonthlySpendingInRupees)
                    : 'N/A'}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] text-xs text-[#4B5563]">
                {insightsData.summary.isAverageMonthlyAvailable ? (
                  <span>Calculated for active period</span>
                ) : (
                  <span className="italic text-[#6B7280]">Requires at least 28 days</span>
                )}
              </div>
            </div>

            {/* Metric 3: Highest-Spending Category */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-[#4B5563] tracking-wider uppercase">
                  TOP SPENDING CATEGORY
                </span>
                <p className="text-xl font-extrabold text-[#111827] tracking-tight truncate">
                  {insightsData.summary.highestCategory
                    ? insightsData.summary.highestCategory.category
                    : 'None'}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] text-xs text-[#4B5563] font-medium flex items-center justify-between">
                {insightsData.summary.highestCategory ? (
                  <>
                    <span className="font-mono text-[#111827]">
                      {formatRupees(insightsData.summary.highestCategory.amountInRupees)}
                    </span>
                    <span className="text-[#059669] font-bold">
                      {insightsData.summary.highestCategory.percentage}%
                    </span>
                  </>
                ) : (
                  <span className="text-[#6B7280]">No category records</span>
                )}
              </div>
            </div>

            {/* Metric 4: Period Comparison */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-[#4B5563] tracking-wider uppercase">
                  VS PREVIOUS PERIOD
                </span>
                <div className="flex items-center gap-2">
                  {insightsData.summary.comparison.direction === 'increased' ? (
                    <TrendingUp className="w-5 h-5 text-[#DC2626]" />
                  ) : insightsData.summary.comparison.direction === 'decreased' ? (
                    <TrendingDown className="w-5 h-5 text-[#059669]" />
                  ) : (
                    <Minus className="w-5 h-5 text-[#6B7280]" />
                  )}
                  <span className="text-xl font-extrabold text-[#111827] font-mono tracking-tight">
                    {insightsData.summary.comparison.percentageChange !== null ? (
                      <>
                        {insightsData.summary.comparison.percentageChange > 0 ? '+' : ''}
                        {insightsData.summary.comparison.percentageChange}%
                      </>
                    ) : (
                      formatRupees(insightsData.summary.comparison.differenceInRupees)
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] text-xs text-[#4B5563] truncate">
                <span>vs {insightsData.previousPeriod.label}</span>
              </div>
            </div>
          </div>

          {/* 2. Spending Comparison Detail Box */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#064E3B]" />
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                  Period Comparison Overview
                </h3>
              </div>
              {insightsData.summary.comparison.isPartialComparison && (
                <span className="text-xs bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded font-medium">
                  Current period in progress
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg space-y-1">
                <span className="text-xs text-[#6B7280] font-medium block">
                  Current Period ({insightsData.period.label})
                </span>
                <p className="text-lg font-bold text-[#111827] font-mono">
                  {formatRupees(insightsData.summary.comparison.currentSpendingInRupees)}
                </p>
              </div>

              <div className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg space-y-1">
                <span className="text-xs text-[#6B7280] font-medium block">
                  Previous Period ({insightsData.previousPeriod.label})
                </span>
                <p className="text-lg font-bold text-[#111827] font-mono">
                  {formatRupees(insightsData.summary.comparison.previousSpendingInRupees)}
                </p>
              </div>

              <div className="p-3 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg space-y-1">
                <span className="text-xs text-[#6B7280] font-medium block">
                  Absolute Variance
                </span>
                <p
                  className={`text-lg font-bold font-mono ${
                    insightsData.summary.comparison.direction === 'increased'
                      ? 'text-[#DC2626]'
                      : insightsData.summary.comparison.direction === 'decreased'
                      ? 'text-[#059669]'
                      : 'text-[#111827]'
                  }`}
                >
                  {insightsData.summary.comparison.direction === 'increased' ? '+' : insightsData.summary.comparison.direction === 'decreased' ? '-' : ''}
                  {formatRupees(insightsData.summary.comparison.differenceInRupees)}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] pt-1">
              <span className="font-semibold">Context:</span> {insightsData.summary.comparison.statusText}
            </p>
          </div>

          {/* 3. Charts & Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Card */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#94A3B8] transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Category Breakdown
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Personal spending grouped by classified category
                  </p>
                </div>
                <span className="text-sm font-extrabold font-mono text-[#111827]">
                  {formatRupees(insightsData.summary.totalPersonalSpendingInRupees)}
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="h-4 w-full rounded-md overflow-hidden flex bg-[#E5E7EB]">
                {insightsData.categoryBreakdown.length > 0 ? (
                  insightsData.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={idx}
                      title={`${cat.category}: ${formatRupees(cat.amountInRupees)} (${cat.percentage}%)`}
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                      className="h-full transition-all duration-300"
                    />
                  ))
                ) : (
                  <div className="w-full h-full bg-[#E5E7EB]" />
                )}
              </div>

              {/* Category Details List */}
              {insightsData.categoryBreakdown.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {insightsData.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b border-[#F8FAF9] last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-[#1F2937] truncate">
                          {cat.category}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          ({cat.transactionCount} txn{cat.transactionCount === 1 ? '' : 's'})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="font-mono font-bold text-[#111827]">
                          {formatRupees(cat.amountInRupees)}
                        </span>
                        <span className="font-mono text-[#6B7280] w-12 text-right">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] text-center py-6">
                  No categorized spending recorded for this period.
                </p>
              )}
            </div>

            {/* Monthly Spending Trend Card */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#94A3B8] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      Monthly Spending Trend
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Personal expenditure trajectory across past 6 months
                    </p>
                  </div>
                  <span className="text-xs bg-[#F3F4F6] text-[#4B5563] px-2.5 py-0.5 rounded border border-[#CBD5E1] font-semibold">
                    6 Months
                  </span>
                </div>

                {/* Trajectory Bar Chart */}
                <div className="pt-6 pb-2">
                  <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-36 border-b border-[#E2E8F0] pb-2">
                    {insightsData.monthlyTrend.months.map((m, idx) => {
                      const heightPercent =
                        m.amountInRupees > 0
                          ? Math.max(15, Math.round((m.amountInRupees / maxTrendAmount) * 100))
                          : 4;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center h-full justify-end group"
                        >
                          <span className="text-[11px] font-bold font-mono text-[#111827] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.amountInRupees > 0 ? formatShortRupees(m.amountInRupees) : '₹0'}
                          </span>
                          <div className="w-full max-w-[48px] bg-[#F1F5F9] rounded-t-md h-24 flex items-end overflow-hidden p-0.5">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-xs transition-all duration-300 ${
                                m.isCurrentMonth
                                  ? 'bg-[#064E3B]'
                                  : m.amountInRupees > 0
                                  ? 'bg-[#10B981] group-hover:bg-[#059669]'
                                  : 'bg-[#CBD5E1]'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-[#6B7280] mt-2 truncate w-full text-center">
                            {m.month.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Insufficient History Notice */}
                {insightsData.monthlyTrend.insufficientHistory && insightsData.monthlyTrend.notice && (
                  <div className="mt-3 p-2.5 bg-[#F8FAF9] border border-[#E2E8F0] rounded-lg flex items-center gap-2 text-xs text-[#4B5563]">
                    <Info className="w-4 h-4 text-[#064E3B] shrink-0" />
                    <span>{insightsData.monthlyTrend.notice}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#6B7280] pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                <span>Legend: Dark green indicates current month</span>
                <span>Values based on recorded personal shares</span>
              </div>
            </div>
          </div>

          {/* 4. Recent Spending Summary Table */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Recent Spending Summary
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Latest recorded expense entries in {insightsData.period.label}
                </p>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('transactions')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E3B] hover:text-[#04392B] transition-colors cursor-pointer"
                >
                  <span>View All in Transactions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {insightsData.recentExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#CBD5E1] text-[11px] font-bold text-[#4B5563] uppercase tracking-wider bg-[#F8FAF9]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Merchant / Payee</th>
                      <th className="py-2.5 px-3">Item / Product</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Personal Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {insightsData.recentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F8FAF9] transition-colors">
                        <td className="py-2.5 px-3 text-[#4B5563] font-medium whitespace-nowrap">
                          {exp.formattedDate}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#111827] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                            <span>{exp.merchant}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#374151] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                            <span>{exp.item}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3F4F6] text-[#374151]">
                            <Tag className="w-3 h-3 text-[#6B7280]" />
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#111827] whitespace-nowrap">
                          {formatRupees(exp.personalAmountInRupees)}
                          {exp.isSplit && (
                            <span
                              className="ml-2 text-[10px] text-[#059669] font-sans font-medium"
                              title={`Total bill: ₹${exp.totalAmountInRupees.toFixed(2)}`}
                            >
                              (Split)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#6B7280] text-center py-6">
                No individual expenses recorded in this period.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

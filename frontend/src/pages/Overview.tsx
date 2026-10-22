import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CreditCard,
  User,
  Check,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Search,
  Trash2,
  Coffee,
  ShoppingCart,
  Car,
  Wifi,
  Utensils,
  Receipt,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import {
  expenseService,
  ExpenseOverviewData,
} from '../services/expenseService';
import { NeedsAttentionSection } from '../components/overview/NeedsAttentionSection';

interface OverviewProps {
  onOpenAddExpense: () => void;
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'debts' | 'people' | 'budgets' | 'insights' | 'import' | 'settings') => void;
  refreshTrigger?: number;
}

const emptyOverviewData: ExpenseOverviewData = {
  isSampleData: false,
  totalSpendingInPaise: 0,
  totalSpendingInRupees: 0,
  transactionCount: 0,
  personalShareInPaise: 0,
  personalShareInRupees: 0,
  moneyOwedToUserInPaise: 0,
  moneyOwedToUserInRupees: 0,
  peopleOwedToUserCount: 0,
  moneyUserOwesInPaise: 0,
  moneyUserOwesInRupees: 0,
  peopleUserOwesCount: 0,
  categoryBreakdown: [],
  debts: [],
  monthlyTrend: [],
  monthlyTable: [],
  recentTransactions: [],
};

export const Overview: React.FC<OverviewProps> = ({
  onOpenAddExpense,
  onNavigateToTab,
  refreshTrigger = 0,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<ExpenseOverviewData | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [selectedCycle] = useState<string>('October 2024');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await expenseService.getOverview();
      if (res.data) {
        setOverviewData(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load overview data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, refreshTrigger]);

  const handleDeleteExpense = async (txId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will permanently remove it from your database.`)) {
      return;
    }

    try {
      setDeletingTxId(txId);
      setActionSuccessMsg(null);
      await expenseService.deleteExpense(txId);

      // Re-fetch overview to guarantee exact database recalculation
      await fetchOverview();

      setActionSuccessMsg(`Transaction "${title}" deleted from database.`);
      setTimeout(() => {
        setActionSuccessMsg(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete transaction.';
      alert(msg);
    } finally {
      setDeletingTxId(null);
    }
  };

  const formatRupees = (amountInRupees: number) => {
    return '₹' + amountInRupees.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getTransactionIcon = (category: string, title: string) => {
    const lowTitle = (title || '').toLowerCase();
    const lowCat = (category || '').toLowerCase();

    if (lowTitle.includes('coffee') || lowTitle.includes('tea') || lowTitle.includes('cafe')) {
      return Coffee;
    }
    if (lowTitle.includes('instamart') || lowTitle.includes('grocery') || lowTitle.includes('blinkit') || lowCat.includes('groceries')) {
      return ShoppingCart;
    }
    if (lowTitle.includes('uber') || lowTitle.includes('ola') || lowTitle.includes('fuel') || lowCat.includes('transport')) {
      return Car;
    }
    if (lowTitle.includes('wifi') || lowTitle.includes('broadband') || lowTitle.includes('airtel') || lowCat.includes('bills')) {
      return Wifi;
    }
    if (lowCat.includes('food') || lowTitle.includes('dinner') || lowTitle.includes('lunch') || lowTitle.includes('restaurant')) {
      return Utensils;
    }
    if (lowCat.includes('shopping')) {
      return ShoppingBag;
    }
    if (lowCat.includes('utilities')) {
      return Zap;
    }
    return Receipt;
  };

  const data: ExpenseOverviewData = overviewData || emptyOverviewData;
  const hasExpensesOrDebts = data.transactionCount > 0 || data.debts.length > 0;

  const maxTrendAmount = Math.max(
    ...data.monthlyTrend.map((m) => m.amountInPaise),
    1
  );

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return data.recentTransactions;
    const query = searchQuery.toLowerCase().trim();
    return data.recentTransactions.filter(
      (tx) =>
        tx.title.toLowerCase().includes(query) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(query)) ||
        tx.category.toLowerCase().includes(query) ||
        tx.splitStatus.toLowerCase().includes(query)
    );
  }, [data.recentTransactions, searchQuery]);

  if (loading && !overviewData) {
    return (
      <div className="p-8 sm:p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <RefreshCw className="w-8 h-8 text-[#064E3B] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#111827]">Loading financial ledger...</p>
        <p className="text-xs text-[#6B7280] mt-1">Retrieving spending summaries and settlement balances.</p>
      </div>
    );
  }

  if (error && !overviewData) {
    return (
      <div className="p-8 sm:p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#111827]">Could not load overview</h3>
        <p className="text-sm text-[#4B5563]">{error}</p>
        <button
          type="button"
          onClick={fetchOverview}
          className="px-4 py-2 bg-[#064E3B] text-white text-xs font-semibold rounded-lg hover:bg-[#04392B] transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Action Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#ECFDF5] border border-[#6EE7B7] rounded-lg text-xs font-semibold text-[#065F46] animate-fade-in">
          <Check className="w-4 h-4 text-[#059669] shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Overview Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Overview
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#4B5563] mt-0.5">
            Your spending at a glance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cycle Selector Button */}
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#374151] shadow-xs cursor-pointer hover:bg-gray-50 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>{selectedCycle}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
          </div>

          {/* + Add expense Button */}
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add expense</span>
          </button>
        </div>
      </div>

      {/* Needs Your Attention Section (only visible when actionable items exist) */}
      <NeedsAttentionSection
        onNavigateToTab={onNavigateToTab}
        refreshTrigger={refreshTrigger}
      />

      {!hasExpensesOrDebts ? (
        /* Empty State when no expense exists */
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-8 sm:p-16 text-center max-w-xl mx-auto shadow-xs space-y-4 my-8">
          <div className="w-16 h-16 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-[#064E3B] mx-auto">
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[#111827]">
              No expenses recorded yet
            </h3>
            <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
              Your personal ledger is empty. Add your first expense or split costs with friends to see your overview.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#064E3B] hover:bg-[#04392B] text-white text-sm font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Spending */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="flex items-center justify-between text-[#4B5563]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  TOTAL SPENDING
                </span>
                <CreditCard className="w-4 h-4 text-[#9CA3AF]" />
              </div>
              <div className="my-2">
                <span className="text-2xl sm:text-[28px] font-extrabold text-[#111827] font-mono tracking-tight">
                  {formatRupees(data.totalSpendingInRupees)}
                </span>
              </div>
              <div className="text-xs font-medium text-[#6B7280]">
                Across {data.transactionCount} {data.transactionCount === 1 ? 'transaction' : 'transactions'}
              </div>
            </div>

            {/* Metric 2: Your Personal Share */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="flex items-center justify-between text-[#4B5563]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  YOUR PERSONAL SHARE
                </span>
                <User className="w-4 h-4 text-[#9CA3AF]" />
              </div>
              <div className="my-2">
                <span className="text-2xl sm:text-[28px] font-extrabold text-[#111827] font-mono tracking-tight">
                  {formatRupees(data.personalShareInRupees)}
                </span>
              </div>
              <div className="text-xs font-medium text-[#6B7280]">
                Excludes friends shares
              </div>
            </div>

            {/* Metric 3: Money Owed to You */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="flex items-center justify-between text-[#4B5563]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  MONEY OWED TO YOU
                </span>
                <Check className="w-4 h-4 text-[#059669] stroke-[2.5]" />
              </div>
              <div className="my-2">
                <span className="text-2xl sm:text-[28px] font-extrabold text-[#059669] font-mono tracking-tight">
                  +{formatRupees(data.moneyOwedToUserInRupees)}
                </span>
              </div>
              <div className="text-xs font-medium text-[#6B7280]">
                {data.peopleOwedToUserCount}{' '}
                {data.peopleOwedToUserCount === 1 ? 'person pending' : 'people pending'}
              </div>
            </div>

            {/* Metric 4: Money You Owe */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
              <div className="flex items-center justify-between text-[#4B5563]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  MONEY YOU OWE
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#DC2626] stroke-[2.5]" />
              </div>
              <div className="my-2">
                <span className="text-2xl sm:text-[28px] font-extrabold text-[#DC2626] font-mono tracking-tight">
                  -{formatRupees(data.moneyUserOwesInRupees)}
                </span>
              </div>
              <div className="text-xs font-medium text-[#6B7280]">
                {data.peopleUserOwesCount}{' '}
                {data.peopleUserOwesCount === 1 ? 'person to settle' : 'people to settle'}
              </div>
            </div>
          </div>

          {/* Middle Grid: Left ~60%, Right ~40% */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Spending Breakdown & Monthly Trend */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card: Spending Breakdown */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-5 hover:border-[#94A3B8] transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      Spending Breakdown
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Classified ledger distribution for current cycle
                    </p>
                  </div>
                  <span className="text-base font-extrabold text-[#111827] font-mono">
                    {formatRupees(data.totalSpendingInRupees)}
                  </span>
                </div>

                {/* Horizontal Segmented Progress Bar */}
                <div className="h-3.5 w-full rounded-md overflow-hidden flex bg-[#E5E7EB]">
                  {data.categoryBreakdown.length > 0 ? (
                    data.categoryBreakdown.map((cat, idx) => (
                      <div
                        key={idx}
                        title={`${cat.category}: ${formatRupees(cat.totalInRupees)} (${cat.percentage}%)`}
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

                {/* Category Legend Grid (2 columns) */}
                {data.categoryBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
                    {data.categoryBreakdown.map((cat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-0.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-semibold text-[#1F2937] truncate">
                            {cat.category}
                          </span>
                        </div>
                        <span className="font-mono font-medium text-[#374151] shrink-0 ml-2">
                          {formatRupees(cat.totalInRupees)} ({cat.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] text-center py-2">
                    No categorized spending recorded for this cycle.
                  </p>
                )}
              </div>

              {/* Card: Monthly Trend Comparison */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#94A3B8] transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      Monthly Trend Comparison
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Three-month expenditure trajectory
                    </p>
                  </div>
                  <span className="text-xs bg-[#F3F4F6] text-[#4B5563] px-2.5 py-0.5 rounded border border-[#CBD5E1] font-semibold">
                    Quarter Q3-Q4
                  </span>
                </div>

                {/* Trend Trajectory Visual */}
                <div className="pt-4 pb-2">
                  <div className="grid grid-cols-3 gap-4 items-end h-28 border-b border-[#F1F5F9] pb-3">
                    {data.monthlyTrend.map((m, idx) => {
                      const isCurrent = idx === data.monthlyTrend.length - 1;
                      const heightPercent = Math.max(
                        20,
                        Math.round((m.amountInPaise / maxTrendAmount) * 100)
                      );
                      return (
                        <div key={idx} className="flex flex-col items-center h-full justify-end group">
                          <span className="text-xs font-bold font-mono text-[#111827] mb-2">
                            ₹{m.label}
                          </span>
                          <div className="w-full max-w-[70px] bg-[#F1F5F9] rounded-t-md h-16 flex items-end overflow-hidden p-0.5">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isCurrent
                                  ? 'bg-[#064E3B]'
                                  : 'bg-[#94A3B8] group-hover:bg-[#64748B]'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#4B5563] mt-2">
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Breakdown Table */}
                  <div className="overflow-x-auto pt-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#6B7280] border-b border-[#F1F5F9]">
                          <th className="text-left py-2 font-semibold">Period</th>
                          <th className="text-center py-2 font-semibold">Spending</th>
                          <th className="text-center py-2 font-semibold">Variance</th>
                          <th className="text-right py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F8FAF9]">
                        {data.monthlyTable.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="py-2.5 font-medium text-[#111827]">
                              {row.period}
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold text-[#111827]">
                              {formatRupees(row.spending)}
                            </td>
                            <td className={`py-2.5 text-center font-mono font-medium ${
                              row.variance.startsWith('+') ? 'text-[#059669]' : 'text-[#DC2626]'
                            }`}>
                              {row.variance}
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  row.status === 'Active'
                                    ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                                    : 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Who owes whom? */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#94A3B8] transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      Who owes whom?
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Settlement ledger balances
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.('debts')}
                    className="text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* List of settlement debts */}
                <div className="divide-y divide-[#F1F5F9] mt-3">
                  {data.debts.length > 0 ? (
                    data.debts.map((debt) => {
                      const personDisplayName = debt.isReceivable
                        ? debt.debtorName
                        : debt.creditorName;

                      return (
                        <div
                          key={debt.id}
                          className="py-3.5 flex items-center justify-between gap-3"
                        >
                          {/* Left side details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#111827] truncate">
                                {personDisplayName}
                              </span>
                              {debt.isReceivable ? (
                                <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                  owes you
                                </span>
                              ) : (
                                <span className="bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                  you owe
                                </span>
                              )}
                            </div>

                            {debt.notes && (
                              <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                                {debt.notes}
                              </p>
                            )}

                            <div className="mt-1">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  debt.isReceivable
                                    ? 'text-[#059669]'
                                    : 'text-[#DC2626]'
                                }`}
                              >
                                {formatRupees(debt.amountInRupees)}
                              </span>
                            </div>
                          </div>

                          {/* Right action button redirects to Debts & Dues */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToTab?.('debts')}
                              className="bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#064E3B] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <span>Manage in Debts & Dues</span>
                              <ChevronRight className="w-3.5 h-3.5 text-[#064E3B]" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
                      <p className="font-semibold text-[#111827]">All settled up</p>
                      <p>No active balances or pending debts for this cycle.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Recent Transactions Full-Width Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#94A3B8] transition-colors">
            {/* Header and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Recent Transactions
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Latest postings across personal and shared ledgers
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search line items..."
                  className="bg-[#F9FAFB] border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#064E3B] focus:border-[#064E3B] w-full sm:w-60"
                />
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F7F5] border-b border-[#E5E7EB] text-[#4B5563]">
                    <th className="py-3 px-4 font-semibold">Merchant / Description</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Split Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => {
                      const Icon = getTransactionIcon(tx.category, tx.title);
                      const isDeleting = deletingTxId === tx.id;
                      const isOwed = tx.splitStatus.toLowerCase().includes('you owe');

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-[#F9FAFB] transition-colors group"
                        >
                          {/* Merchant / Description */}
                          <td className="py-3.5 px-4 font-medium text-[#111827]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] shrink-0 group-hover:border-[#CBD5E1]">
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-xs sm:text-sm text-[#111827]">
                                {tx.merchant || tx.title}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                              {tx.category}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap font-medium">
                            {tx.date}
                          </td>

                          {/* Split Status */}
                          <td className="py-3.5 px-4 text-xs">
                            <span
                              className={`font-medium ${
                                isOwed ? 'text-[#DC2626] font-semibold' : 'text-[#4B5563]'
                              }`}
                            >
                              {tx.splitStatus}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#111827] whitespace-nowrap">
                            {formatRupees(tx.amountInRupees)}
                          </td>

                          {/* Action: Delete Transaction */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteExpense(tx.id, tx.title)}
                              title="Delete transaction from database"
                              className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#6B7280]">
                        {searchQuery ? 'No transactions matching your search.' : 'No transactions recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="flex items-center justify-between text-xs text-[#6B7280] pt-1">
              <span>
                Showing {filteredTransactions.length} of {data.transactionCount} line items
              </span>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('transactions')}
                className="font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all {data.transactionCount} transactions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

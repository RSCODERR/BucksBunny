import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  FilterX,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coffee,
  ShoppingBag,
  Car,
  Wifi,
  ArrowLeftRight,
  Utensils,
  Dumbbell,
  Receipt,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  expenseService,
  UnifiedTransaction,
} from '../services/expenseService';
import { AddNewExpenseModal } from '../components/expenses/AddNewExpenseModal';

interface TransactionsProps {
  onOpenAddExpense: () => void;
  refreshTrigger?: number;
  currentUser?: { username?: string; email?: string } | null;
}

export const Transactions: React.FC<TransactionsProps> = ({
  onOpenAddExpense,
  refreshTrigger,
  currentUser,
}) => {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('THIS_MONTH');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDateRange !== 'ALL') count++;
    if (selectedCategory !== 'ALL') count++;
    if (selectedType !== 'ALL') count++;
    if (sortOrder !== 'newest') count++;
    return count;
  }, [selectedDateRange, selectedCategory, selectedType, sortOrder]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8; // Exactly matching the reference layout

  // Modal States
  const [selectedTxForView, setSelectedTxForView] = useState<UnifiedTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<UnifiedTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<UnifiedTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Compute Current Month Dates
  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthShort = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      label: `This Month (${startStr.replace(/, \d{4}/, '')} - ${endStr})`,
      shortLabel: monthShort,
      startDate: start,
      endDate: end,
    };
  }, []);

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await expenseService.getTransactions();
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load transactions ledger.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDateRange, selectedCategory, selectedType, sortOrder]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions
      .filter((t) => {
        // Search Filter
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const matchQuery =
            t.title.toLowerCase().includes(query) ||
            t.merchant.toLowerCase().includes(query) ||
            t.item.toLowerCase().includes(query) ||
            t.notes.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            t.splitResponsibility.headline.toLowerCase().includes(query);
          if (!matchQuery) return false;
        }

        // Date Range Filter
        const txDate = new Date(t.date);
        if (selectedDateRange === 'THIS_MONTH') {
          if (
            txDate.getFullYear() !== now.getFullYear() ||
            txDate.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        } else if (selectedDateRange === 'LAST_MONTH') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (txDate.getFullYear() !== lastMonthYear || txDate.getMonth() !== lastMonth) {
            return false;
          }
        } else if (selectedDateRange === 'LAST_30_DAYS') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (txDate < thirtyDaysAgo) return false;
        }

        // Category Filter
        if (selectedCategory !== 'ALL') {
          if (t.category.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Type Filter
        if (selectedType === 'PERSONAL') {
          if (t.type !== 'EXPENSE' || t.isSplit) return false;
        } else if (selectedType === 'SPLIT') {
          if (t.type !== 'EXPENSE' || !t.isSplit) return false;
        } else if (selectedType === 'SETTLEMENT') {
          if (t.type !== 'DEBT_SETTLEMENT') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortOrder === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortOrder === 'amount_high') {
          return b.totalAmountInRupees - a.totalAmountInRupees;
        } else if (sortOrder === 'amount_low') {
          return a.totalAmountInRupees - b.totalAmountInRupees;
        }
        return 0;
      });
  }, [transactions, searchQuery, selectedDateRange, selectedCategory, selectedType, sortOrder]);

  // Aggregated Turnover of displayed list
  const aggregatedTurnover = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + curr.totalAmountInRupees, 0);
  }, [filteredTransactions]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDateRange('ALL');
    setSelectedCategory('ALL');
    setSelectedType('ALL');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  // Toggle sort order
  const handleCycleSort = () => {
    if (sortOrder === 'newest') setSortOrder('oldest');
    else if (sortOrder === 'oldest') setSortOrder('amount_high');
    else if (sortOrder === 'amount_high') setSortOrder('amount_low');
    else setSortOrder('newest');
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingTx) return;

    try {
      setIsDeleting(true);
      await expenseService.deleteExpense(deletingTx.rawId || deletingTx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
      setSuccessMessage(`Deleted "${deletingTx.merchant || deletingTx.title}" successfully.`);
      setDeletingTx(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete transaction.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic category icon matcher
  const getTransactionIcon = (cat: string, title: string, merchant: string) => {
    const text = `${cat} ${title} ${merchant}`.toLowerCase();
    if (text.includes('coffee') || text.includes('tea') || text.includes('roasters') || text.includes('cafe')) {
      return <Coffee className="w-4 h-4" />;
    }
    if (text.includes('swiggy') || text.includes('instamart') || text.includes('grocery') || text.includes('produce') || text.includes('dairy') || text.includes('zepto') || text.includes('blinkit')) {
      return <ShoppingBag className="w-4 h-4" />;
    }
    if (text.includes('uber') || text.includes('ola') || text.includes('cab') || text.includes('transport') || text.includes('petrol') || text.includes('fuel') || text.includes('metro')) {
      return <Car className="w-4 h-4" />;
    }
    if (text.includes('fiber') || text.includes('broadband') || text.includes('wifi') || text.includes('airtel') || text.includes('jio') || text.includes('electricity') || text.includes('bill') || text.includes('utility')) {
      return <Wifi className="w-4 h-4" />;
    }
    if (text.includes('settlement') || text.includes('repayment') || text.includes('debt') || text.includes('offset')) {
      return <ArrowLeftRight className="w-4 h-4" />;
    }
    if (text.includes('restaurant') || text.includes('dining') || text.includes('dinner') || text.includes('lunch') || text.includes('food') || text.includes('burger') || text.includes('burma')) {
      return <Utensils className="w-4 h-4" />;
    }
    if (text.includes('zara') || text.includes('shopping') || text.includes('clothing') || text.includes('apparel') || text.includes('h&m') || text.includes('myntra')) {
      return <ShoppingBag className="w-4 h-4" />;
    }
    if (text.includes('cult') || text.includes('gym') || text.includes('fitness') || text.includes('health') || text.includes('medical') || text.includes('pharmacy')) {
      return <Dumbbell className="w-4 h-4" />;
    }
    return <Receipt className="w-4 h-4" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-[#E8F5EC] border border-[#A6DEC0] rounded-lg text-xs font-semibold text-[#064E3B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#C24141]" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Filter and Search Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Box with Mint Tone */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#064E3B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, note, or person..."
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-[#111827] bg-[#F0FAF4] border border-[#BDE5CE] rounded-lg focus:outline-none focus:border-[#064E3B] focus:ring-1 focus:ring-[#064E3B] transition-colors placeholder-[#6B7280]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
              isFiltersOpen || activeFilterCount > 0
                ? 'bg-[#064E3B] text-white border-[#064E3B]'
                : 'bg-[#F0FAF4] text-[#064E3B] border-[#BDE5CE] hover:bg-[#E5F5EC]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isFiltersOpen || activeFilterCount > 0
                    ? 'bg-white text-[#064E3B]'
                    : 'bg-[#064E3B] text-white'
                }`}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFiltersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Collapsible Filter Panel under the search */}
        {isFiltersOpen && (
          <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Date Filter Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                Timeframe
              </label>
              <div className="relative">
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full appearance-none pl-8 pr-7 py-2 text-xs font-semibold text-[#064E3B] bg-[#F0FAF4] border border-[#BDE5CE] rounded-lg focus:outline-none focus:border-[#064E3B] cursor-pointer"
                >
                  <option value="THIS_MONTH">{currentMonthInfo.label}</option>
                  <option value="LAST_MONTH">Last Month</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="ALL">All Time</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-[#064E3B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-[#064E3B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-semibold text-[#064E3B] bg-[#F0FAF4] border border-[#BDE5CE] rounded-lg focus:outline-none focus:border-[#064E3B] cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Food & Dining">Food & Drink</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Transport">Transport</option>
                  <option value="Bills & Utilities">Utilities</option>
                  <option value="Debt Settlement">Debt Settlement</option>
                  <option value="Dining Out">Dining Out</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#064E3B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Type Filter Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                Entry Type
              </label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-semibold text-[#064E3B] bg-[#F0FAF4] border border-[#BDE5CE] rounded-lg focus:outline-none focus:border-[#064E3B] cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="SPLIT">Split Expenses</option>
                  <option value="SETTLEMENT">Debt Settlements</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#064E3B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Sort & Clear container */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                Sort & Reset
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCycleSort}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-[#064E3B] bg-[#F0FAF4] border border-[#BDE5CE] hover:bg-[#E5F5EC] rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-1.5"
                >
                  <span className="truncate">
                    {sortOrder === 'newest'
                      ? 'Newest'
                      : sortOrder === 'oldest'
                      ? 'Oldest'
                      : sortOrder === 'amount_high'
                      ? 'Highest'
                      : 'Lowest'}
                  </span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#064E3B] shrink-0" />
                </button>

                {(searchQuery || selectedDateRange !== 'ALL' || selectedCategory !== 'ALL' || selectedType !== 'ALL' || sortOrder !== 'newest') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827] bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Reset all filters"
                  >
                    <FilterX className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subheader: Count, Aggregated Turnover & Active Filter Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[#4B5563]">
          <span>
            Showing <strong className="font-semibold text-[#111827]">{paginatedTransactions.length}</strong> of{' '}
            <strong className="font-semibold text-[#111827]">{filteredTransactions.length}</strong> transactions
          </span>
          <span className="text-gray-300">•</span>
          <span>
            Aggregated Turnover:{' '}
            <strong className="font-mono font-bold text-[#111827]">
              ₹{aggregatedTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedDateRange === 'THIS_MONTH' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
              <span>{currentMonthInfo.shortLabel}</span>
              <button
                type="button"
                onClick={() => setSelectedDateRange('ALL')}
                className="hover:text-black cursor-pointer"
                title="Remove month filter"
              >
                ✕
              </button>
            </span>
          )}

          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#064E3B] border border-[#A7F3D0]">
            Active Ledger
          </span>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#064E3B]" />
            <p className="text-xs text-[#6B7280]">Loading ledger records...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#064E3B]">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">
              {searchQuery || selectedCategory !== 'ALL' || selectedType !== 'ALL'
                ? 'No matching transactions'
                : 'No transactions recorded yet'}
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'ALL' || selectedType !== 'ALL'
                ? 'Try adjusting your filters or search query to see other records.'
                : 'Record your first expense or bill split to establish your financial journal.'}
            </p>
            {!searchQuery && selectedCategory === 'ALL' && selectedType === 'ALL' && (
              <button
                type="button"
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile / Tablet Card List View (< lg) */}
            <div className="lg:hidden divide-y divide-[#E2E8F0]">
              {paginatedTransactions.map((t) => {
                const isSettlement = t.type === 'DEBT_SETTLEMENT';
                const isCredit = t.isCredit;
                const isOwe = t.splitResponsibility.kind === 'SPLIT_OWE';

                return (
                  <div key={t.id} className="p-3.5 space-y-2.5 hover:bg-[#F9FBFA] transition-colors">
                    {/* Top: Icon + Merchant/Title + Amount */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] border border-[#BCE3C8] flex items-center justify-center text-[#064E3B] shrink-0">
                          {getTransactionIcon(t.category, t.title, t.merchant)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#111827] truncate">
                            {t.merchant || t.title}
                          </div>
                          <div className="text-[11px] text-[#6B7280] truncate">
                            {t.formattedDate} • {t.time}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm text-[#111827]">
                          ₹{t.totalAmountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-semibold mt-0.5">
                          {isCredit ? (
                            <span className="font-mono font-bold text-[#059669]">
                              +₹{Math.abs(t.yourShareInRupees).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : isOwe ? (
                            <span className="font-mono font-bold text-[#DC2626]">
                              ₹{Math.abs(t.yourShareInRupees).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-[#111827]">
                              ₹{t.yourShareInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="text-[#6B7280] font-normal ml-1">share</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Badges (Category & Responsibility) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${
                            isSettlement
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                              : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                          }`}
                        >
                          {t.category}
                        </span>

                        {t.splitResponsibility.kind === 'PERSONAL' ? (
                          <span className="text-[#6B7280] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            <span>Personal</span>
                          </span>
                        ) : t.splitResponsibility.kind === 'SETTLEMENT' ? (
                          <span className="text-[#059669] flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                            <span>{t.splitResponsibility.headline}</span>
                          </span>
                        ) : t.splitResponsibility.kind === 'SPLIT_OWE' ? (
                          <span className="text-[#DC2626] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                            <span>{t.splitResponsibility.headline}</span>
                          </span>
                        ) : (
                          <span className="text-[#059669] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                            <span>{t.splitResponsibility.headline}</span>
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForView(t)}
                          title="View details"
                          className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (t.type === 'EXPENSE') {
                              setEditingTx(t);
                            } else {
                              setSelectedTxForView(t);
                            }
                          }}
                          title={t.type === 'EXPENSE' ? 'Edit expense' : 'View settlement details'}
                          className="p-1.5 text-[#6B7280] hover:text-[#064E3B] hover:bg-[#E8F3EE] rounded transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingTx(t)}
                          title="Delete transaction"
                          className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#CBD5E1] bg-[#F8FAF9] text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold whitespace-nowrap">DATE & TIME</th>
                  <th className="py-3.5 px-4 font-bold whitespace-nowrap">MERCHANT / TITLE</th>
                  <th className="py-3.5 px-4 font-bold whitespace-nowrap">CATEGORY</th>
                  <th className="py-3.5 px-4 font-bold whitespace-nowrap">SPLIT & RESPONSIBILITY</th>
                  <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap">TOTAL AMOUNT</th>
                  <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap">YOUR SHARE</th>
                  <th className="py-3.5 px-4 font-bold text-center whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {paginatedTransactions.map((t) => {
                  const isSettlement = t.type === 'DEBT_SETTLEMENT';
                  const isCredit = t.isCredit;
                  const isOwe = t.splitResponsibility.kind === 'SPLIT_OWE';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#F9FBFA] transition-colors text-[#111827]"
                    >
                      {/* Date & Time Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-xs text-[#111827]">
                          {t.formattedDate}
                        </div>
                        <div className="text-[11px] text-[#6B7280] mt-0.5">
                          {t.time}
                        </div>
                      </td>

                      {/* Merchant / Title with Mint Icon Box */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] border border-[#BCE3C8] flex items-center justify-center text-[#064E3B] shrink-0">
                            {getTransactionIcon(t.category, t.title, t.merchant)}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-bold text-xs text-[#111827] truncate">
                              {t.merchant || t.title}
                            </div>
                            <div className="text-[11px] text-[#6B7280] truncate mt-0.5">
                              {t.item || t.notes || (t.merchant ? t.title : 'Expense record')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                            isSettlement
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                              : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                          }`}
                        >
                          {t.category}
                        </span>
                      </td>

                      {/* Split & Responsibility Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {t.splitResponsibility.kind === 'PERSONAL' ? (
                          <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            <span>Personal</span>
                          </span>
                        ) : t.splitResponsibility.kind === 'SETTLEMENT' ? (
                          <div className="text-[11px] font-medium text-[#059669] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                            <span>{t.splitResponsibility.headline}</span>
                          </div>
                        ) : t.splitResponsibility.kind === 'SPLIT_OWE' ? (
                          <div className="leading-tight">
                            <div className="text-[11px] font-semibold text-[#DC2626] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                              <span>{t.splitResponsibility.headline}</span>
                            </div>
                            <div className="text-[11px] font-bold text-[#DC2626] mt-0.5">
                              {t.splitResponsibility.subline}
                            </div>
                          </div>
                        ) : (
                          <div className="leading-tight">
                            <div className="text-[11px] font-semibold text-[#111827]">
                              {t.splitResponsibility.headline}
                            </div>
                            <div className="text-[11px] font-medium text-[#059669] flex items-center gap-1 mt-0.5">
                              <span className="w-1 h-2.5 bg-[#059669] rounded-xs inline-block"></span>
                              <span>{t.splitResponsibility.subline}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Total Amount Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#111827]">
                          ₹{t.totalAmountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Your Share Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isCredit ? (
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#059669]">
                            +₹{Math.abs(t.yourShareInRupees).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : isOwe ? (
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#DC2626]">
                            ₹{Math.abs(t.yourShareInRupees).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#111827]">
                            ₹{t.yourShareInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Actions Column (View, Edit, Delete) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedTxForView(t)}
                            title="View details"
                            className="p-1.5 text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (t.type === 'EXPENSE') {
                                setEditingTx(t);
                              } else {
                                setSelectedTxForView(t);
                              }
                            }}
                            title="Edit transaction"
                            className="p-1.5 text-[#9CA3AF] hover:text-[#064E3B] hover:bg-[#E8F5EC] rounded transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setDeletingTx(t)}
                            title="Delete transaction"
                            className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* Pagination Row (Styled exactly like Image 1) */}
        <div className="p-3.5 sm:px-5 sm:py-3 border-t border-[#E2E8F0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4B5563]">
          <div>
            Showing{' '}
            <strong className="font-semibold text-[#111827]">
              {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="font-semibold text-[#111827]">
              {Math.min(currentPage * pageSize, filteredTransactions.length)}
            </strong>{' '}
            of{' '}
            <strong className="font-semibold text-[#111827]">{filteredTransactions.length}</strong> entries
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Previous */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                // Simple logic for showing pages
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 flex items-center justify-center text-xs font-bold rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return (
                    <span key={pageNum} className="px-1 text-xs text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              {/* Next */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {selectedTxForView && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden text-[#111827] space-y-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#CBD5E1] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] border border-[#BCE3C8] flex items-center justify-center text-[#064E3B]">
                  {getTransactionIcon(
                    selectedTxForView.category,
                    selectedTxForView.title,
                    selectedTxForView.merchant
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                    Transaction Details
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    {selectedTxForView.type === 'DEBT_SETTLEMENT'
                      ? 'Debt settlement ledger record'
                      : 'Recorded expense entry'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxForView(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Amounts summary card */}
              <div className="p-4 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    TOTAL AMOUNT
                  </span>
                  <div className="text-xl font-mono font-extrabold text-[#111827]">
                    ₹{selectedTxForView.totalAmountInRupees.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    YOUR SHARE
                  </span>
                  <div
                    className={`text-xl font-mono font-extrabold ${
                      selectedTxForView.isCredit
                        ? 'text-[#059669]'
                        : selectedTxForView.splitResponsibility.kind === 'SPLIT_OWE'
                        ? 'text-[#DC2626]'
                        : 'text-[#111827]'
                    }`}
                  >
                    {selectedTxForView.isCredit ? '+' : ''}₹{Math.abs(selectedTxForView.yourShareInRupees).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Metadata attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                    Merchant / Payee
                  </span>
                  <span className="font-semibold text-[#111827] mt-0.5 block truncate">
                    {selectedTxForView.merchant || selectedTxForView.title}
                  </span>
                </div>
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                    Category
                  </span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">
                    {selectedTxForView.category}
                  </span>
                </div>
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                    Date & Time
                  </span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">
                    {selectedTxForView.formattedDate} at {selectedTxForView.time}
                  </span>
                </div>
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                    Payment Method
                  </span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">
                    {selectedTxForView.paymentMethod || 'UPI'}
                  </span>
                </div>
              </div>

              {/* Description / Item / Notes */}
              {(selectedTxForView.item || selectedTxForView.notes) && (
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                    Item Description / Notes
                  </span>
                  <p className="text-[#374151]">
                    {selectedTxForView.item || selectedTxForView.notes}
                  </p>
                </div>
              )}

              {/* Split Participants Breakdown if split */}
              {selectedTxForView.isSplit && selectedTxForView.splitDetails?.participants && (
                <div className="p-3.5 bg-white border border-[#CBD5E1] rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111827]">Split Allocation Breakdown</span>
                    <span className="text-[11px] text-[#6B7280]">
                      Paid by {selectedTxForView.splitDetails.payerName}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {selectedTxForView.splitDetails.participants.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 bg-[#F8FAF9] rounded border border-[#E2E8F0]"
                      >
                        <span className="font-medium text-[#111827]">
                          {p.name} {p.isCurrentUser ? '(You)' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {p.percentage && (
                            <span className="text-[10px] text-[#6B7280]">
                              {p.percentage}%
                            </span>
                          )}
                          <span className="font-mono font-bold text-[#111827]">
                            ₹{(p.shareInPaise / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-[#CBD5E1] bg-[#F8FAF9] flex items-center justify-between">
              <div>
                {selectedTxForView.type === 'EXPENSE' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tx = selectedTxForView;
                      setSelectedTxForView(null);
                      setEditingTx(tx);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-[#064E3B] bg-[#E8F3EE] hover:bg-[#D5EADB] border border-[#A7D7B9] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Expense</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxForView(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#064E3B] hover:bg-[#04392B] rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTx && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 text-[#111827]">
            <div className="flex items-center gap-3 text-[#DC2626]">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#111827]">Delete Transaction?</h4>
                <p className="text-xs text-[#6B7280]">This action will permanently remove this record.</p>
              </div>
            </div>

            <p className="text-xs text-[#4B5563]">
              Are you sure you want to delete{' '}
              <strong className="text-[#111827]">"{deletingTx.merchant || deletingTx.title}"</strong> for{' '}
              <strong className="font-mono text-[#111827]">₹{deletingTx.totalAmountInRupees.toFixed(2)}</strong>?
              {deletingTx.isSplit ? ' Any participant debts tied to this expense will be safely reconciled.' : ''}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTx(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal (Reusing AddNewExpenseModal in Edit Mode) */}
      {editingTx && (
        <AddNewExpenseModal
          isOpen={Boolean(editingTx)}
          expenseToEdit={editingTx.rawExpense || editingTx}
          onClose={() => setEditingTx(null)}
          onExpenseSaved={() => {
            setEditingTx(null);
            setSuccessMessage('Transaction updated successfully.');
            fetchTransactions();
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

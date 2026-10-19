import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  Plus,
  Smartphone,
  CreditCard,
  History,
  Building2,
  Banknote,
  Download,
} from 'lucide-react';
import {
  expenseService,
  DebtItem,
  RepaymentItem,
} from '../services/expenseService';
import { RecordRepaymentModal } from '../components/debts/RecordRepaymentModal';

interface DebtsAndDuesProps {
  onOpenAddExpense: () => void;
  refreshTrigger?: number;
}

export const DebtsAndDues: React.FC<DebtsAndDuesProps> = ({
  onOpenAddExpense,
  refreshTrigger,
}) => {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [repayments, setRepayments] = useState<RepaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected debt for repayment modal
  const [activeModalDebt, setActiveModalDebt] = useState<DebtItem | null>(null);

  // Filter & Notification states
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [overviewRes, repaymentsRes] = await Promise.all([
        expenseService.getOverview(),
        expenseService.getRepayments(),
      ]);

      if (overviewRes.data?.debts) {
        setDebts(overviewRes.data.debts);
      }
      if (repaymentsRes.data?.repayments) {
        setRepayments(repaymentsRes.data.repayments);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load debts & dues ledger.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Open modal
  const handleOpenRepaymentModal = (debt: DebtItem) => {
    setActiveModalDebt(debt);
  };

  // Close modal
  const handleCloseModal = () => {
    setActiveModalDebt(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (repayments.length === 0) return;
    const headers = ['Date', 'Counterparty', 'Direction', 'Channel', 'Amount (INR)', 'Previous Balance (INR)', 'New Balance (INR)', 'Memo'];
    const rows = repayments.map((r) => [
      r.date.split('T')[0],
      `"${r.counterpartyName}"`,
      r.isReceivable ? 'Received by You' : 'Paid by You',
      `"${r.channel}"`,
      r.amountInRupees.toFixed(2),
      r.previousBalanceInRupees.toFixed(2),
      r.newBalanceInRupees.toFixed(2),
      `"${r.memo.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BucksBunny_Repayment_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grouped debts
  const owedToMe = useMemo(() => debts.filter((d) => d.isReceivable), [debts]);
  const iOwe = useMemo(() => debts.filter((d) => !d.isReceivable), [debts]);

  const totalOwedToMe = useMemo(
    () => owedToMe.reduce((sum, d) => sum + d.amountInRupees, 0),
    [owedToMe]
  );
  const totalIOwe = useMemo(
    () => iOwe.reduce((sum, d) => sum + d.amountInRupees, 0),
    [iOwe]
  );

  // Filtered repayments
  const filteredRepayments = useMemo(() => {
    if (!filterQuery.trim()) return repayments;
    const q = filterQuery.toLowerCase().trim();
    return repayments.filter(
      (r) =>
        r.counterpartyName.toLowerCase().includes(q) ||
        r.channel.toLowerCase().includes(q) ||
        r.memo.toLowerCase().includes(q)
    );
  }, [repayments, filterQuery]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getChannelIcon = (channel: string) => {
    const lower = channel.toLowerCase();
    if (lower.includes('upi') || lower.includes('google') || lower.includes('phonepe') || lower.includes('paytm')) {
      return <Smartphone className="w-3.5 h-3.5 text-[#059669]" />;
    }
    if (lower.includes('bank') || lower.includes('transfer')) {
      return <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />;
    }
    if (lower.includes('cash')) {
      return <Banknote className="w-3.5 h-3.5 text-[#D97706]" />;
    }
    return <CreditCard className="w-3.5 h-3.5 text-[#4B5563]" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 text-[#111827]">
      {/* Page Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            Debts & Dues
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Settlement ledgers, partial repayments, and mutual audit balance tracking
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddExpense}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-xl text-xs font-semibold text-[#064E3B] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}


      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-xl text-xs text-[#C24141] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#C24141] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Owed to Me */}
        <div className="p-5 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Owed to Me</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Outstanding money friends and colleagues need to return
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#111827]">
              ₹{totalOwedToMe.toFixed(2)}
            </span>
            <div className="mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] px-2 py-0.5 rounded">
                {owedToMe.length} {owedToMe.length === 1 ? 'BALANCE' : 'BALANCES'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: I Owe */}
        <div className="p-5 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">I Owe</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Pending liabilities you need to return
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#DC2626]">
              ₹{totalIOwe.toFixed(2)}
            </span>
            <div className="mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] px-2 py-0.5 rounded">
                {iOwe.length} {iOwe.length === 1 ? 'BALANCE' : 'BALANCES'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Owed to Me */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              RECEIVABLES (OWED TO ME)
            </h4>
            <span className="text-xs font-medium text-[#6B7280]">
              {owedToMe.length} active ledger items
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 bg-white border border-[#CBD5E1] rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-[#064E3B]" />
              <p className="text-xs text-[#6B7280]">Loading ledger balances...</p>
            </div>
          ) : owedToMe.length === 0 ? (
            <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto" />
              <h5 className="text-sm font-bold text-[#111827]">No one owes you money</h5>
              <p className="text-xs text-[#6B7280]">
                All friend shares and split expenses are settled up.
              </p>
            </div>
          ) : (
            owedToMe.map((debt) => {
              const initialAmt = debt.initialAmountInRupees || debt.amountInRupees;
              const paidAmt = debt.totalPaidInRupees || 0;
              const isPartiallyRepaid = paidAmt > 0;
              const percentageRepaid =
                initialAmt > 0 ? Math.min(100, Math.round((paidAmt / initialAmt) * 100)) : 0;

              return (
                <div
                  key={debt.id}
                  className="p-4 sm:p-5 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-3.5 hover:border-[#94A3B8] transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                        {getInitials(debt.debtorName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#111827]">
                            {debt.debtorName}
                          </h4>
                          {isPartiallyRepaid ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              Partially Repaid
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                              Unsettled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Origin: {debt.notes || 'Shared split expense'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                        REMAINING DUE
                      </span>
                      <span className="text-base sm:text-lg font-mono font-extrabold text-[#059669]">
                        ₹{debt.amountInRupees.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Summary context */}
                  <p className="text-xs text-[#4B5563]">
                    {isPartiallyRepaid
                      ? `Original total ₹${initialAmt.toFixed(2)}. Received ₹${paidAmt.toFixed(2)} in partial settlements.`
                      : `Awaiting full settlement of ₹${debt.amountInRupees.toFixed(2)}.`}
                  </p>

                  {/* Progress Bar for Partial Repayment */}
                  {isPartiallyRepaid && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B7280]">
                        <span>Repaid: ₹{paidAmt.toFixed(2)} ({percentageRepaid}%)</span>
                        <span>Total Split: ₹{initialAmt.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden border border-[#E2E8F0]">
                        <div
                          className="h-full bg-[#059669] rounded-full transition-all duration-300"
                          style={{ width: `${percentageRepaid}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-[#6B7280]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {debt.dueDate
                          ? `Due date was ${new Date(debt.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : debt.createdAt
                          ? `Logged ${new Date(debt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'Active standing ledger'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterQuery(debt.debtorName)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#374151] bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <History className="w-3 h-3 text-[#6B7280]" />
                        <span>View History</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRepaymentModal(debt)}
                        className="px-3 py-1 text-xs font-bold text-[#064E3B] bg-[#E8F3EE] hover:bg-[#D5EADB] border border-[#A7D7B9] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-[#064E3B]" />
                        <span>Record Repayment</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (5 cols): I Owe & Guarantee */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              PAYABLES (I OWE)
            </h4>
            <span className="text-xs font-medium text-[#6B7280]">
              {iOwe.length} liabilities
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 bg-white border border-[#CBD5E1] rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-[#064E3B]" />
              <p className="text-xs text-[#6B7280]">Loading pending payables...</p>
            </div>
          ) : iOwe.length === 0 ? (
            <div className="p-8 bg-white border border-[#CBD5E1] rounded-xl text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto" />
              <h5 className="text-sm font-bold text-[#111827]">You owe nothing</h5>
              <p className="text-xs text-[#6B7280]">
                All shared bills you were liable for are settled.
              </p>
            </div>
          ) : (
            iOwe.map((debt) => {
              return (
                <div
                  key={debt.id}
                  className="p-4 sm:p-5 bg-white border border-[#CBD5E1] rounded-xl shadow-xs space-y-3.5 hover:border-[#94A3B8] transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-xs font-bold text-[#DC2626] shrink-0">
                        {getInitials(debt.creditorName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#111827]">
                            {debt.creditorName}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            Unsettled
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Origin: {debt.notes || 'Shared invoice split'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                        YOU PAY
                      </span>
                      <span className="text-base sm:text-lg font-mono font-extrabold text-[#DC2626]">
                        ₹{debt.amountInRupees.toFixed(2)}
                      </span>
                    </div>
                  </div>


                  {/* Actions */}
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterQuery(debt.creditorName)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#374151] bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRepaymentModal(debt)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#064E3B] hover:bg-[#04392B] rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Settle Up / Record Payment</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>

      {/* Repayment Audit Log Section */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-xs overflow-hidden space-y-0">
        {/* Audit Log Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#111827]">
              Repayment Audit Log
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Chronological ledger verification of adjustments and settlements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterBar(!showFilterBar)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showFilterBar || filterQuery
                  ? 'bg-[#E8F3EE] text-[#064E3B] border-[#A7D7B9]'
                  : 'bg-white text-[#374151] border-[#CBD5E1] hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              disabled={repayments.length === 0}
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-[#374151] bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {(showFilterBar || filterQuery) && (
          <div className="p-3 bg-[#F8FAF9] border-b border-[#E2E8F0] flex items-center justify-between gap-3">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter audit log by person name, channel, or memo..."
              className="flex-1 max-w-md px-3 py-1 text-xs font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#064E3B]"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="text-xs text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Audit Log Table */}
        {filteredRepayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] space-y-1">
            <p className="font-semibold text-[#111827]">No repayment records found</p>
            <p>
              {filterQuery
                ? 'No log entries match your filter.'
                : 'Whenever you record a partial or full repayment, chronological audit verification will be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAF9] text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Counterparty</th>
                  <th className="py-3 px-4">Channel / Instrument</th>
                  <th className="py-3 px-4">Audit Impact</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Ledger Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs font-medium">
                {filteredRepayments.map((r) => {
                  const dateStr = new Date(r.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAF9] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-[#6B7280] font-mono">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#111827] whitespace-nowrap">
                        {r.counterpartyName}
                        {!r.isReceivable && (
                          <span className="text-[10px] text-[#6B7280] font-normal ml-1">
                            (Paid by You)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                          {getChannelIcon(r.channel)}
                          <span>{r.channel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#4B5563]">
                        Balance: ₹{r.previousBalanceInRupees.toFixed(2)} →{' '}
                        {r.newBalanceInRupees === 0 ? (
                          <span className="text-[#059669] font-bold">₹0.00 (Settled)</span>
                        ) : (
                          <span className="font-bold text-[#111827]">
                            ₹{r.newBalanceInRupees.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={r.isReceivable ? 'text-[#059669]' : 'text-[#DC2626]'}>
                          {r.isReceivable ? '+' : '-'} ₹{r.amountInRupees.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#4B5563] max-w-xs truncate">
                        {r.memo || 'Settlement'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Audit Guarantee Note */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F8FAF9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6B7280]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#064E3B]">ⓘ</span>
            <span>Recording a repayment updates ledger journals and dues balances without transmitting physical currency.</span>
          </div>
        </div>
      </div>

      {/* Final Form Record Repayment Modal */}
      <RecordRepaymentModal
        isOpen={Boolean(activeModalDebt)}
        debt={activeModalDebt}
        onClose={handleCloseModal}
        onRepaymentSuccess={(msg) => {
          setSuccessToast(msg);
          setTimeout(() => setSuccessToast(null), 5000);
          fetchData();
        }}
      />
    </div>
  );
};

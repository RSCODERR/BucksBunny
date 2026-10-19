import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { expenseService, DebtItem } from '../../services/expenseService';

export interface RecordRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  onRepaymentSuccess: (message: string) => void;
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  onRepaymentSuccess,
}) => {
  const [settlementType, setSettlementType] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [paymentChannel, setPaymentChannel] = useState<string>('UPI Transfer');
  const [repayMemo, setRepayMemo] = useState<string>('');
  const [repayDate, setRepayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form whenever modal opens with a debt
  useEffect(() => {
    if (isOpen && debt) {
      setSettlementType('FULL');
      setRepayAmount(debt.amountInRupees.toFixed(2));
      setPaymentChannel('UPI Transfer');
      const counterparty = debt.isReceivable ? debt.debtorName : debt.creditorName;
      setRepayMemo(
        debt.isReceivable
          ? `Settled full payment from ${counterparty}`
          : `Settled full payment to ${counterparty}`
      );
      setRepayDate(new Date().toISOString().split('T')[0]);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, debt]);

  // Compute live final form
  const calculation = useMemo(() => {
    if (!debt) return null;

    const previousBalance = debt.amountInRupees;
    const amountVal =
      settlementType === 'FULL'
        ? previousBalance
        : parseFloat(repayAmount);

    const validAmount = isNaN(amountVal) || amountVal < 0 ? 0 : amountVal;
    const counterparty = debt.isReceivable ? debt.debtorName : debt.creditorName;

    // Positive means receivable, negative means payable from user perspective
    const currentNet = debt.isReceivable ? previousBalance : -previousBalance;
    // Payment recorded:
    // If receivable (counterparty pays user): user receives payment, so reduces receivable
    // If payable (user pays counterparty): user pays out, so reduces payable
    const finalNet = debt.isReceivable
      ? currentNet - validAmount
      : currentNet + validAmount;

    let finalStatus: 'SETTLED' | 'OWED_TO_USER' | 'USER_OWES' = 'SETTLED';
    let finalTitle = '';
    let finalDescription = '';

    if (Math.abs(finalNet) < 0.005) {
      finalStatus = 'SETTLED';
      finalTitle = 'All Settled Up (₹0.00)';
      finalDescription = 'Neither party owes anything. Account is completely clear.';
    } else if (finalNet > 0) {
      finalStatus = 'OWED_TO_USER';
      finalTitle = `${counterparty} will owe you ₹${finalNet.toFixed(2)}`;
      finalDescription =
        debt.isReceivable && validAmount < previousBalance
          ? `Partial payment recorded. ₹${finalNet.toFixed(2)} remains due.`
          : `Overpayment recorded. Direction reverses to receivable.`;
    } else {
      finalStatus = 'USER_OWES';
      const absNet = Math.abs(finalNet);
      finalTitle = `You will owe ${counterparty} ₹${absNet.toFixed(2)}`;
      finalDescription =
        !debt.isReceivable && validAmount < previousBalance
          ? `Partial payment recorded. ₹${absNet.toFixed(2)} remaining liability.`
          : `Overpayment recorded. Direction reverses to payable liability.`;
    }

    return {
      previousBalance,
      validAmount,
      finalNet,
      finalStatus,
      finalTitle,
      finalDescription,
      counterparty,
    };
  }, [debt, settlementType, repayAmount]);

  if (!isOpen || !debt || !calculation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountToRepay =
      settlementType === 'FULL'
        ? debt.amountInRupees
        : parseFloat(repayAmount);

    if (isNaN(amountToRepay) || amountToRepay <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await expenseService.repayDebt(debt.id, {
        amount: amountToRepay,
        channel: paymentChannel,
        memo: repayMemo.trim() || undefined,
        date: repayDate,
      });

      if (res.data) {
        onRepaymentSuccess(res.data.message);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not record repayment.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-[#CBD5E1] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-[#111827]">
              {debt.isReceivable ? 'Record Received Payment' : 'Record Outgoing Settlement'}
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                debt.isReceivable
                  ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
              }`}
            >
              {debt.isReceivable ? 'Receivable' : 'Payable'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-xs text-[#C24141] flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Ledger Balance Card */}
          <div className="p-3.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                  debt.isReceivable
                    ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                    : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                }`}
              >
                {debt.isReceivable ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">
                  Counterparty
                </span>
                <p className="text-sm font-bold text-[#111827]">{calculation.counterparty}</p>
                <p className="text-[11px] text-[#4B5563]">
                  {debt.isReceivable ? 'Owes you money' : 'You owe this person'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Current Due
              </span>
              <p
                className={`text-lg font-mono font-extrabold ${
                  debt.isReceivable ? 'text-[#059669]' : 'text-[#DC2626]'
                }`}
              >
                ₹{calculation.previousBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Settlement Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Settlement Method
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setSettlementType('FULL');
                  setRepayAmount(debt.amountInRupees.toFixed(2));
                  setRepayMemo(
                    debt.isReceivable
                      ? `Settled full payment from ${calculation.counterparty}`
                      : `Settled full payment to ${calculation.counterparty}`
                  );
                }}
                className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  settlementType === 'FULL'
                    ? 'bg-[#064E3B] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Full Payment (₹{debt.amountInRupees.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettlementType('CUSTOM');
                  setRepayAmount('');
                  setRepayMemo(
                    debt.isReceivable
                      ? `Partial payment from ${calculation.counterparty}`
                      : `Partial payment to ${calculation.counterparty}`
                  );
                }}
                className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  settlementType === 'CUSTOM'
                    ? 'bg-white text-[#064E3B] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Custom / Partial Amount
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Payment Amount (INR) <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-[11px] text-[#6B7280]">
                {settlementType === 'FULL' ? 'Full balance selected' : 'Enter amount received / paid'}
              </span>
            </div>
            <div className="flex items-center px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg focus-within:border-[#064E3B]">
              <span className="text-xl font-bold font-mono text-[#111827] mr-2">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus={settlementType === 'CUSTOM'}
                readOnly={settlementType === 'FULL'}
                value={settlementType === 'FULL' ? debt.amountInRupees.toFixed(2) : repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-xl font-bold font-mono text-[#111827] focus:outline-none bg-transparent"
              />
            </div>
          </div>

          {/* THE FINAL FORM LIVE DISPLAY */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              calculation.finalStatus === 'SETTLED'
                ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                : calculation.finalStatus === 'OWED_TO_USER'
                ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                : 'bg-[#FEF2F2] border-[#FECACA]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    calculation.finalStatus === 'USER_OWES' ? 'text-[#DC2626]' : 'text-[#059669]'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Final Standing Breakdown
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                  calculation.finalStatus === 'SETTLED'
                    ? 'bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7]'
                    : calculation.finalStatus === 'OWED_TO_USER'
                    ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                    : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                }`}
              >
                {calculation.finalStatus === 'SETTLED'
                  ? 'All Settled'
                  : calculation.finalStatus === 'OWED_TO_USER'
                  ? 'Receivable'
                  : 'Payable'}
              </span>
            </div>

            {/* Stepped calculation */}
            <div className="space-y-1 text-xs text-[#374151] pb-2 border-b border-black/10">
              <div className="flex items-center justify-between">
                <span>Previous balance:</span>
                <span className="font-mono font-semibold">
                  {debt.isReceivable
                    ? `${calculation.counterparty} owes ₹${calculation.previousBalance.toFixed(2)}`
                    : `You owe ${calculation.counterparty} ₹${calculation.previousBalance.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment recorded:</span>
                <span className="font-mono font-bold text-[#064E3B]">
                  - ₹{calculation.validAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Resulting Final Form */}
            <div className="pt-2 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] block">
                  RESULTING FINAL FORM
                </span>
                <p className="text-sm font-extrabold text-[#111827] mt-0.5">
                  {calculation.finalTitle}
                </p>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  {calculation.finalDescription}
                </p>
              </div>
              {calculation.finalStatus === 'SETTLED' && (
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-1" />
              )}
            </div>
          </div>

          {/* Payment Channel & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                Payment Channel
              </label>
              <select
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value)}
                className="w-full p-2 text-xs font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
              >
                <option value="UPI Transfer">UPI Transfer</option>
                <option value="Google Pay">Google Pay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Paytm">Paytm</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                Settlement Date
              </label>
              <input
                type="date"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
                className="w-full p-2 text-xs font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
              />
            </div>
          </div>

          {/* Memo / Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
              Audit Memo (Notes)
            </label>
            <input
              type="text"
              maxLength={120}
              value={repayMemo}
              onChange={(e) => setRepayMemo(e.target.value)}
              placeholder="e.g. Settled full balance via Google Pay"
              className="w-full px-3 py-2 text-xs font-semibold text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#CBD5E1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculation.validAmount <= 0}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#04392B] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {settlementType === 'FULL'
                      ? `Confirm Full Settlement (₹${debt.amountInRupees.toFixed(2)})`
                      : `Confirm Repayment (₹${calculation.validAmount.toFixed(2)})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

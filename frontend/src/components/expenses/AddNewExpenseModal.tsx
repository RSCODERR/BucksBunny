import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Store,
  Calendar,
  Utensils,
  CreditCard,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Trash2,
} from 'lucide-react';
import {
  expenseService,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  ExpenseCategory,
  PaymentMethod,
  calculateEqualSplitInPaise,
  ExpenseData,
} from '../../services/expenseService';

export interface ParticipantItem {
  id: string;
  name: string;
  isCurrentUser: boolean;
  selected: boolean;
  customRupees: string;
  percentage: string;
}

interface AddNewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved?: (expense: ExpenseData) => void;
  currentUser?: { username?: string; email?: string } | null;
}

export const AddNewExpenseModal: React.FC<AddNewExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  currentUser,
}) => {
  const currentUserName = currentUser?.username || currentUser?.email?.split('@')[0] || 'You';

  // Base Transaction Fields
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [tags, setTags] = useState<string[]>(['#dinner', '#friends']);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);

  // Split Expense Section
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [payerType, setPayerType] = useState<'YOU' | 'OTHER'>('YOU');
  const [otherPayerId, setOtherPayerId] = useState<string>('p1');
  const [allocationRule, setAllocationRule] = useState<'EQUAL' | 'CUSTOM' | 'PERCENTAGE'>('EQUAL');

  const [participants, setParticipants] = useState<ParticipantItem[]>([
    {
      id: 'current_user',
      name: `You (${currentUserName})`,
      isCurrentUser: true,
      selected: true,
      customRupees: '',
      percentage: '33.3',
    },
    {
      id: 'p1',
      name: 'Rahul Verma',
      isCurrentUser: false,
      selected: true,
      customRupees: '',
      percentage: '33.3',
    },
    {
      id: 'p2',
      name: 'Aman Gupta',
      isCurrentUser: false,
      selected: true,
      customRupees: '',
      percentage: '33.4',
    },
  ]);

  const [newPersonName, setNewPersonName] = useState<string>('');
  const [isAddingPerson, setIsAddingPerson] = useState<boolean>(false);

  // Interaction & Validation States
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync current user name if updated
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.isCurrentUser ? { ...p, name: `You (${currentUserName})` } : p
      )
    );
  }, [currentUserName]);

  // Track if user made edits
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Selected participants
  const selectedParticipants = useMemo(
    () => participants.filter((p) => p.selected),
    [participants]
  );

  // Amount in integer paise
  const totalPaise = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amount]);

  // Equal split calculations
  const equalSharesInPaise = useMemo(() => {
    if (totalPaise <= 0 || selectedParticipants.length === 0) return [];
    return calculateEqualSplitInPaise(totalPaise, selectedParticipants.length);
  }, [totalPaise, selectedParticipants]);

  // Calculate participant allocations
  const calculatedShares = useMemo(() => {
    return selectedParticipants.map((p, idx) => {
      let sharePaise = 0;
      if (allocationRule === 'EQUAL') {
        sharePaise = equalSharesInPaise[idx] || 0;
      } else if (allocationRule === 'CUSTOM') {
        const customNum = parseFloat(p.customRupees);
        sharePaise = !isNaN(customNum) && customNum > 0 ? Math.round(customNum * 100) : 0;
      } else if (allocationRule === 'PERCENTAGE') {
        const pct = parseFloat(p.percentage);
        if (!isNaN(pct) && pct > 0 && totalPaise > 0) {
          sharePaise = Math.round((totalPaise * pct) / 100);
        }
      }
      return {
        ...p,
        sharePaise,
        shareRupees: sharePaise / 100,
      };
    });
  }, [selectedParticipants, allocationRule, equalSharesInPaise, totalPaise]);

  const allocatedTotalPaise = useMemo(() => {
    return calculatedShares.reduce((sum, item) => sum + item.sharePaise, 0);
  }, [calculatedShares]);

  const totalPercentage = useMemo(() => {
    return selectedParticipants.reduce((sum, item) => {
      const val = parseFloat(item.percentage);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [selectedParticipants]);

  const allocationDifferencePaise = totalPaise - allocatedTotalPaise;

  // Tag actions
  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^#+/, '');
    if (clean && !tags.includes(`#${clean}`)) {
      setTags((prev) => [...prev, `#${clean}`]);
      markDirty();
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
    markDirty();
  };

  // Participant actions
  const handleToggleParticipant = (id: string) => {
    setParticipants((prev) => {
      const countSelected = prev.filter((p) => p.selected).length;
      return prev.map((p) => {
        if (p.id === id) {
          // Prevent unchecking if it's the last selected participant
          if (p.selected && countSelected <= 1) return p;
          return { ...p, selected: !p.selected };
        }
        return p;
      });
    });
    markDirty();
  };

  const handleCustomRupeesChange = (id: string, val: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, customRupees: val } : p))
    );
    markDirty();
  };

  const handlePercentageChange = (id: string, val: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, percentage: val } : p))
    );
    markDirty();
  };

  const handleAddPerson = () => {
    const name = newPersonName.trim();
    if (!name) return;
    const newId = `p_${Date.now()}`;
    setParticipants((prev) => [
      ...prev,
      {
        id: newId,
        name,
        isCurrentUser: false,
        selected: true,
        customRupees: '',
        percentage: '0',
      },
    ]);
    setNewPersonName('');
    setIsAddingPerson(false);
    markDirty();
  };

  const handleRemovePerson = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    if (otherPayerId === id) {
      setOtherPayerId('p1');
    }
    markDirty();
  };

  // Reset form
  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setCategory('Food & Dining');
    setPaymentMethod('UPI');
    setTags(['#dinner', '#friends']);
    setIsSplit(false);
    setPayerType('YOU');
    setAllocationRule('EQUAL');
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, customRupees: '', percentage: '33.3', selected: true }))
    );
    setErrors({});
    setServerError(null);
    setIsDirty(false);
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount.trim()) {
      newErrors.amount = 'Amount is required.';
    } else {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) {
        newErrors.amount = 'Enter a valid amount greater than zero.';
      }
    }

    if (!title.trim() && !merchant.trim()) {
      newErrors.title = 'Please provide a title or merchant for this expense.';
    }

    if (isSplit) {
      if (selectedParticipants.length < 2) {
        newErrors.split = 'A split expense must have at least 2 selected participants.';
      }

      if (totalPaise <= 0) {
        newErrors.amount = 'Enter an amount before configuring the split.';
      } else if (allocationRule === 'CUSTOM') {
        if (allocationDifferencePaise !== 0) {
          const diffStr = (Math.abs(allocationDifferencePaise) / 100).toFixed(2);
          if (allocationDifferencePaise > 0) {
            newErrors.split = `Shares are underallocated by ₹${diffStr}. Exact match required.`;
          } else {
            newErrors.split = `Shares exceed total expense by ₹${diffStr}. Exact match required.`;
          }
        }
      } else if (allocationRule === 'PERCENTAGE') {
        if (Math.abs(totalPercentage - 100) > 0.01) {
          newErrors.split = `Percentages must sum to exactly 100%. Current total: ${totalPercentage.toFixed(1)}%.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (shouldAddAnother: boolean = false) => {
    setServerError(null);
    setSuccessBanner(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const expenseTitle = title.trim() || merchant.trim() || 'Expense';

      let splitPayload = undefined;
      if (isSplit) {
        const resolvedPayerName =
          payerType === 'YOU'
            ? `You (${currentUserName})`
            : participants.find((p) => p.id === otherPayerId)?.name || 'Someone else';

        splitPayload = {
          payerType,
          payerName: resolvedPayerName,
          allocationRule,
          participants: calculatedShares.map((p) => ({
            name: p.name,
            isCurrentUser: p.isCurrentUser,
            shareInPaise: p.sharePaise,
            percentage: allocationRule === 'PERCENTAGE' ? parseFloat(p.percentage) : undefined,
          })),
        };
      }

      const response = await expenseService.createExpense({
        amount: parseFloat(amount),
        title: expenseTitle,
        category,
        date,
        time,
        paymentMethod,
        merchant: merchant.trim() || undefined,
        notes: title.trim() ? title.trim() : undefined,
        tags: tags.length > 0 ? tags : undefined,
        isSplit,
        splitDetails: splitPayload,
      });

      const saved = response.data?.expense;
      if (saved) {
        if (onExpenseSaved) {
          onExpenseSaved(saved);
        }

        if (shouldAddAnother) {
          setSuccessBanner(`Saved ₹${saved.amountInRupees.toFixed(2)} for "${saved.title}". Ready for next.`);
          resetForm();
          setTimeout(() => setSuccessBanner(null), 4000);
        } else {
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save expense. Please try again.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Close with dirty check
  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Helper for Initials
  const getInitials = (name: string) => {
    const parts = name.replace(/^You \((.*)\)$/, '$1').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
      {/* Modal Dialog Card */}
      <div className="w-full max-w-[620px] max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl border border-[#E1E6E1] overflow-hidden text-[#17211D]">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E1E6E1] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <h2 id="modal-title" className="text-xl font-bold tracking-tight text-[#17211D]">
              Add New Expense
            </h2>
            <span className="text-[11px] font-bold tracking-wider text-[#064E3B] bg-[#E8F5EC] border border-[#C7E9D5] px-2 py-0.5 rounded-[4px] uppercase select-none">
              JOURNAL DRAFT
            </span>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            aria-label="Close modal"
            className="p-1.5 text-[#66716B] hover:text-[#17211D] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="p-3 bg-[#FDF2F2] border border-[#F3B7B7] rounded-md text-sm text-[#C24141] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-[#C24141]" />
              <div className="flex-1">
                <p className="font-semibold">Unable to save expense</p>
                <p className="mt-0.5 text-[#66716B]">{serverError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successBanner && (
            <div
              role="status"
              className="p-3 bg-[#E8F5EC] border border-[#A6DEC0] rounded-md text-sm text-[#064E3B] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-[#16A765]" />
              <p className="font-medium">{successBanner}</p>
            </div>
          )}

          {/* Row 1: Amount & Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-amount-input"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                TOTAL AMOUNT (INR) <span className="text-[#C24141]">*</span>
              </label>
              <div
                className={`flex items-baseline px-3.5 py-2.5 bg-white border rounded-lg transition-all focus-within:ring-1 ${
                  errors.amount
                    ? 'border-[#C24141] focus-within:border-[#C24141] focus-within:ring-[#C24141]'
                    : 'border-[#E1E6E1] focus-within:border-[#16A765] focus-within:ring-[#16A765]'
                }`}
              >
                <span className="text-2xl font-bold text-[#17211D] mr-1.5 select-none font-mono">
                  ₹
                </span>
                <input
                  id="expense-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isLoading}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    markDirty();
                    if (errors.amount) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.amount;
                        return copy;
                      });
                    }
                  }}
                  placeholder="2,400.00"
                  className="w-full text-2xl font-bold font-mono text-[#17211D] placeholder:text-neutral-300 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs text-[#66716B]">
                {isSplit ? 'Shared ledger split allocation' : 'Single ledger charge'}
              </p>
              {errors.amount && (
                <p className="text-xs text-[#C24141] font-medium">{errors.amount}</p>
              )}
            </div>

            {/* Merchant / Payee Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-merchant-input"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                MERCHANT OR PAYEE
              </label>
              <div className="flex items-center gap-2 px-3.5 py-3 bg-white border border-[#E1E6E1] rounded-lg focus-within:border-[#16A765] focus-within:ring-1 focus-within:ring-[#16A765] transition-all">
                <Store className="w-4 h-4 text-[#66716B] shrink-0" />
                <input
                  id="expense-merchant-input"
                  type="text"
                  maxLength={100}
                  disabled={isLoading}
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. The Fatty Bao"
                  className="w-full text-base font-semibold text-[#17211D] placeholder:text-neutral-400 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs text-[#66716B]">Payee name or transaction party</p>
            </div>
          </div>

          {/* Row 2: Timestamp, Category Classification, Source Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Timestamp */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-date-input"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                TRANSACTION TIMESTAMP
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E1E6E1] rounded-lg focus-within:border-[#16A765] focus-within:ring-1 focus-within:ring-[#16A765]">
                <Calendar className="w-4 h-4 text-[#66716B] shrink-0" />
                <input
                  id="expense-date-input"
                  type="date"
                  disabled={isLoading}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    markDirty();
                  }}
                  className="w-full text-xs font-medium text-[#17211D] bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-category-select"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                CATEGORY CLASSIFICATION
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E1E6E1] rounded-lg focus-within:border-[#16A765] focus-within:ring-1 focus-within:ring-[#16A765]">
                <Utensils className="w-4 h-4 text-[#66716B] shrink-0" />
                <select
                  id="expense-category-select"
                  disabled={isLoading}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ExpenseCategory);
                    markDirty();
                  }}
                  className="w-full text-xs font-medium text-[#17211D] bg-transparent focus:outline-none cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method / Source Account */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-source-select"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                SOURCE ACCOUNT
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E1E6E1] rounded-lg focus-within:border-[#16A765] focus-within:ring-1 focus-within:ring-[#16A765]">
                <CreditCard className="w-4 h-4 text-[#66716B] shrink-0" />
                <select
                  id="expense-source-select"
                  disabled={isLoading}
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as PaymentMethod);
                    markDirty();
                  }}
                  className="w-full text-xs font-medium text-[#17211D] bg-transparent focus:outline-none cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Description & Accounting Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Description & Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-description-input"
                className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase"
              >
                DESCRIPTION & NOTES
              </label>
              <input
                id="expense-description-input"
                type="text"
                maxLength={100}
                disabled={isLoading}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                  if (errors.title) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.title;
                      return copy;
                    });
                  }
                }}
                placeholder="Dinner with college friends"
                className="w-full px-3.5 py-2.5 text-sm text-[#17211D] placeholder:text-neutral-400 bg-white border border-[#E1E6E1] rounded-lg focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]"
              />
              {errors.title && (
                <p className="text-xs text-[#C24141] font-medium">{errors.title}</p>
              )}
            </div>

            {/* Accounting Tags */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#66716B] tracking-wider uppercase">
                ACCOUNTING TAGS
              </label>
              <div className="flex flex-wrap items-center gap-2 min-h-[42px] p-1.5 bg-white border border-[#E1E6E1] rounded-lg">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#064E3B] bg-[#E8F5EC] border border-[#C7E9D5] rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#064E3B]/70 hover:text-[#C24141] ml-0.5 cursor-pointer"
                      title="Remove tag"
                    >
                      &times;
                    </button>
                  </span>
                ))}

                {isAddingTag ? (
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      maxLength={20}
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        } else if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagInput('');
                        }
                      }}
                      placeholder="tag"
                      className="w-20 px-1.5 py-0.5 text-xs border border-[#16A765] rounded focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="text-xs text-[#064E3B] font-semibold hover:underline"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#66716B] hover:text-[#064E3B] px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD TAG</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mandatory Split Section */}
          <div className="bg-[#F0F7F2] border border-[#D1EAD9] rounded-xl p-4 sm:p-5 space-y-4">
            {/* Split Toggle Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSplit}
                  onClick={() => {
                    setIsSplit(!isSplit);
                    markDirty();
                  }}
                  className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none cursor-pointer ${
                    isSplit ? 'bg-[#064E3B]' : 'bg-[#D1D9D3]'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 bg-white rounded-full shadow-xs transform transition-transform absolute top-0.75 ${
                      isSplit ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="font-bold text-sm text-[#17211D]">
                    Split this expense with others
                  </p>
                  <p className="text-xs text-[#526359]">
                    Divide balance and allocate ledger debt receivables automatically
                  </p>
                </div>
              </div>

              {isSplit && (
                <span className="hidden sm:inline-block text-[11px] font-bold text-[#064E3B] bg-white border border-[#C1DFCD] px-2.5 py-1 rounded-[4px] uppercase tracking-wide">
                  Shared Ledger Active
                </span>
              )}
            </div>

            {/* Split Details Body */}
            {isSplit && (
              <div className="space-y-4 pt-2 border-t border-[#D9ECE0]">
                {/* Payer Selection */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#17211D]">
                      Who paid up front?
                    </span>
                    <div className="inline-flex p-0.5 bg-white border border-[#CDE5D6] rounded-md">
                      <button
                        type="button"
                        onClick={() => {
                          setPayerType('YOU');
                          markDirty();
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          payerType === 'YOU'
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'text-[#526359] hover:text-[#17211D]'
                        }`}
                      >
                        You paid the full amount {totalPaise > 0 ? `(₹${(totalPaise / 100).toFixed(2)})` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPayerType('OTHER');
                          markDirty();
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          payerType === 'OTHER'
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'text-[#526359] hover:text-[#17211D]'
                        }`}
                      >
                        Someone else paid
                      </button>
                    </div>
                  </div>

                  {payerType === 'OTHER' && (
                    <div className="flex items-center gap-2 p-2.5 bg-white border border-[#CDE5D6] rounded-lg text-xs">
                      <span className="font-medium text-[#526359]">Select Payer:</span>
                      <select
                        value={otherPayerId}
                        onChange={(e) => {
                          setOtherPayerId(e.target.value);
                          markDirty();
                        }}
                        className="flex-1 p-1 font-semibold text-[#17211D] bg-neutral-50 border border-[#E1E6E1] rounded focus:outline-none"
                      >
                        {participants
                          .filter((p) => !p.isCurrentUser)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Allocation Rule Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#526359] tracking-wider uppercase">
                    ALLOCATION RULE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationRule('EQUAL');
                        markDirty();
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                        allocationRule === 'EQUAL'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#526359] border-[#CDE5D6] hover:bg-[#E8F4EC]'
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationRule('CUSTOM');
                        markDirty();
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                        allocationRule === 'CUSTOM'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#526359] border-[#CDE5D6] hover:bg-[#E8F4EC]'
                      }`}
                    >
                      Custom / Unequal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationRule('PERCENTAGE');
                        markDirty();
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                        allocationRule === 'PERCENTAGE'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#526359] border-[#CDE5D6] hover:bg-[#E8F4EC]'
                      }`}
                    >
                      Percentages
                    </button>
                  </div>
                </div>

                {/* Participant Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-[#D1EAD9] text-[11px] font-bold text-[#526359] tracking-wider uppercase">
                    <span>PARTICIPANT</span>
                    <span>INDIVIDUAL SHARE</span>
                  </div>

                  <div className="space-y-2.5">
                    {participants.map((p) => {
                      const shareObj = calculatedShares.find((cs) => cs.id === p.id);
                      const shareRupees = shareObj ? shareObj.shareRupees : 0;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            p.selected
                              ? 'bg-white border-[#CDE5D6]'
                              : 'bg-neutral-50/70 border-transparent opacity-60'
                          }`}
                        >
                          {/* Left: Checkbox + Avatar + Name */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={p.selected}
                              onChange={() => handleToggleParticipant(p.id)}
                              className="w-4 h-4 text-[#064E3B] accent-[#064E3B] rounded cursor-pointer"
                            />
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                p.isCurrentUser
                                  ? 'bg-[#16A765] text-white'
                                  : 'bg-[#526359] text-white'
                              }`}
                            >
                              {getInitials(p.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#17211D]">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-[#66716B]">
                                {p.isCurrentUser
                                  ? 'Settles automatically from primary account'
                                  : payerType === 'YOU'
                                  ? 'Owed to you'
                                  : p.id === otherPayerId
                                  ? 'Paid upfront'
                                  : 'Shared participant'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Share Controls */}
                          <div className="text-right">
                            {allocationRule === 'EQUAL' && (
                              <div>
                                <p className="text-sm font-bold font-mono text-[#17211D]">
                                  ₹ {p.selected ? shareRupees.toFixed(2) : '0.00'}
                                </p>
                                <p className="text-[10px] text-[#66716B]">
                                  {p.isCurrentUser ? 'Your cost' : 'Calculated share'}
                                </p>
                              </div>
                            )}

                            {allocationRule === 'CUSTOM' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-[#66716B]">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={!p.selected}
                                  value={p.customRupees}
                                  onChange={(e) => handleCustomRupeesChange(p.id, e.target.value)}
                                  placeholder={p.selected ? '0.00' : '-'}
                                  className="w-24 px-2 py-1 text-sm font-mono font-bold text-right text-[#17211D] bg-white border border-[#CDE5D6] rounded focus:outline-none focus:border-[#16A765]"
                                />
                              </div>
                            )}

                            {allocationRule === 'PERCENTAGE' && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    disabled={!p.selected}
                                    value={p.percentage}
                                    onChange={(e) => handlePercentageChange(p.id, e.target.value)}
                                    placeholder="0"
                                    className="w-16 px-2 py-1 text-xs font-mono font-bold text-right text-[#17211D] bg-white border border-[#CDE5D6] rounded focus:outline-none focus:border-[#16A765]"
                                  />
                                  <span className="text-xs text-[#66716B] font-semibold">%</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-[#17211D] min-w-[65px] text-right">
                                  ₹ {shareRupees.toFixed(2)}
                                </span>
                              </div>
                            )}

                            {/* Remove participant button for added persons */}
                            {!p.isCurrentUser && participants.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePerson(p.id)}
                                className="text-neutral-400 hover:text-[#C24141] p-1 rounded transition-colors cursor-pointer inline-flex items-center ml-2"
                                title="Remove participant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Person Inline Control */}
                  <div className="pt-2 flex items-center justify-between">
                    {isAddingPerson ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          autoFocus
                          maxLength={50}
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPerson();
                            } else if (e.key === 'Escape') {
                              setIsAddingPerson(false);
                              setNewPersonName('');
                            }
                          }}
                          placeholder="Enter person name"
                          className="flex-1 px-3 py-1.5 text-xs border border-[#16A765] rounded-md focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddPerson}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#064E3B] rounded-md hover:bg-[#04392B] cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPerson(false);
                            setNewPersonName('');
                          }}
                          className="px-2 py-1.5 text-xs text-[#66716B] hover:text-[#17211D] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingPerson(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#064E3B] hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add Person to Split</span>
                      </button>
                    )}

                    {/* Balance Indicator for Custom / Percentage */}
                    {allocationRule === 'CUSTOM' && totalPaise > 0 && (
                      <span
                        className={`text-xs font-mono font-semibold ${
                          allocationDifferencePaise === 0
                            ? 'text-[#064E3B]'
                            : 'text-[#C24141]'
                        }`}
                      >
                        {allocationDifferencePaise === 0
                          ? 'Total matches exact amount'
                          : allocationDifferencePaise > 0
                          ? `Remaining: ₹${(allocationDifferencePaise / 100).toFixed(2)}`
                          : `Excess: ₹${(Math.abs(allocationDifferencePaise) / 100).toFixed(2)}`}
                      </span>
                    )}

                    {allocationRule === 'PERCENTAGE' && (
                      <span
                        className={`text-xs font-mono font-semibold ${
                          Math.abs(totalPercentage - 100) < 0.01
                            ? 'text-[#064E3B]'
                            : 'text-[#C24141]'
                        }`}
                      >
                        Total: {totalPercentage.toFixed(1)}% / 100%
                      </span>
                    )}
                  </div>

                  {errors.split && (
                    <p className="text-xs text-[#C24141] font-medium pt-1">
                      {errors.split}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 sm:py-3.5 bg-white border-t border-[#E1E6E1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm font-semibold text-[#66716B] hover:text-[#17211D] px-3 py-2 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-[#064E3B] bg-[#F4F9F5] border border-[#CDE5D6] hover:bg-[#E8F4EC] rounded-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              Save and Add Another
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2 text-sm font-semibold text-white bg-[#064E3B] hover:bg-[#04392B] rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Expense</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div
          role="alertdialog"
          aria-labelledby="discard-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="bg-white border border-[#E1E6E1] rounded-lg shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 id="discard-title" className="text-lg font-bold text-[#17211D]">
              Discard unsaved changes?
            </h3>
            <p className="text-sm text-[#66716B]">
              You have unsaved changes in this expense form. Discarding will lose these changes.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#66716B] hover:text-[#17211D] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C24141] hover:bg-[#A93232] rounded-md transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

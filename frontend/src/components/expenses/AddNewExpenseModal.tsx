import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Store,
  Calendar,
  Utensils,
  CreditCard,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Trash2,
  ShoppingBag,
  ShieldCheck,
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
import { peopleService, PersonItem } from '../../services/peopleService';

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
  expenseToEdit?: any | null;
}

export const AddNewExpenseModal: React.FC<AddNewExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  currentUser,
  expenseToEdit,
}) => {
  const currentUserName = currentUser?.username || currentUser?.email?.split('@')[0] || 'You';

  // Base Transaction Fields
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [item, setItem] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  // Split Expense Section
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [payerType, setPayerType] = useState<'YOU' | 'OTHER'>('YOU');
  const [otherPayerId, setOtherPayerId] = useState<string>('');
  const [allocationRule, setAllocationRule] = useState<'EQUAL' | 'CUSTOM' | 'PERCENTAGE'>('EQUAL');

  // Default participants list contains ONLY the current user (no hardcoded names)
  const [participants, setParticipants] = useState<ParticipantItem[]>([
    {
      id: 'current_user',
      name: `You (${currentUserName})`,
      isCurrentUser: true,
      selected: true,
      customRupees: '',
      percentage: '100',
    },
  ]);

  const [newPersonName, setNewPersonName] = useState<string>('');
  const [isAddingPerson, setIsAddingPerson] = useState<boolean>(false);
  const [savedPeople, setSavedPeople] = useState<PersonItem[]>([]);

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

  // Live projected Final Form standing for all counterparty participants
  const participantFinalForms = useMemo(() => {
    const currentUserShare = calculatedShares.find((p) => p.isCurrentUser);
    const personalExpenseInRupees = currentUserShare ? currentUserShare.shareRupees : 0;

    return participants
      .filter((p) => !p.isCurrentUser)
      .map((p) => {
        const shareObj = calculatedShares.find((cs) => cs.id === p.id);
        const shareRupees = p.selected && shareObj ? shareObj.shareRupees : 0;

        const savedPerson = savedPeople.find(
          (sp) => sp.name.toLowerCase().trim() === p.name.toLowerCase().trim()
        );

        const hasPreviousDebt = Boolean(savedPerson && savedPerson.hasActiveDebt);
        const previousNet = hasPreviousDebt
          ? (savedPerson!.isReceivable ? savedPerson!.balanceInRupees : -savedPerson!.balanceInRupees)
          : 0;

        let impact = 0;
        if (payerType === 'YOU') {
          // You paid total; participant owes you their individual share
          impact = shareRupees;
        } else if (payerType === 'OTHER') {
          if (p.id === otherPayerId) {
            // This participant paid total; you owe them your personal share
            impact = -personalExpenseInRupees;
          } else {
            // Another party paid; no direct new debt between you and this participant
            impact = 0;
          }
        }

        const projectedNet = previousNet + impact;
        return {
          id: p.id,
          name: p.name,
          hasPreviousDebt,
          previousNet,
          impact,
          projectedNet,
          isSettled: Math.abs(projectedNet) < 0.005,
        };
      });
  }, [participants, calculatedShares, savedPeople, payerType, otherPayerId]);

  // Participant actions
  const handleToggleParticipant = (id: string) => {
    setParticipants((prev) => {
      const countSelected = prev.filter((p) => p.selected).length;
      return prev.map((p) => {
        if (p.id === id) {
          // Prevent unchecking if it is the only selected participant
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

  // Reset form completely so no stale values linger
  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setItem('');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setCategory('Food & Dining');
    setPaymentMethod('UPI');
    setIsSplit(false);
    setPayerType('YOU');
    setOtherPayerId('');
    setAllocationRule('EQUAL');
    setParticipants([
      {
        id: 'current_user',
        name: `You (${currentUserName})`,
        isCurrentUser: true,
        selected: true,
        customRupees: '',
        percentage: '100',
      },
    ]);
    setNewPersonName('');
    setIsAddingPerson(false);
    setErrors({});
    setServerError(null);
    setSuccessBanner(null);
    setIsDirty(false);
    setShowDiscardConfirm(false);
  };

  // Whenever modal opens, guarantee it is 100% fresh or prefilled from expenseToEdit
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        // Prefill values from existing expense
        const exp = expenseToEdit.rawExpense || expenseToEdit;
        const amt = exp.amountInRupees !== undefined
          ? String(exp.amountInRupees)
          : (exp.totalAmountInRupees !== undefined
              ? String(exp.totalAmountInRupees)
              : (exp.amountInPaise ? (exp.amountInPaise / 100).toFixed(2) : ''));
        setAmount(amt);
        setMerchant(exp.merchant || '');
        setItem(exp.item || '');
        setTitle(exp.notes || exp.title || '');
        if (exp.date) {
          try {
            setDate(new Date(exp.date).toISOString().split('T')[0]);
          } catch {
            setDate(new Date().toISOString().split('T')[0]);
          }
        }
        if (exp.time) {
          setTime(exp.time);
        }
        if (exp.category) {
          setCategory(exp.category as ExpenseCategory);
        }
        if (exp.paymentMethod) {
          setPaymentMethod(exp.paymentMethod as PaymentMethod);
        }

        const isExpSplit = Boolean(exp.isSplit);
        setIsSplit(isExpSplit);

        if (isExpSplit && exp.splitDetails) {
          const sd = exp.splitDetails;
          setPayerType(sd.payerType === 'YOU' ? 'YOU' : 'OTHER');
          setAllocationRule(sd.allocationRule === 'EXACT' ? 'CUSTOM' : (sd.allocationRule || 'EQUAL'));

          if (Array.isArray(sd.participants) && sd.participants.length > 0) {
            const parts: ParticipantItem[] = sd.participants.map((p: any, idx: number) => {
              const isMe = Boolean(p.isCurrentUser || p.name?.toLowerCase().startsWith('you'));
              const shareRupees = p.shareInPaise ? (p.shareInPaise / 100).toFixed(2) : (p.shareInRupees ? String(p.shareInRupees) : '');
              return {
                id: isMe ? 'current_user' : `participant_${idx}_${p.name}`,
                name: isMe ? `You (${currentUserName})` : p.name,
                isCurrentUser: isMe,
                selected: true,
                customRupees: shareRupees,
                percentage: p.percentage ? String(p.percentage) : '',
              };
            });
            setParticipants(parts);

            if (sd.payerType !== 'YOU') {
              const matchPayer = parts.find((p) => p.name.toLowerCase() === (sd.payerName || '').toLowerCase());
              if (matchPayer) {
                setOtherPayerId(matchPayer.id);
              }
            }
          }
        }
        setErrors({});
        setServerError(null);
        setSuccessBanner(null);
        setIsDirty(false);
      } else {
        resetForm();
      }

      peopleService
        .getPeople()
        .then((res) => {
          if (res.data?.people) {
            setSavedPeople(res.data.people);
          }
        })
        .catch(() => {
          // ignore error
        });
    }
  }, [isOpen, expenseToEdit, currentUserName]);

  const handleAddPerson = (nameOverride?: string) => {
    const raw = typeof nameOverride === 'string' ? nameOverride : newPersonName;
    const name = raw.trim();
    if (!name) return;

    // Check if participant is already added
    const alreadyAdded = participants.some(
      (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (alreadyAdded) {
      setNewPersonName('');
      setIsAddingPerson(false);
      return;
    }

    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setParticipants((prev) => {
      const updated = [
        ...prev,
        {
          id: newId,
          name,
          isCurrentUser: false,
          selected: true,
          customRupees: '',
          percentage: '0',
        },
      ];
      // Automatically set as other payer if none selected yet
      if (!otherPayerId) {
        setOtherPayerId(newId);
      }
      return updated;
    });
    setNewPersonName('');
    setIsAddingPerson(false);
    markDirty();
  };

  const handleRemovePerson = (id: string) => {
    setParticipants((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (otherPayerId === id) {
        const nextOther = remaining.find((p) => !p.isCurrentUser);
        setOtherPayerId(nextOther ? nextOther.id : '');
      }
      return remaining;
    });
    markDirty();
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

    if (!merchant.trim()) {
      newErrors.merchant = 'Merchant or payee name is required.';
    }

    if (!item.trim()) {
      newErrors.item = 'Item spent on is required.';
    }

    if (isSplit) {
      if (selectedParticipants.length < 2) {
        newErrors.split = 'A split expense requires at least 2 participants. Please add people below.';
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
      const expenseTitle = item.trim() || merchant.trim() || title.trim() || 'Expense';

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

      let response;
      const existingId = expenseToEdit?.rawId || expenseToEdit?.id;
      if (existingId) {
        response = await expenseService.updateExpense(existingId, {
          amount: parseFloat(amount),
          title: expenseTitle,
          category,
          date,
          time,
          paymentMethod,
          merchant: merchant.trim(),
          item: item.trim(),
          notes: title.trim() ? title.trim() : undefined,
          isSplit,
          splitDetails: splitPayload,
        });
      } else {
        response = await expenseService.createExpense({
          amount: parseFloat(amount),
          title: expenseTitle,
          category,
          date,
          time,
          paymentMethod,
          merchant: merchant.trim(),
          item: item.trim(),
          notes: title.trim() ? title.trim() : undefined,
          isSplit,
          splitDetails: splitPayload,
        });
      }

      const saved = response.data?.expense;
      if (saved) {
        if (onExpenseSaved) {
          onExpenseSaved(saved);
        }

        if (shouldAddAnother) {
          setSuccessBanner(`Saved ₹${saved.amountInRupees.toFixed(2)} for "${saved.title}". Ready for next entry.`);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
      {/* Modal Dialog Card with Crisp, High-Contrast Borders */}
      <div className="w-full max-w-[640px] max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl border border-[#94A3B8]/60 overflow-hidden text-[#111827]">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4.5 border-b border-[#CBD5E1] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 id="modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <span className="text-xs font-bold tracking-wider text-[#064E3B] bg-[#E8F5EC] border border-[#A6DEC0] px-2.5 py-0.5 rounded-[4px] uppercase select-none">
              {expenseToEdit ? 'EDIT RECORD' : 'JOURNAL DRAFT'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            aria-label="Close modal"
            className="p-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
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
              className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-lg text-sm text-[#C24141] flex items-start gap-2.5 font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C24141]" />
              <div className="flex-1">
                <p className="font-bold text-[#991B1B]">Unable to save expense</p>
                <p className="mt-0.5 text-[#66716B]">{serverError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successBanner && (
            <div
              role="status"
              className="p-3.5 bg-[#E8F5EC] border border-[#A6DEC0] rounded-lg text-sm text-[#064E3B] flex items-center gap-2.5 font-semibold"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#16A765]" />
              <p>{successBanner}</p>
            </div>
          )}

          {/* Row 1: Amount & Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-amount-input"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                TOTAL AMOUNT (INR) <span className="text-[#DC2626]">*</span>
              </label>
              <div
                className={`flex items-baseline px-3.5 py-2.5 bg-white border rounded-lg transition-all focus-within:ring-1 ${
                  errors.amount
                    ? 'border-[#DC2626] focus-within:border-[#DC2626] focus-within:ring-[#DC2626]'
                    : 'border-[#CBD5E1] focus-within:border-[#064E3B] focus-within:ring-[#064E3B]'
                }`}
              >
                <span className="text-2xl sm:text-3xl font-extrabold text-[#111827] mr-2 select-none font-mono">
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
                  className="w-full text-2xl sm:text-3xl font-extrabold font-mono text-[#111827] placeholder:text-neutral-400 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs font-medium text-[#4B5563]">
                {isSplit ? 'Shared ledger split allocation' : 'Single ledger charge'}
              </p>
              {errors.amount && (
                <p className="text-xs text-[#DC2626] font-bold">{errors.amount}</p>
              )}
            </div>

            {/* Merchant / Payee Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-merchant-input"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                MERCHANT OR PAYEE <span className="text-[#DC2626]">*</span>
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-3 bg-white border ${
                  errors.merchant ? 'border-[#DC2626]' : 'border-[#CBD5E1]'
                } rounded-lg focus-within:border-[#064E3B] focus-within:ring-1 focus-within:ring-[#064E3B] transition-all`}
              >
                <Store className={`w-5 h-5 ${errors.merchant ? 'text-[#DC2626]' : 'text-[#4B5563]'} shrink-0`} />
                <input
                  id="expense-merchant-input"
                  type="text"
                  maxLength={100}
                  disabled={isLoading}
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    markDirty();
                    if (errors.merchant) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.merchant;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. The Fatty Bao, Grocery Mart"
                  className="w-full text-sm sm:text-base font-semibold text-[#111827] placeholder:text-neutral-400 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs font-medium text-[#4B5563]">Payee name or transaction party</p>
              {errors.merchant && (
                <p className="text-xs text-[#DC2626] font-bold">{errors.merchant}</p>
              )}
            </div>
          </div>

          {/* Row 2: Timestamp, Category Classification, Source Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Timestamp */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-date-input"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                TRANSACTION DATE
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg focus-within:border-[#064E3B] focus-within:ring-1 focus-within:ring-[#064E3B]">
                <Calendar className="w-4 h-4 text-[#4B5563] shrink-0" />
                <input
                  id="expense-date-input"
                  type="date"
                  disabled={isLoading}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    markDirty();
                  }}
                  className="w-full text-sm font-semibold text-[#111827] bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-category-select"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                CATEGORY
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg focus-within:border-[#064E3B] focus-within:ring-1 focus-within:ring-[#064E3B]">
                <Utensils className="w-4 h-4 text-[#4B5563] shrink-0" />
                <select
                  id="expense-category-select"
                  disabled={isLoading}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ExpenseCategory);
                    markDirty();
                  }}
                  className="w-full text-sm font-semibold text-[#111827] bg-transparent focus:outline-none cursor-pointer"
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
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                PAYMENT METHOD
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg focus-within:border-[#064E3B] focus-within:ring-1 focus-within:ring-[#064E3B]">
                <CreditCard className="w-4 h-4 text-[#4B5563] shrink-0" />
                <select
                  id="expense-source-select"
                  disabled={isLoading}
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as PaymentMethod);
                    markDirty();
                  }}
                  className="w-full text-sm font-semibold text-[#111827] bg-transparent focus:outline-none cursor-pointer"
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

          {/* Row 3: Item Spent On & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Specific Item Spent On (Replacing Tags for AI spending analysis & suggestions) */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-item-input"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                ITEM OR PRODUCT SPENT ON <span className="text-[#DC2626]">*</span>
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-white border ${
                  errors.item ? 'border-[#DC2626]' : 'border-[#CBD5E1]'
                } rounded-lg focus-within:border-[#064E3B] focus-within:ring-1 focus-within:ring-[#064E3B] transition-all`}
              >
                <ShoppingBag className={`w-4.5 h-4.5 ${errors.item ? 'text-[#DC2626]' : 'text-[#4B5563]'} shrink-0`} />
                <input
                  id="expense-item-input"
                  type="text"
                  maxLength={100}
                  disabled={isLoading}
                  value={item}
                  onChange={(e) => {
                    setItem(e.target.value);
                    markDirty();
                    if (errors.item) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.item;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. Burger, Chips, Coffee, Groceries"
                  className="w-full text-sm font-semibold text-[#111827] placeholder:text-neutral-400 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs font-medium text-[#4B5563]">
                Specific item purchased (used for spending analysis and suggestions)
              </p>
              {errors.item && (
                <p className="text-xs text-[#DC2626] font-bold">{errors.item}</p>
              )}
            </div>

            {/* Description & Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="expense-description-input"
                className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase"
              >
                DESCRIPTION OR NOTES
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
                placeholder="e.g. Dinner with college friends"
                className="w-full h-11 px-3.5 text-sm font-semibold text-[#111827] placeholder:text-neutral-400 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B] focus:ring-1 focus:ring-[#064E3B]"
              />
              <p className="text-xs font-medium text-[#4B5563]">
                General notes or context about this expense
              </p>
              {errors.title && (
                <p className="text-xs text-[#DC2626] font-bold">{errors.title}</p>
              )}
            </div>
          </div>

          {/* Split Section with Darker, High-Contrast Borders */}
          <div className="bg-[#F0F7F2] border border-[#A7D7B9] rounded-xl p-4 sm:p-5 space-y-4">
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
                    isSplit ? 'bg-[#064E3B]' : 'bg-[#94A3B8]'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform absolute top-0.75 ${
                      isSplit ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="font-bold text-sm text-[#111827]">
                    Split this expense with others
                  </p>
                  <p className="text-xs font-medium text-[#4B5563]">
                    Divide balance and allocate ledger debt receivables automatically
                  </p>
                </div>
              </div>

              {isSplit && (
                <span className="hidden sm:inline-block text-xs font-bold text-[#064E3B] bg-white border border-[#A6DEC0] px-3 py-1 rounded-[4px] uppercase tracking-wide">
                  Shared Ledger Active
                </span>
              )}
            </div>

            {/* Split Details Body */}
            {isSplit && (
              <div className="space-y-4 pt-3 border-t border-[#A7D7B9]">
                {/* Payer Selection */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                      Who paid up front?
                    </span>
                    <div className="inline-flex p-0.5 bg-white border border-[#CBD5E1] rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setPayerType('YOU');
                          markDirty();
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          payerType === 'YOU'
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'text-[#4B5563] hover:text-[#111827]'
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
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          payerType === 'OTHER'
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'text-[#4B5563] hover:text-[#111827]'
                        }`}
                      >
                        Someone else paid
                      </button>
                    </div>
                  </div>

                  {payerType === 'OTHER' && (
                    <div className="flex items-center gap-2.5 p-3 bg-white border border-[#CBD5E1] rounded-lg text-sm">
                      <span className="font-bold text-[#1F2937]">Select Payer:</span>
                      {participants.filter((p) => !p.isCurrentUser).length > 0 ? (
                        <select
                          value={otherPayerId}
                          onChange={(e) => {
                            setOtherPayerId(e.target.value);
                            markDirty();
                          }}
                          className="flex-1 p-1.5 font-bold text-[#111827] bg-neutral-50 border border-[#CBD5E1] rounded-md focus:outline-none"
                        >
                          {participants
                            .filter((p) => !p.isCurrentUser)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-[#DC2626]">
                          Add at least one person below to select them as payer.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Allocation Rule Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1F2937] tracking-wider uppercase">
                    ALLOCATION RULE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllocationRule('EQUAL');
                        markDirty();
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                        allocationRule === 'EQUAL'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#374151] border-[#CBD5E1] hover:bg-[#E8F4EC]'
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
                      className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                        allocationRule === 'CUSTOM'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#374151] border-[#CBD5E1] hover:bg-[#E8F4EC]'
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
                      className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                        allocationRule === 'PERCENTAGE'
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-[#374151] border-[#CBD5E1] hover:bg-[#E8F4EC]'
                      }`}
                    >
                      Percentages
                    </button>
                  </div>
                </div>

                {/* Participant Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-[#A7D7B9] text-xs font-bold text-[#1F2937] tracking-wider uppercase">
                    <span>PARTICIPANTS</span>
                    <span>INDIVIDUAL SHARE</span>
                  </div>

                  {/* Empty state when only current user is in split */}
                  {participants.length === 1 && (
                    <div className="p-3 bg-white border border-[#CBD5E1] rounded-lg text-center space-y-1">
                      <p className="text-xs font-bold text-[#111827]">
                        No other people added to this split yet.
                      </p>
                      <p className="text-xs text-[#4B5563]">
                        Use "+ Add Person to Split" below to add friends or participants.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {participants.map((p) => {
                      const shareObj = calculatedShares.find((cs) => cs.id === p.id);
                      const shareRupees = shareObj ? shareObj.shareRupees : 0;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            p.selected
                              ? 'bg-white border-[#94A3B8]'
                              : 'bg-neutral-50/70 border-neutral-200 opacity-60'
                          }`}
                        >
                          {/* Left: Checkbox + Avatar + Name */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={p.selected}
                              onChange={() => handleToggleParticipant(p.id)}
                              className="w-4.5 h-4.5 text-[#064E3B] accent-[#064E3B] rounded cursor-pointer"
                            />
                            <div
                              className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                p.isCurrentUser
                                  ? 'bg-[#064E3B] text-white'
                                  : 'bg-[#4B5563] text-white'
                              }`}
                            >
                              {getInitials(p.name)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#111827]">
                                {p.name}
                              </p>
                              <p className="text-xs font-medium text-[#4B5563]">
                                {p.isCurrentUser
                                  ? 'Settles automatically from primary account'
                                  : payerType === 'YOU'
                                  ? 'Owed to you'
                                  : p.id === otherPayerId
                                  ? 'Paid upfront'
                                  : 'Shared participant'}
                              </p>
                              {!p.isCurrentUser && (() => {
                                const finalInfo = participantFinalForms.find((f) => f.id === p.id);
                                if (!finalInfo) return null;
                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                    {finalInfo.hasPreviousDebt ? (
                                      <span className="text-[#6B7280]">
                                        Current:{' '}
                                        {finalInfo.previousNet > 0
                                          ? `owes ₹${finalInfo.previousNet.toFixed(2)}`
                                          : `you owe ₹${Math.abs(finalInfo.previousNet).toFixed(2)}`}
                                      </span>
                                    ) : (
                                      <span className="text-[#6B7280]">Current: ₹0.00</span>
                                    )}
                                    <span className="text-[#9CA3AF]">→</span>
                                    <span
                                      className={`font-semibold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                        finalInfo.isSettled
                                          ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                          : finalInfo.projectedNet > 0
                                          ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                          : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                                      }`}
                                    >
                                      {finalInfo.isSettled
                                        ? 'Final: All settled up (₹0.00)'
                                        : finalInfo.projectedNet > 0
                                        ? `Final: Owes you ₹${finalInfo.projectedNet.toFixed(2)}`
                                        : `Final: You owe ₹${Math.abs(finalInfo.projectedNet).toFixed(2)}`}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Right: Share Controls */}
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {allocationRule === 'EQUAL' && (
                                <div>
                                  <p className="text-base font-extrabold font-mono text-[#111827]">
                                    ₹ {p.selected ? shareRupees.toFixed(2) : '0.00'}
                                  </p>
                                  <p className="text-[11px] font-medium text-[#4B5563]">
                                    {p.isCurrentUser ? 'Your cost' : 'Calculated share'}
                                  </p>
                                </div>
                              )}

                              {allocationRule === 'CUSTOM' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-mono font-bold text-[#111827]">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    disabled={!p.selected}
                                    value={p.customRupees}
                                    onChange={(e) => handleCustomRupeesChange(p.id, e.target.value)}
                                    placeholder={p.selected ? '0.00' : '-'}
                                    className="w-24 px-2 py-1 text-sm font-mono font-bold text-right text-[#111827] bg-white border border-[#94A3B8] rounded-md focus:outline-none focus:border-[#064E3B]"
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
                                      className="w-16 px-2 py-1 text-xs font-mono font-bold text-right text-[#111827] bg-white border border-[#94A3B8] rounded-md focus:outline-none focus:border-[#064E3B]"
                                    />
                                    <span className="text-xs text-[#1F2937] font-bold">%</span>
                                  </div>
                                  <span className="text-sm font-mono font-bold text-[#111827] min-w-[70px] text-right">
                                    ₹ {shareRupees.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Remove participant button for added persons */}
                            {!p.isCurrentUser && (
                              <button
                                type="button"
                                onClick={() => handleRemovePerson(p.id)}
                                className="text-neutral-400 hover:text-[#DC2626] p-1.5 rounded transition-colors cursor-pointer"
                                title="Remove participant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Person Inline Control */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {isAddingPerson ? (
                      <div className="space-y-2.5 w-full p-3 bg-white border border-[#CBD5E1] rounded-lg shadow-2xs">
                        {/* Saved people from Peoples section show up ONLY after clicking + Add Person */}
                        {savedPeople.filter(
                          (sp) =>
                            !participants.some(
                              (p) => p.name.toLowerCase().trim() === sp.name.toLowerCase().trim()
                            )
                        ).length > 0 && (
                          <div className="space-y-1.5 pb-2 border-b border-[#F1F5F9]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                              Saved People (click to add):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {savedPeople
                                .filter(
                                  (sp) =>
                                    !participants.some(
                                      (p) => p.name.toLowerCase().trim() === sp.name.toLowerCase().trim()
                                    )
                                )
                                .map((person) => (
                                  <button
                                    key={person.id}
                                    type="button"
                                    onClick={() => handleAddPerson(person.name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#E8F3EE] hover:bg-[#D5EADB] text-[#064E3B] border border-[#A7D7B9] transition-colors cursor-pointer"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>{person.name}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

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
                            placeholder="Or enter a new person name..."
                            className="flex-1 px-3 py-1.5 text-sm font-semibold text-[#111827] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#064E3B] bg-white shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPerson()}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#064E3B] rounded-lg hover:bg-[#04392B] cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingPerson(false);
                              setNewPersonName('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingPerson(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E3B] hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Add Person to Split</span>
                      </button>
                    )}

                    {/* Balance Indicator for Custom / Percentage */}
                    {allocationRule === 'CUSTOM' && totalPaise > 0 && (
                      <span
                        className={`text-xs font-mono font-bold ${
                          allocationDifferencePaise === 0
                            ? 'text-[#064E3B]'
                            : 'text-[#DC2626]'
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
                        className={`text-xs font-mono font-bold ${
                          Math.abs(totalPercentage - 100) < 0.01
                            ? 'text-[#064E3B]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        Total: {totalPercentage.toFixed(1)}% / 100%
                      </span>
                    )}
                  </div>

                  {/* Live Final Ledger Standing Preview for all participants */}
                  {participantFinalForms.length > 0 && totalPaise > 0 && (
                    <div className="p-3.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                        <ShieldCheck className="w-4 h-4 text-[#064E3B]" />
                        <span>Final Ledger Standing Preview</span>
                      </div>
                      <div className="space-y-1.5 pt-1 border-t border-[#E2E8F0]">
                        {participantFinalForms.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 border-b border-[#F1F5F9] last:border-0 gap-1"
                          >
                            <span className="font-semibold text-[#111827]">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#6B7280] font-mono text-[11px]">
                                {item.hasPreviousDebt
                                  ? item.previousNet > 0
                                    ? `Previous due: ₹${item.previousNet.toFixed(2)}`
                                    : `Previous liability: ₹${Math.abs(item.previousNet).toFixed(2)}`
                                  : 'Previous: ₹0.00'}
                              </span>
                              <span className="text-[#9CA3AF]">→</span>
                              <span
                                className={`font-mono font-bold text-xs ${
                                  item.isSettled
                                    ? 'text-[#064E3B]'
                                    : item.projectedNet > 0
                                    ? 'text-[#059669]'
                                    : 'text-[#DC2626]'
                                }`}
                              >
                                {item.isSettled
                                  ? 'All settled up (₹0.00)'
                                  : item.projectedNet > 0
                                  ? `Owes you ₹${item.projectedNet.toFixed(2)}`
                                  : `You owe ₹${Math.abs(item.projectedNet).toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {errors.split && (
                    <p className="text-xs text-[#DC2626] font-bold pt-1">
                      {errors.split}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 sm:py-3.5 bg-white border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm font-bold text-[#4B5563] hover:text-[#111827] px-4 py-2.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!expenseToEdit && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-[#064E3B] bg-white border border-[#064E3B] hover:bg-[#F0FDF4] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                Save and Add Another
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-[#064E3B] hover:bg-[#04392B] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>{expenseToEdit ? 'Save Changes' : 'Save Expense'}</span>
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
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-white border border-[#94A3B8] rounded-xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 id="discard-title" className="text-lg font-bold text-[#111827]">
              Discard unsaved changes?
            </h3>
            <p className="text-sm font-medium text-[#4B5563]">
              You have unsaved changes in this expense form. Discarding will lose these changes.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold text-[#4B5563] hover:text-[#111827] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors cursor-pointer"
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

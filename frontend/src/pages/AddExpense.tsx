import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, PlusCircle } from 'lucide-react';
import {
  expenseService,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  ExpenseCategory,
  PaymentMethod,
  ExpenseData,
} from '../services/expenseService';

interface AddExpenseProps {
  onSuccess?: (expense: ExpenseData) => void;
  onCancel?: () => void;
}

export const AddExpense: React.FC<AddExpenseProps> = ({ onSuccess, onCancel }) => {
  const todayString = new Date().toISOString().split('T')[0];

  // Form fields
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(todayString);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Interaction and validation states
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedExpense, setSavedExpense] = useState<ExpenseData | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Amount validation
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required.';
    } else {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) {
        newErrors.amount = 'Enter a valid amount greater than zero.';
      }
    }

    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Expense title or description is required.';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters.';
    }

    // Category validation
    if (!category || !category.trim()) {
      newErrors.category = 'Please select a category.';
    }

    // Date validation
    if (!date) {
      newErrors.date = 'Expense date is required.';
    }

    // Notes validation
    if (notes && notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === 'amount') {
      if (!amount.trim()) {
        setErrors((prev) => ({ ...prev, amount: 'Amount is required.' }));
      } else {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) {
          setErrors((prev) => ({ ...prev, amount: 'Enter a valid amount greater than zero.' }));
        } else {
          setErrors((prev) => {
            const copy = { ...prev };
            delete copy.amount;
            return copy;
          });
        }
      }
    }

    if (field === 'title') {
      if (!title.trim()) {
        setErrors((prev) => ({ ...prev, title: 'Expense title is required.' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.title;
          return copy;
        });
      }
    }

    if (field === 'category') {
      if (!category) {
        setErrors((prev) => ({ ...prev, category: 'Please select a category.' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.category;
          return copy;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      amount: true,
      title: true,
      category: true,
      date: true,
    });
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await expenseService.createExpense({
        amount: parseFloat(amount),
        title: title.trim(),
        category: category as ExpenseCategory,
        date,
        paymentMethod: paymentMethod ? (paymentMethod as PaymentMethod) : undefined,
        notes: notes.trim() || undefined,
      });

      const expense = response.data?.expense;
      if (expense) {
        setSavedExpense(expense);
        if (onSuccess) {
          onSuccess(expense);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save expense. Please try again.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setAmount('');
    setTitle('');
    setCategory('');
    setDate(todayString);
    setPaymentMethod('');
    setNotes('');
    setTouched({});
    setErrors({});
    setServerError(null);
    setSavedExpense(null);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] w-full flex items-center justify-center py-10 px-4 sm:px-6 bg-[#F7F8F5]">
      <div className="w-full max-w-[540px] bg-white border border-[#E1E6E1] rounded-lg shadow-sm p-7 sm:p-9 space-y-7">
        {/* Header */}
        <div className="space-y-1.5 border-b border-[#F0F2EE] pb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#17211D] tracking-tight">
              Add Expense
            </h1>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-medium text-[#66716B] hover:text-[#17211D] transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
          <p className="text-base text-[#66716B]">
            Record a new expense to track your personal spending.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-[#FDF2F2] border border-[#F3B7B7] rounded-[4px] text-sm text-[#C24141] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#C24141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to save expense</p>
              <p className="mt-0.5 text-[#66716B]">{serverError}</p>
            </div>
          </div>
        )}

        {/* Success Confirmation Card */}
        {savedExpense && (
          <div
            role="status"
            className="p-4 bg-[#E8F5EC] border border-[#A6DEC0] rounded-[6px] space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#16A765] shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-[#064E3B]">Expense saved successfully</p>
                <p className="mt-0.5 text-[#2D4A3E]">
                  Recorded <strong>₹{savedExpense.amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> for "{savedExpense.title}" in {savedExpense.category}.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#C7E9D5] flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-[#04392B] rounded transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add another expense</span>
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-xs font-medium text-[#064E3B] hover:bg-[#D1EEDD] rounded transition-colors cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expense Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Row 1: Amount */}
          <div className="space-y-2">
            <label htmlFor="expense-amount" className="block text-sm font-semibold text-[#17211D]">
              Amount (INR) <span className="text-[#C24141]">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-[#064E3B] font-bold text-lg select-none">
                ₹
              </div>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                disabled={isLoading}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (touched.amount) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.amount;
                      return copy;
                    });
                  }
                }}
                onBlur={() => handleBlur('amount')}
                placeholder="0.00"
                aria-invalid={touched.amount && !!errors.amount}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
                className={`w-full h-12 pl-8 pr-3.5 text-xl font-bold font-mono bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] focus:outline-none transition-colors disabled:bg-[#F7F8F5] ${
                  touched.amount && errors.amount
                    ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                    : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
                }`}
              />
            </div>
            {touched.amount && errors.amount && (
              <p id="amount-error" className="text-sm text-[#C24141]">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Row 2: Title or description */}
          <div className="space-y-2">
            <label htmlFor="expense-title" className="block text-sm font-semibold text-[#17211D]">
              Title or description <span className="text-[#C24141]">*</span>
            </label>
            <input
              id="expense-title"
              type="text"
              maxLength={100}
              disabled={isLoading}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (touched.title) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.title;
                    return copy;
                  });
                }
              }}
              onBlur={() => handleBlur('title')}
              placeholder="e.g. Grocery store, Metro pass, Electric bill"
              aria-invalid={touched.title && !!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={`w-full h-11 px-3.5 text-base bg-white border rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] focus:outline-none transition-colors disabled:bg-[#F7F8F5] ${
                touched.title && errors.title
                  ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                  : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
              }`}
            />
            {touched.title && errors.title && (
              <p id="title-error" className="text-sm text-[#C24141]">
                {errors.title}
              </p>
            )}
          </div>

          {/* Row 3: Category and Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="expense-category" className="block text-sm font-semibold text-[#17211D]">
                Category <span className="text-[#C24141]">*</span>
              </label>
              <select
                id="expense-category"
                disabled={isLoading}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (touched.category) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.category;
                      return copy;
                    });
                  }
                }}
                onBlur={() => handleBlur('category')}
                aria-invalid={touched.category && !!errors.category}
                aria-describedby={errors.category ? 'category-error' : undefined}
                className={`w-full h-11 px-3 text-base bg-white border rounded-[4px] text-[#17211D] focus:outline-none transition-colors cursor-pointer disabled:bg-[#F7F8F5] ${
                  touched.category && errors.category
                    ? 'border-[#C24141] focus:border-[#C24141] focus:ring-1 focus:ring-[#C24141]'
                    : 'border-[#E1E6E1] focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765]'
                }`}
              >
                <option value="">Select a category</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {touched.category && errors.category && (
                <p id="category-error" className="text-sm text-[#C24141]">
                  {errors.category}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label htmlFor="expense-date" className="block text-sm font-semibold text-[#17211D]">
                Expense date <span className="text-[#C24141]">*</span>
              </label>
              <input
                id="expense-date"
                type="date"
                disabled={isLoading}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 text-base bg-white border border-[#E1E6E1] rounded-[4px] text-[#17211D] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] transition-colors disabled:bg-[#F7F8F5]"
              />
            </div>
          </div>

          {/* Row 4: Payment Method (Optional) */}
          <div className="space-y-2">
            <label htmlFor="expense-payment-method" className="block text-sm font-semibold text-[#17211D]">
              Payment method <span className="text-xs font-normal text-[#66716B]">(optional)</span>
            </label>
            <select
              id="expense-payment-method"
              disabled={isLoading}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 text-base bg-white border border-[#E1E6E1] rounded-[4px] text-[#17211D] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] transition-colors cursor-pointer disabled:bg-[#F7F8F5]"
            >
              <option value="">Not specified</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Row 5: Notes (Optional) */}
          <div className="space-y-2">
            <label htmlFor="expense-notes" className="block text-sm font-semibold text-[#17211D]">
              Notes <span className="text-xs font-normal text-[#66716B]">(optional, max 500 characters)</span>
            </label>
            <textarea
              id="expense-notes"
              rows={3}
              maxLength={500}
              disabled={isLoading}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context or reference..."
              className="w-full p-3 text-base bg-white border border-[#E1E6E1] rounded-[4px] text-[#17211D] placeholder:text-[#9BA39E] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] transition-colors resize-none disabled:bg-[#F7F8F5]"
            />
          </div>

          {/* Action Buttons Row */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-[#F0F2EE]">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 h-11 text-sm font-medium text-[#66716B] hover:text-[#17211D] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 h-11 bg-[#064E3B] hover:bg-[#04392B] text-white font-semibold text-base rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

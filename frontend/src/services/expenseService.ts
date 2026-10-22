import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api';

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface SplitParticipant {
  name: string;
  isCurrentUser: boolean;
  shareInPaise: number;
  shareInRupees?: number;
  percentage?: number;
}

export interface SplitDetails {
  payerType: 'YOU' | 'OTHER';
  payerName: string;
  allocationRule: 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';
  participants: SplitParticipant[];
  personalExpenseInPaise: number;
  owedToUserInPaise: number;
  userOwesInPaise: number;
}

export interface ExpenseData {
  id: string;
  userId?: string;
  amountInPaise: number;
  amountInRupees: number;
  title: string;
  category: ExpenseCategory;
  date: string;
  time?: string | null;
  paymentMethod?: PaymentMethod | null;
  merchant?: string | null;
  item?: string | null;
  notes?: string | null;
  isSplit?: boolean;
  splitDetails?: SplitDetails | null;
  createdAt: string;
}

export interface CreateExpensePayload {
  amount: number | string;
  title: string;
  category: string;
  date?: string;
  time?: string;
  paymentMethod?: string;
  merchant?: string;
  item?: string;
  notes?: string;
  isSplit?: boolean;
  splitDetails?: {
    payerType: 'YOU' | 'OTHER';
    payerName: string;
    allocationRule: 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';
    participants: Array<{
      name: string;
      isCurrentUser: boolean;
      shareInPaise: number;
      percentage?: number;
    }>;
  };
}

export interface CreateExpenseResponseData {
  message: string;
  expense: ExpenseData;
}

/**
 * Distributes total integer paise equally among count participants.
 * Any remainder is safely distributed by 1 paisa to the initial participants,
 * guaranteeing sum(shares) === totalPaise down to 1 single paisa.
 */
export function calculateEqualSplitInPaise(totalPaise: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  const shares: number[] = [];
  for (let i = 0; i < count; i++) {
    shares.push(base + (i < remainder ? 1 : 0));
  }
  return shares;
}

export interface CategoryBreakdownItem {
  category: string;
  totalInPaise: number;
  totalInRupees: number;
  percentage: number;
  color: string;
}

export interface DebtItem {
  id: string;
  debtorName: string;
  creditorName: string;
  isReceivable: boolean;
  amountInPaise: number;
  amountInRupees: number;
  initialAmountInPaise?: number;
  initialAmountInRupees?: number;
  totalPaidInPaise?: number;
  totalPaidInRupees?: number;
  status?: 'Unsettled' | 'Partially Repaid' | 'Settled';
  notes?: string;
  upiId?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  isSettled: boolean;
}

export interface RepaymentItem {
  id: string;
  debtId: string;
  counterpartyName: string;
  isReceivable: boolean;
  amountInPaise: number;
  amountInRupees: number;
  previousBalanceInPaise: number;
  previousBalanceInRupees: number;
  newBalanceInPaise: number;
  newBalanceInRupees: number;
  channel: string;
  memo: string;
  date: string;
}

export interface MonthlyTrendItem {
  month: string;
  label: string;
  amountInPaise: number;
  amountInRupees: number;
}

export interface MonthlyTableItem {
  period: string;
  spending: number;
  variance?: string;
  status: 'Active' | 'Closed';
}

export interface TransactionItem {
  id: string;
  title: string;
  merchant?: string;
  category: string;
  date: string;
  splitStatus: string;
  amountInRupees: number;
  amountInPaise: number;
  isSplit?: boolean;
}

export interface ExpenseOverviewData {
  isSampleData: boolean;
  totalSpendingInPaise: number;
  totalSpendingInRupees: number;
  transactionCount: number;
  personalShareInPaise: number;
  personalShareInRupees: number;
  moneyOwedToUserInPaise: number;
  moneyOwedToUserInRupees: number;
  peopleOwedToUserCount: number;
  moneyUserOwesInPaise: number;
  moneyUserOwesInRupees: number;
  peopleUserOwesCount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  debts: DebtItem[];
  monthlyTrend: MonthlyTrendItem[];
  monthlyTable: MonthlyTableItem[];
  recentTransactions: TransactionItem[];
}

export interface UnifiedTransaction {
  id: string;
  type: 'EXPENSE' | 'DEBT_SETTLEMENT';
  rawId: string;
  date: string;
  formattedDate: string;
  time: string;
  merchant: string;
  title: string;
  item: string;
  notes: string;
  category: string;
  paymentMethod: string;
  isSplit: boolean;
  totalAmountInPaise: number;
  totalAmountInRupees: number;
  yourShareInPaise: number;
  yourShareInRupees: number;
  isCredit: boolean;
  splitResponsibility: {
    kind: 'PERSONAL' | 'SPLIT_PAID' | 'SPLIT_OWE' | 'SETTLEMENT';
    headline: string;
    subline: string;
    accentColor: 'neutral' | 'emerald' | 'amber' | 'rose';
  };
  splitDetails?: SplitDetails | null;
  rawExpense?: ExpenseData;
}

export const expenseService = {
  getTransactions: async (): Promise<ApiResponse<{ transactions: UnifiedTransaction[]; count: number; totalTurnoverInRupees: number }>> => {
    return apiClient<ApiResponse<{ transactions: UnifiedTransaction[]; count: number; totalTurnoverInRupees: number }>>('/expenses', {
      method: 'GET',
    });
  },

  createExpense: async (payload: CreateExpensePayload): Promise<ApiResponse<CreateExpenseResponseData>> => {
    return apiClient<ApiResponse<CreateExpenseResponseData>>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateExpense: async (id: string, payload: CreateExpensePayload): Promise<ApiResponse<CreateExpenseResponseData>> => {
    return apiClient<ApiResponse<CreateExpenseResponseData>>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getOverview: async (): Promise<ApiResponse<ExpenseOverviewData>> => {
    return apiClient<ApiResponse<ExpenseOverviewData>>('/expenses/overview', {
      method: 'GET',
    });
  },

  repayDebt: async (
    debtId: string,
    payload: { amount: number; channel?: string; memo?: string; date?: string }
  ): Promise<ApiResponse<{ message: string; debt: DebtItem; repayment: RepaymentItem }>> => {
    return apiClient<ApiResponse<{ message: string; debt: DebtItem; repayment: RepaymentItem }>>(
      `/expenses/debts/${debtId}/repay`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  getRepayments: async (): Promise<ApiResponse<{ repayments: RepaymentItem[]; count: number }>> => {
    return apiClient<ApiResponse<{ repayments: RepaymentItem[]; count: number }>>('/expenses/repayments', {
      method: 'GET',
    });
  },

  settleDebt: async (debtId: string): Promise<ApiResponse<{ message: string; isSettled: boolean }>> => {
    return apiClient<ApiResponse<{ message: string; isSettled: boolean }>>(`/expenses/debts/${debtId}/settle`, {
      method: 'PATCH',
    });
  },

  deleteExpense: async (id: string): Promise<ApiResponse<{ message: string; id: string }>> => {
    return apiClient<ApiResponse<{ message: string; id: string }>>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  deleteDebt: async (debtId: string): Promise<ApiResponse<{ message: string; debtId: string }>> => {
    return apiClient<ApiResponse<{ message: string; debtId: string }>>(`/expenses/debts/${debtId}`, {
      method: 'DELETE',
    });
  },

  deleteRepayment: async (repaymentId: string): Promise<ApiResponse<{ message: string; id: string }>> => {
    return apiClient<ApiResponse<{ message: string; id: string }>>(`/expenses/repayments/${repaymentId}`, {
      method: 'DELETE',
    });
  },
};



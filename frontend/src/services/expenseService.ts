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
  notes?: string | null;
  tags?: string[];
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
  notes?: string;
  tags?: string[];
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

export const expenseService = {
  createExpense: async (payload: CreateExpensePayload): Promise<ApiResponse<CreateExpenseResponseData>> => {
    return apiClient<ApiResponse<CreateExpenseResponseData>>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

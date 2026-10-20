import { apiClient } from './apiClient';

export type InsightsDateRange = 'this-month' | 'last-month' | 'last-3-months' | 'custom';

export interface InsightsPeriod {
  startDate: string;
  endDate: string;
  label: string;
  isPartial: boolean;
  partialNotice: string | null;
}

export interface InsightsPreviousPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

export interface PeriodComparison {
  currentSpendingInRupees: number;
  previousSpendingInRupees: number;
  differenceInRupees: number;
  signedDifferenceInRupees: number;
  percentageChange: number | null;
  direction: 'increased' | 'decreased' | 'unchanged';
  statusText: string;
  isPartialComparison: boolean;
}

export interface HighestCategoryItem {
  category: string;
  amountInRupees: number;
  percentage: number;
}

export interface InsightsSummary {
  totalPersonalSpendingInPaise: number;
  totalPersonalSpendingInRupees: number;
  totalBillTurnoverInRupees: number;
  transactionCount: number;
  averageMonthlySpendingInRupees: number;
  isAverageMonthlyAvailable: boolean;
  highestCategory: HighestCategoryItem | null;
  comparison: PeriodComparison;
}

export interface CategoryBreakdownItem {
  category: string;
  amountInPaise: number;
  amountInRupees: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

export interface MonthlyTrendMonth {
  month: string;
  monthKey: string;
  amountInPaise: number;
  amountInRupees: number;
  transactionCount: number;
  isCurrentMonth: boolean;
}

export interface MonthlyTrendData {
  insufficientHistory: boolean;
  notice: string | null;
  months: MonthlyTrendMonth[];
}

export interface RecentSpendingItem {
  id: string;
  merchant: string;
  item: string;
  title: string;
  category: string;
  date: string;
  formattedDate: string;
  personalAmountInRupees: number;
  personalAmountInPaise: number;
  totalAmountInRupees: number;
  totalAmountInPaise: number;
  isSplit: boolean;
}

export interface InsightsData {
  range: InsightsDateRange;
  period: InsightsPeriod;
  previousPeriod: InsightsPreviousPeriod;
  hasAnyExpenses: boolean;
  hasPeriodExpenses: boolean;
  summary: InsightsSummary;
  categoryBreakdown: CategoryBreakdownItem[];
  monthlyTrend: MonthlyTrendData;
  recentExpenses: RecentSpendingItem[];
}

export interface InsightsApiResponse {
  success: boolean;
  data: InsightsData;
}

export const insightsService = {
  getInsights: async (
    range: InsightsDateRange = 'this-month',
    startDate?: string,
    endDate?: string
  ): Promise<InsightsApiResponse> => {
    const params = new URLSearchParams();
    params.set('range', range);
    if (range === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }

    return apiClient<InsightsApiResponse>(`/insights?${params.toString()}`, {
      method: 'GET',
    });
  },
};

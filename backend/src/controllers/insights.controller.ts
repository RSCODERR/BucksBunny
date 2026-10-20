import { Request, Response, NextFunction } from 'express';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../models/Expense';
import { AppError } from '../errors/AppError';

// Curated financial palette matching BucksBunny brand rules (forest green & dark neutrals)
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#064E3B',
  'Transport': '#0D9488',
  'Shopping': '#0284C7',
  'Bills & Utilities': '#059669',
  'Entertainment': '#475569',
  'Health': '#D97706',
  'Education': '#047857',
  'Other': '#64748B',
};

interface DatePeriodBoundaries {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  periodLabel: string;
  prevPeriodLabel: string;
  isPartial: boolean;
  partialNotice?: string;
}

/**
 * Calculates start, end, and preceding equivalent period boundaries for date range filtering.
 */
function calculatePeriodBoundaries(
  range: string,
  customStart?: string,
  customEnd?: string
): DatePeriodBoundaries {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  if (range === 'last-month') {
    // Current period = Last calendar month
    const start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Preceding period = Two months ago
    const prevStart = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
    const prevEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59, 999);

    const periodLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const prevPeriodLabel = prevStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return {
      start,
      end,
      prevStart,
      prevEnd,
      periodLabel,
      prevPeriodLabel,
      isPartial: false,
    };
  }

  if (range === 'last-3-months' || range === '3-months') {
    // Current period = Past 3 months including current month to date
    const start = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Preceding equivalent 3-month period
    const prevStart = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0, 0);
    const prevEnd = new Date(currentYear, currentMonth - 2, 0, 23, 59, 59, 999);

    const periodLabel = `${start.toLocaleString('en-US', { month: 'short' })} - ${now.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
    const prevPeriodLabel = `${prevStart.toLocaleString('en-US', { month: 'short' })} - ${prevEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;

    return {
      start,
      end,
      prevStart,
      prevEnd,
      periodLabel,
      prevPeriodLabel,
      isPartial: true,
      partialNotice: 'Includes current month to date',
    };
  }

  if (range === 'custom') {
    if (!customStart || !customEnd) {
      throw new AppError('Both startDate and endDate are required for custom range.', 400);
    }

    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid startDate or endDate format. Please use YYYY-MM-DD.', 400);
    }

    if (start.getTime() > end.getTime()) {
      throw new AppError('Start date cannot be after end date.', 400);
    }

    const durationMs = end.getTime() - start.getTime() + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      start,
      end,
      prevStart,
      prevEnd,
      periodLabel: `${formatDate(start)} - ${formatDate(end)}`,
      prevPeriodLabel: `${formatDate(prevStart)} - ${formatDate(prevEnd)}`,
      isPartial: false,
    };
  }

  // Default: 'this-month'
  const start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
  const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  // Preceding period = Full previous month
  const prevStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const periodLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevPeriodLabel = prevStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    start,
    end,
    prevStart,
    prevEnd,
    periodLabel,
    prevPeriodLabel,
    isPartial: true,
    partialNotice: 'Month to date (in progress)',
  };
}

/**
 * GET /api/v1/insights
 * Retrieves personal spending analytics, category breakdown, monthly trends, and period comparisons.
 */
export const getInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve insights.', 401);
    }

    const userId = req.user.id;
    const rangeParam = typeof req.query.range === 'string' ? req.query.range.trim().toLowerCase() : 'this-month';
    const startDateParam = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined;
    const endDateParam = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined;

    const boundaries = calculatePeriodBoundaries(rangeParam, startDateParam, endDateParam);

    // Check if the user has any saved expenses across all time
    const totalAllTimeExpenses = await Expense.countDocuments({ userId });
    const hasAnyExpenses = totalAllTimeExpenses > 0;

    // Fetch expenses for current period and previous period
    const earliestDate = new Date(Math.min(boundaries.start.getTime(), boundaries.prevStart.getTime()));
    const latestDate = new Date(Math.max(boundaries.end.getTime(), boundaries.prevEnd.getTime()));

    const periodExpenses = await Expense.find({
      userId,
      date: { $gte: earliestDate, $lte: latestDate },
    }).sort({ date: -1, createdAt: -1 });

    // 1. Separate current vs previous period expenses
    const currentPeriodExpenses = periodExpenses.filter((e) => {
      const d = new Date(e.date).getTime();
      return d >= boundaries.start.getTime() && d <= boundaries.end.getTime();
    });

    const previousPeriodExpenses = periodExpenses.filter((e) => {
      const d = new Date(e.date).getTime();
      return d >= boundaries.prevStart.getTime() && d <= boundaries.prevEnd.getTime();
    });

    // 2. Personal Spending Calculation for Current Period
    let totalPersonalSpendingInPaise = 0;
    let totalBillTurnoverInPaise = 0;
    const categoryTotalsInPaise: Record<string, { paise: number; count: number }> = {};

    for (const exp of currentPeriodExpenses) {
      totalBillTurnoverInPaise += exp.amountInPaise;

      // Safe personal share calculation (splits allocate actual personal portion)
      const personalPaise =
        exp.isSplit && exp.splitDetails && typeof exp.splitDetails.personalExpenseInPaise === 'number'
          ? exp.splitDetails.personalExpenseInPaise
          : exp.amountInPaise;

      totalPersonalSpendingInPaise += personalPaise;

      const category = exp.category && EXPENSE_CATEGORIES.includes(exp.category as ExpenseCategory)
        ? exp.category
        : 'Other';

      if (!categoryTotalsInPaise[category]) {
        categoryTotalsInPaise[category] = { paise: 0, count: 0 };
      }
      categoryTotalsInPaise[category].paise += personalPaise;
      categoryTotalsInPaise[category].count += 1;
    }

    // 3. Personal Spending Calculation for Previous Period
    let prevPersonalSpendingInPaise = 0;
    for (const exp of previousPeriodExpenses) {
      const personalPaise =
        exp.isSplit && exp.splitDetails && typeof exp.splitDetails.personalExpenseInPaise === 'number'
          ? exp.splitDetails.personalExpenseInPaise
          : exp.amountInPaise;

      prevPersonalSpendingInPaise += personalPaise;
    }

    // 4. Comparison Calculations
    const diffInPaise = totalPersonalSpendingInPaise - prevPersonalSpendingInPaise;
    let comparisonDirection: 'increased' | 'decreased' | 'unchanged' = 'unchanged';
    if (diffInPaise > 0) comparisonDirection = 'increased';
    else if (diffInPaise < 0) comparisonDirection = 'decreased';

    let percentageChange: number | null = null;
    let comparisonStatusText = 'No spending in either period.';

    if (prevPersonalSpendingInPaise === 0) {
      if (totalPersonalSpendingInPaise > 0) {
        percentageChange = null;
        comparisonStatusText = 'No spending recorded in previous period for percentage calculation.';
      } else {
        percentageChange = 0;
        comparisonStatusText = 'No spending in either period.';
      }
    } else {
      percentageChange = Math.round(((totalPersonalSpendingInPaise - prevPersonalSpendingInPaise) / prevPersonalSpendingInPaise) * 1000) / 10;
      const formattedDiff = (Math.abs(diffInPaise) / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      if (diffInPaise > 0) {
        comparisonStatusText = `Spent ₹${formattedDiff} (${percentageChange}%) more than previous period`;
      } else if (diffInPaise < 0) {
        comparisonStatusText = `Spent ₹${formattedDiff} (${Math.abs(percentageChange)}%) less than previous period`;
      } else {
        comparisonStatusText = 'Identical spending to previous period';
      }
    }

    // 5. Average Monthly Spending Calculation
    const spanDays = Math.max(1, Math.round((boundaries.end.getTime() - boundaries.start.getTime()) / (1000 * 60 * 60 * 24)));
    let isAverageMonthlyAvailable = false;
    let averageMonthlySpendingInRupees = 0;

    if (rangeParam === 'this-month' || rangeParam === 'last-month') {
      isAverageMonthlyAvailable = true;
      averageMonthlySpendingInRupees = totalPersonalSpendingInPaise / 100;
    } else if (rangeParam === 'last-3-months' || rangeParam === '3-months') {
      isAverageMonthlyAvailable = true;
      averageMonthlySpendingInRupees = Math.round(totalPersonalSpendingInPaise / 3) / 100;
    } else if (spanDays >= 28) {
      const monthCount = spanDays / 30.4375;
      isAverageMonthlyAvailable = true;
      averageMonthlySpendingInRupees = Math.round(totalPersonalSpendingInPaise / monthCount) / 100;
    }

    // 6. Category Breakdown List
    const categoryBreakdown = Object.entries(categoryTotalsInPaise)
      .filter(([_, data]) => data.paise > 0)
      .map(([cat, data]) => {
        const percentage =
          totalPersonalSpendingInPaise > 0
            ? Math.round((data.paise / totalPersonalSpendingInPaise) * 1000) / 10
            : 0;

        return {
          category: cat,
          amountInPaise: data.paise,
          amountInRupees: data.paise / 100,
          percentage,
          transactionCount: data.count,
          color: CATEGORY_COLORS[cat] || '#64748B',
        };
      })
      .sort((a, b) => b.amountInPaise - a.amountInPaise);

    // Highest-spending category
    const highestCategory =
      categoryBreakdown.length > 0
        ? {
            category: categoryBreakdown[0].category,
            amountInRupees: categoryBreakdown[0].amountInRupees,
            percentage: categoryBreakdown[0].percentage,
          }
        : null;

    // 7. Monthly Trend (Past 6 Calendar Months)
    const now = new Date();
    const trendMonths = [];
    const trendEarliest = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const trendExpenses = await Expense.find({
      userId,
      date: { $gte: trendEarliest, $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) },
    });

    let monthsWithExpensesCount = 0;
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mYear = mDate.getFullYear();
      const mMonth = mDate.getMonth();
      const isCurrentMonth = i === 0;

      const mExpenses = trendExpenses.filter((e) => {
        const ed = new Date(e.date);
        return ed.getFullYear() === mYear && ed.getMonth() === mMonth;
      });

      let mTotalPaise = 0;
      for (const e of mExpenses) {
        const pShare =
          e.isSplit && e.splitDetails && typeof e.splitDetails.personalExpenseInPaise === 'number'
            ? e.splitDetails.personalExpenseInPaise
            : e.amountInPaise;
        mTotalPaise += pShare;
      }

      if (mTotalPaise > 0) {
        monthsWithExpensesCount++;
      }

      trendMonths.push({
        month: mDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        monthKey: `${mYear}-${String(mMonth + 1).padStart(2, '0')}`,
        amountInPaise: mTotalPaise,
        amountInRupees: mTotalPaise / 100,
        transactionCount: mExpenses.length,
        isCurrentMonth,
      });
    }

    const insufficientHistory = monthsWithExpensesCount < 2;

    // 8. Recent Expenses in Selected Period (up to 8 records)
    const recentExpenses = currentPeriodExpenses.slice(0, 8).map((exp) => {
      const personalPaise =
        exp.isSplit && exp.splitDetails && typeof exp.splitDetails.personalExpenseInPaise === 'number'
          ? exp.splitDetails.personalExpenseInPaise
          : exp.amountInPaise;

      return {
        id: String(exp._id),
        merchant: exp.merchant || exp.title,
        item: exp.item || exp.notes || exp.title,
        title: exp.title,
        category: exp.category,
        date: exp.date.toISOString(),
        formattedDate: new Date(exp.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        personalAmountInRupees: personalPaise / 100,
        personalAmountInPaise: personalPaise,
        totalAmountInRupees: exp.amountInPaise / 100,
        totalAmountInPaise: exp.amountInPaise,
        isSplit: Boolean(exp.isSplit),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        range: rangeParam,
        period: {
          startDate: boundaries.start.toISOString(),
          endDate: boundaries.end.toISOString(),
          label: boundaries.periodLabel,
          isPartial: boundaries.isPartial,
          partialNotice: boundaries.partialNotice || null,
        },
        previousPeriod: {
          startDate: boundaries.prevStart.toISOString(),
          endDate: boundaries.prevEnd.toISOString(),
          label: boundaries.prevPeriodLabel,
        },
        hasAnyExpenses,
        hasPeriodExpenses: currentPeriodExpenses.length > 0,
        summary: {
          totalPersonalSpendingInPaise,
          totalPersonalSpendingInRupees: totalPersonalSpendingInPaise / 100,
          totalBillTurnoverInRupees: totalBillTurnoverInPaise / 100,
          transactionCount: currentPeriodExpenses.length,
          averageMonthlySpendingInRupees,
          isAverageMonthlyAvailable,
          highestCategory,
          comparison: {
            currentSpendingInRupees: totalPersonalSpendingInPaise / 100,
            previousSpendingInRupees: prevPersonalSpendingInPaise / 100,
            differenceInRupees: Math.abs(diffInPaise) / 100,
            signedDifferenceInRupees: diffInPaise / 100,
            percentageChange,
            direction: comparisonDirection,
            statusText: comparisonStatusText,
            isPartialComparison: boundaries.isPartial,
          },
        },
        categoryBreakdown,
        monthlyTrend: {
          insufficientHistory,
          notice: insufficientHistory
            ? 'At least 2 months of expense history are needed to display a comparative monthly trend.'
            : null,
          months: trendMonths,
        },
        recentExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

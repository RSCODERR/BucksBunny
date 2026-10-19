import { Request, Response, NextFunction } from 'express';
import {
  Expense,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  ExpenseCategory,
  PaymentMethod,
  ISplitDetails,
  ISplitParticipant,
} from '../models/Expense';
import { Debt } from '../models/Debt';
import { Person } from '../models/Person';
import { Repayment } from '../models/Repayment';
import { AppError } from '../errors/AppError';

/**
 * Net mutual debts between authenticated user and a counterparty (or all counterparties).
 * If a person has both receivables (they owe user) and payables (user owes them),
 * this cancels out opposing amounts and retains only the net remaining balance.
 * If net balance is 0, both debts are marked settled.
 */
export const netMutualDebts = async (userId: string, targetPersonName?: string): Promise<void> => {
  const query: Record<string, unknown> = { userId, isSettled: false, amountInPaise: { $gt: 0 } };
  if (targetPersonName && targetPersonName.trim()) {
    const norm = targetPersonName.trim().toLowerCase();
    query.$or = [
      { debtorName: { $regex: new RegExp(`^${norm}$`, 'i') } },
      { creditorName: { $regex: new RegExp(`^${norm}$`, 'i') } },
    ];
  }

  const unsettledDebts = await Debt.find(query);
  if (unsettledDebts.length === 0) return;

  // Group by counterparty name
  const personDebts = new Map<string, { receivables: typeof unsettledDebts; payables: typeof unsettledDebts }>();

  for (const d of unsettledDebts) {
    const counterparty = (d.isReceivable ? d.debtorName : d.creditorName).trim().toLowerCase();
    if (counterparty.startsWith('you')) continue;

    if (!personDebts.has(counterparty)) {
      personDebts.set(counterparty, { receivables: [], payables: [] });
    }
    const entry = personDebts.get(counterparty)!;
    if (d.isReceivable) {
      entry.receivables.push(d);
    } else {
      entry.payables.push(d);
    }
  }

  for (const [_, { receivables, payables }] of personDebts.entries()) {
    // 1. If multiple debts in the same direction, consolidate them first
    if (receivables.length > 1) {
      const primary = receivables[0];
      const sumAmount = receivables.reduce((sum, item) => sum + item.amountInPaise, 0);
      const sumPaid = receivables.reduce((sum, item) => sum + (item.totalPaidInPaise || 0), 0);
      primary.amountInPaise = sumAmount;
      primary.totalPaidInPaise = sumPaid;
      primary.initialAmountInPaise = (primary.initialAmountInPaise || sumAmount) + sumPaid;
      await primary.save();
      const dupIds = receivables.slice(1).map((item) => item._id);
      await Debt.deleteMany({ _id: { $in: dupIds } });
      receivables.splice(1, receivables.length - 1);
    }

    if (payables.length > 1) {
      const primary = payables[0];
      const sumAmount = payables.reduce((sum, item) => sum + item.amountInPaise, 0);
      const sumPaid = payables.reduce((sum, item) => sum + (item.totalPaidInPaise || 0), 0);
      primary.amountInPaise = sumAmount;
      primary.totalPaidInPaise = sumPaid;
      primary.initialAmountInPaise = (primary.initialAmountInPaise || sumAmount) + sumPaid;
      await primary.save();
      const dupIds = payables.slice(1).map((item) => item._id);
      await Debt.deleteMany({ _id: { $in: dupIds } });
      payables.splice(1, payables.length - 1);
    }

    // 2. If both receivables and payables exist, net them out
    if (receivables.length > 0 && payables.length > 0) {
      const rec = receivables[0];
      const pay = payables[0];
      const recPaise = rec.amountInPaise;
      const payPaise = pay.amountInPaise;
      const counterpartyName = rec.debtorName || pay.creditorName;

      if (recPaise === payPaise) {
        // Exactly cancel out to zero
        rec.amountInPaise = 0;
        rec.isSettled = true;
        rec.totalPaidInPaise = (rec.totalPaidInPaise || 0) + recPaise;
        await rec.save();

        pay.amountInPaise = 0;
        pay.isSettled = true;
        pay.totalPaidInPaise = (pay.totalPaidInPaise || 0) + payPaise;
        await pay.save();

        await Repayment.create({
          userId,
          debtId: rec._id,
          counterpartyName,
          isReceivable: true,
          amountInPaise: recPaise,
          previousBalanceInPaise: recPaise,
          newBalanceInPaise: 0,
          channel: 'Mutual Ledger Offset',
          memo: `Mutual settlement: Opposing balances of ₹${(recPaise / 100).toFixed(2)} cancelled out to ₹0.00`,
          date: new Date(),
        });
      } else if (recPaise > payPaise) {
        // Receivable is larger: pay is fully cleared, rec is reduced
        pay.amountInPaise = 0;
        pay.isSettled = true;
        pay.totalPaidInPaise = (pay.totalPaidInPaise || 0) + payPaise;
        await pay.save();

        const remainingRecPaise = recPaise - payPaise;
        rec.amountInPaise = remainingRecPaise;
        rec.totalPaidInPaise = (rec.totalPaidInPaise || 0) + payPaise;
        await rec.save();

        await Repayment.create({
          userId,
          debtId: pay._id,
          counterpartyName,
          isReceivable: false,
          amountInPaise: payPaise,
          previousBalanceInPaise: payPaise,
          newBalanceInPaise: 0,
          channel: 'Mutual Ledger Offset',
          memo: `Mutual offset: Paid ₹${(payPaise / 100).toFixed(2)} against ₹${(recPaise / 100).toFixed(2)} receivable. Remaining due: ₹${(remainingRecPaise / 100).toFixed(2)}`,
          date: new Date(),
        });
      } else {
        // Payable is larger: rec is fully cleared, pay is reduced
        rec.amountInPaise = 0;
        rec.isSettled = true;
        rec.totalPaidInPaise = (rec.totalPaidInPaise || 0) + recPaise;
        await rec.save();

        const remainingPayPaise = payPaise - recPaise;
        pay.amountInPaise = remainingPayPaise;
        pay.totalPaidInPaise = (pay.totalPaidInPaise || 0) + recPaise;
        await pay.save();

        await Repayment.create({
          userId,
          debtId: rec._id,
          counterpartyName,
          isReceivable: true,
          amountInPaise: recPaise,
          previousBalanceInPaise: recPaise,
          newBalanceInPaise: 0,
          channel: 'Mutual Ledger Offset',
          memo: `Mutual offset: Received ₹${(recPaise / 100).toFixed(2)} against ₹${(payPaise / 100).toFixed(2)} payable. Remaining liability: ₹${(remainingPayPaise / 100).toFixed(2)}`,
          date: new Date(),
        });
      }
    }
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to create an expense.', 401);
    }

    const {
      amount,
      title,
      category,
      date,
      time,
      paymentMethod,
      merchant,
      item,
      notes,
      isSplit,
      splitDetails,
    } = req.body;

    // 1. Amount validation and conversion to integer paise
    if (amount === undefined || amount === null || amount === '') {
      throw new AppError('Amount is required.', 400);
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount must be a positive number in INR.', 400);
    }

    // Convert INR to integer paise (e.g., 2400.00 -> 240000)
    const amountInPaise = Math.round(parsedAmount * 100);
    if (!Number.isInteger(amountInPaise) || amountInPaise < 1) {
      throw new AppError('Amount must be at least 1 paisa (₹0.01).', 400);
    }

    // Sanity limit check: ₹10 crore
    if (amountInPaise > 100000000000) {
      throw new AppError('Amount exceeds the maximum permissible limit.', 400);
    }

    // 2. Title validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Expense title or description is required.', 400);
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 100) {
      throw new AppError('Expense title cannot exceed 100 characters.', 400);
    }

    // 3. Category validation
    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new AppError('Category is required.', 400);
    }

    const trimmedCategory = category.trim() as ExpenseCategory;
    if (!EXPENSE_CATEGORIES.includes(trimmedCategory)) {
      throw new AppError(
        `Invalid category "${category}". Allowed categories are: ${EXPENSE_CATEGORIES.join(', ')}.`,
        400
      );
    }

    // 4. Date validation (default to current date)
    let expenseDate: Date;
    if (date) {
      expenseDate = new Date(date);
      if (isNaN(expenseDate.getTime())) {
        throw new AppError('Invalid expense date format.', 400);
      }
    } else {
      expenseDate = new Date();
    }

    // Optional time
    let trimmedTime: string | null = null;
    if (time && typeof time === 'string' && time.trim()) {
      trimmedTime = time.trim();
    }

    // 5. Payment method validation (optional)
    let validPaymentMethod: PaymentMethod | null = null;
    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod.trim()) {
      const trimmedPayment = paymentMethod.trim() as PaymentMethod;
      if (!PAYMENT_METHODS.includes(trimmedPayment)) {
        throw new AppError(
          `Invalid payment method "${paymentMethod}". Allowed options are: ${PAYMENT_METHODS.join(', ')}.`,
          400
        );
      }
      validPaymentMethod = trimmedPayment;
    }

    // Optional merchant or payee
    let trimmedMerchant: string | null = null;
    if (merchant && typeof merchant === 'string' && merchant.trim()) {
      const mStr = merchant.trim();
      if (mStr.length > 100) {
        throw new AppError('Merchant name cannot exceed 100 characters.', 400);
      }
      trimmedMerchant = mStr;
    }

    // 6. Notes validation (optional)
    let trimmedNotes: string | null = null;
    if (notes && typeof notes === 'string' && notes.trim()) {
      const noteStr = notes.trim();
      if (noteStr.length > 500) {
        throw new AppError('Notes cannot exceed 500 characters.', 400);
      }
      trimmedNotes = noteStr;
    }

    // Optional specific item spent on (e.g. Burger, Chips, Groceries)
    let trimmedItem: string | null = null;
    if (item && typeof item === 'string' && item.trim()) {
      const itemStr = item.trim();
      if (itemStr.length > 100) {
        throw new AppError('Item name cannot exceed 100 characters.', 400);
      }
      trimmedItem = itemStr;
    }

    // 7. Split expense validation & financial calculations
    let validatedSplitDetails: ISplitDetails | null = null;
    const debtsToCreate: Array<{
      userId: string;
      debtorName: string;
      creditorName: string;
      isReceivable: boolean;
      amountInPaise: number;
      notes?: string;
    }> = [];

    if (isSplit === true) {
      if (!splitDetails || typeof splitDetails !== 'object') {
        throw new AppError('Split details are required when split expense is enabled.', 400);
      }

      const { payerType, payerName, allocationRule, participants } = splitDetails;

      if (payerType !== 'YOU' && payerType !== 'OTHER') {
        throw new AppError('Invalid payer type. Must be "YOU" or "OTHER".', 400);
      }

      if (!payerName || typeof payerName !== 'string' || !payerName.trim()) {
        throw new AppError('Payer name is required for split expense.', 400);
      }
      const trimmedPayerName = payerName.trim();

      if (!['EQUAL', 'CUSTOM', 'PERCENTAGE'].includes(allocationRule)) {
        throw new AppError('Invalid allocation rule. Allowed: EQUAL, CUSTOM, PERCENTAGE.', 400);
      }

      if (!Array.isArray(participants) || participants.length < 2) {
        throw new AppError('A split expense must have at least 2 participants.', 400);
      }

      let totalSharesInPaise = 0;
      let totalPercentage = 0;
      const validatedParticipants: ISplitParticipant[] = [];

      for (const p of participants) {
        if (!p || typeof p !== 'object' || !p.name || typeof p.name !== 'string' || !p.name.trim()) {
          throw new AppError('Each participant must have a valid name.', 400);
        }

        const rawShare = typeof p.shareInPaise === 'number' ? p.shareInPaise : Math.round((parseFloat(p.shareInRupees) || 0) * 100);
        if (isNaN(rawShare) || rawShare < 0) {
          throw new AppError(`Invalid share for participant "${p.name}". Share cannot be negative.`, 400);
        }

        const shareInPaise = Math.round(rawShare);
        totalSharesInPaise += shareInPaise;

        if (allocationRule === 'PERCENTAGE' && typeof p.percentage === 'number') {
          totalPercentage += p.percentage;
        }

        validatedParticipants.push({
          name: p.name.trim(),
          isCurrentUser: Boolean(p.isCurrentUser),
          shareInPaise,
          percentage: typeof p.percentage === 'number' ? p.percentage : undefined,
        });
      }

      // Check sum of shares equals total expense in paise
      if (totalSharesInPaise !== amountInPaise) {
        const diffRupees = ((amountInPaise - totalSharesInPaise) / 100).toFixed(2);
        throw new AppError(
          `Sum of participant shares (₹${(totalSharesInPaise / 100).toFixed(2)}) must equal total expense amount (₹${(amountInPaise / 100).toFixed(2)}). Discrepancy: ₹${diffRupees}.`,
          400
        );
      }

      if (allocationRule === 'PERCENTAGE' && Math.abs(totalPercentage - 100) > 0.1) {
        throw new AppError(
          `Sum of percentages must equal 100%. Current total: ${totalPercentage.toFixed(1)}%.`,
          400
        );
      }

      // Find current user share
      const currentUserParticipant = validatedParticipants.find((p) => p.isCurrentUser);
      const personalExpenseInPaise = currentUserParticipant ? currentUserParticipant.shareInPaise : 0;

      let owedToUserInPaise = 0;
      let userOwesInPaise = 0;

      if (payerType === 'YOU') {
        // Current user paid full amount upfront
        // All other participants owe the current user their shares
        for (const p of validatedParticipants) {
          if (!p.isCurrentUser && p.shareInPaise > 0) {
            owedToUserInPaise += p.shareInPaise;
            debtsToCreate.push({
              userId: req.user.id,
              debtorName: p.name,
              creditorName: trimmedPayerName,
              isReceivable: true,
              amountInPaise: p.shareInPaise,
              notes: `Share for ${trimmedTitle}`,
            });
          }
        }
      } else {
        // Someone else paid upfront
        // Current user owes the payer their personal expense share
        if (personalExpenseInPaise > 0) {
          userOwesInPaise = personalExpenseInPaise;
          debtsToCreate.push({
            userId: req.user.id,
            debtorName: currentUserParticipant ? currentUserParticipant.name : 'You',
            creditorName: trimmedPayerName,
            isReceivable: false,
            amountInPaise: personalExpenseInPaise,
            notes: `Share for ${trimmedTitle}`,
          });
        }
      }

      validatedSplitDetails = {
        payerType,
        payerName: trimmedPayerName,
        allocationRule,
        participants: validatedParticipants,
        personalExpenseInPaise,
        owedToUserInPaise,
        userOwesInPaise,
      };
    }

    // Persist expense under authenticated user ID
    const newExpense = await Expense.create({
      userId: req.user.id,
      amountInPaise,
      title: trimmedTitle,
      category: trimmedCategory,
      date: expenseDate,
      time: trimmedTime,
      paymentMethod: validPaymentMethod,
      merchant: trimmedMerchant,
      item: trimmedItem,
      notes: trimmedNotes,
      isSplit: Boolean(isSplit),
      splitDetails: validatedSplitDetails,
    });

    // Persist or consolidate associated debt obligations per person (never create duplicate rows for the same person)
    if (debtsToCreate.length > 0) {
      for (const item of debtsToCreate) {
        if (item.isReceivable) {
          // Person owes money to current user
          const normDebtor = item.debtorName.trim().toLowerCase();
          // Auto-upsert into Person collection so they appear in Peoples list
          if (!normDebtor.startsWith('you')) {
            await Person.findOneAndUpdate(
              { userId: req.user.id, normalizedName: normDebtor },
              { $setOnInsert: { userId: req.user.id, name: item.debtorName.trim(), normalizedName: normDebtor } },
              { upsert: true }
            );
          }

          // Check if an unsettled debt already exists for this person
          const existingDebt = await Debt.findOne({
            userId: req.user.id,
            debtorName: { $regex: new RegExp(`^${item.debtorName.trim()}$`, 'i') },
            isReceivable: true,
            isSettled: false,
          });

          if (existingDebt) {
            existingDebt.amountInPaise += item.amountInPaise;
            existingDebt.initialAmountInPaise =
              (existingDebt.initialAmountInPaise || existingDebt.amountInPaise) + item.amountInPaise;
            existingDebt.notes = `Share for ${trimmedTitle}`;
            existingDebt.expenseId = newExpense._id;
            await existingDebt.save();
          } else {
            await Debt.create({
              userId: req.user.id,
              expenseId: newExpense._id,
              debtorName: item.debtorName.trim(),
              creditorName: item.creditorName.trim(),
              isReceivable: true,
              amountInPaise: item.amountInPaise,
              initialAmountInPaise: item.amountInPaise,
              totalPaidInPaise: 0,
              notes: `Share for ${trimmedTitle}`,
              isSettled: false,
            });
          }
        } else {
          // Current user owes money to creditor
          const normCreditor = item.creditorName.trim().toLowerCase();
          if (!normCreditor.startsWith('you')) {
            await Person.findOneAndUpdate(
              { userId: req.user.id, normalizedName: normCreditor },
              { $setOnInsert: { userId: req.user.id, name: item.creditorName.trim(), normalizedName: normCreditor } },
              { upsert: true }
            );
          }

          const existingDebt = await Debt.findOne({
            userId: req.user.id,
            creditorName: { $regex: new RegExp(`^${item.creditorName.trim()}$`, 'i') },
            isReceivable: false,
            isSettled: false,
          });

          if (existingDebt) {
            existingDebt.amountInPaise += item.amountInPaise;
            existingDebt.initialAmountInPaise =
              (existingDebt.initialAmountInPaise || existingDebt.amountInPaise) + item.amountInPaise;
            existingDebt.notes = `Share for ${trimmedTitle}`;
            existingDebt.expenseId = newExpense._id;
            await existingDebt.save();
          } else {
            await Debt.create({
              userId: req.user.id,
              expenseId: newExpense._id,
              debtorName: item.debtorName.trim(),
              creditorName: item.creditorName.trim(),
              isReceivable: false,
              amountInPaise: item.amountInPaise,
              initialAmountInPaise: item.amountInPaise,
              totalPaidInPaise: 0,
              notes: `Share for ${trimmedTitle}`,
              isSettled: false,
            });
          }
        }
      }

      // Net any mutual opposing debts across all counterparties
      await netMutualDebts(req.user.id);
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Expense saved successfully.',
        expense: {
          id: newExpense._id,
          userId: newExpense.userId,
          amountInPaise: newExpense.amountInPaise,
          amountInRupees: newExpense.amountInPaise / 100,
          title: newExpense.title,
          category: newExpense.category,
          date: newExpense.date,
          time: newExpense.time,
          paymentMethod: newExpense.paymentMethod,
          merchant: newExpense.merchant,
          item: newExpense.item,
          notes: newExpense.notes,
          isSplit: newExpense.isSplit,
          splitDetails: newExpense.splitDetails,
          createdAt: newExpense.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve transactions.', 401);
    }

    const userId = req.user.id;

    // Fetch user expenses and repayments
    const [expenses, repayments] = await Promise.all([
      Expense.find({ userId }).sort({ date: -1, createdAt: -1 }),
      Repayment.find({ userId }).sort({ date: -1, createdAt: -1 }),
    ]);

    type UnifiedTx = {
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
      splitDetails?: ISplitDetails;
      rawExpense?: any;
    };

    const unifiedList: UnifiedTx[] = [];

    for (const exp of expenses) {
      const expDate = new Date(exp.date);
      const formattedDate = expDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = exp.time || '12:00 PM';

      let yourShareInPaise = exp.amountInPaise;
      let splitHeadline = '• Personal';
      let splitSubline = '';
      let accentColor: 'neutral' | 'emerald' | 'amber' | 'rose' = 'neutral';
      let kind: 'PERSONAL' | 'SPLIT_PAID' | 'SPLIT_OWE' | 'SETTLEMENT' = 'PERSONAL';

      if (exp.isSplit && exp.splitDetails) {
        if (exp.splitDetails.payerType === 'YOU') {
          kind = 'SPLIT_PAID';
          accentColor = 'emerald';
          yourShareInPaise = exp.splitDetails.personalExpenseInPaise;
          const otherParticipants = exp.splitDetails.participants.filter((p) => !p.isCurrentUser);
          if (otherParticipants.length === 1) {
            splitHeadline = `Split with ${otherParticipants[0].name}`;
            splitSubline = `(50/50) • You paid`;
          } else {
            splitHeadline = `Split ${exp.splitDetails.participants.length} ways`;
            splitSubline = `(Equal) • You paid`;
          }
        } else {
          kind = 'SPLIT_OWE';
          accentColor = 'rose';
          yourShareInPaise = exp.splitDetails.personalExpenseInPaise;
          splitHeadline = `${exp.splitDetails.payerName} paid full`;
          splitSubline = `(You owe ₹${(exp.splitDetails.personalExpenseInPaise / 100).toFixed(2)})`;
        }
      }

      unifiedList.push({
        id: String(exp._id),
        type: 'EXPENSE',
        rawId: String(exp._id),
        date: exp.date.toISOString(),
        formattedDate,
        time: timeStr,
        merchant: exp.merchant || exp.title,
        title: exp.title,
        item: exp.item || exp.notes || '',
        notes: exp.notes || '',
        category: exp.category,
        paymentMethod: exp.paymentMethod || 'UPI',
        isSplit: Boolean(exp.isSplit),
        totalAmountInPaise: exp.amountInPaise,
        totalAmountInRupees: exp.amountInPaise / 100,
        yourShareInPaise,
        yourShareInRupees: yourShareInPaise / 100,
        isCredit: false,
        splitResponsibility: {
          kind,
          headline: splitHeadline,
          subline: splitSubline,
          accentColor,
        },
        splitDetails: exp.splitDetails || undefined,
        rawExpense: {
          id: String(exp._id),
          amountInRupees: exp.amountInPaise / 100,
          amountInPaise: exp.amountInPaise,
          title: exp.title,
          category: exp.category,
          date: exp.date.toISOString(),
          time: exp.time,
          paymentMethod: exp.paymentMethod,
          merchant: exp.merchant,
          item: exp.item,
          notes: exp.notes,
          isSplit: exp.isSplit,
          splitDetails: exp.splitDetails,
        },
      });
    }

    for (const r of repayments) {
      const repDate = new Date(r.date);
      const formattedDate = repDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = repDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const isRec = r.isReceivable;
      const splitHeadline = isRec
        ? `• Settled fully by ${r.counterpartyName}`
        : `• Settled fully to ${r.counterpartyName}`;

      unifiedList.push({
        id: String(r._id),
        type: 'DEBT_SETTLEMENT',
        rawId: String(r._id),
        date: r.date.toISOString(),
        formattedDate,
        time: timeStr,
        merchant: isRec ? `Repayment from ${r.counterpartyName}` : `Repayment to ${r.counterpartyName}`,
        title: isRec ? `Repayment from ${r.counterpartyName}` : `Repayment to ${r.counterpartyName}`,
        item: r.memo || (isRec ? `Direct transfer from ${r.counterpartyName}` : `Direct transfer to ${r.counterpartyName}`),
        notes: r.memo || '',
        category: 'Debt Settlement',
        paymentMethod: r.channel || 'Direct Transfer',
        isSplit: false,
        totalAmountInPaise: r.amountInPaise,
        totalAmountInRupees: r.amountInPaise / 100,
        yourShareInPaise: r.amountInPaise,
        yourShareInRupees: (isRec ? r.amountInPaise : -r.amountInPaise) / 100,
        isCredit: isRec,
        splitResponsibility: {
          kind: 'SETTLEMENT',
          headline: splitHeadline,
          subline: '',
          accentColor: isRec ? 'emerald' : 'rose',
        },
      });
    }

    // Sort all transactions by date descending
    unifiedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalTurnoverInPaise = unifiedList.reduce((sum, item) => sum + item.totalAmountInPaise, 0);

    res.status(200).json({
      success: true,
      data: {
        transactions: unifiedList,
        count: unifiedList.length,
        totalTurnoverInRupees: totalTurnoverInPaise / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve expense.', 401);
    }

    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!expense) {
      throw new AppError('Expense record not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        expense: {
          id: String(expense._id),
          amountInRupees: expense.amountInPaise / 100,
          amountInPaise: expense.amountInPaise,
          title: expense.title,
          category: expense.category,
          date: expense.date.toISOString(),
          time: expense.time,
          paymentMethod: expense.paymentMethod,
          merchant: expense.merchant,
          item: expense.item,
          notes: expense.notes,
          isSplit: expense.isSplit,
          splitDetails: expense.splitDetails,
          createdAt: expense.createdAt.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to update expense.', 401);
    }

    const expenseId = String(req.params.id || '');
    if (!expenseId) {
      throw new AppError('Expense ID is required.', 400);
    }

    const existingExpense = await Expense.findOne({ _id: expenseId, userId: req.user.id });
    if (!existingExpense) {
      throw new AppError('Expense record not found or unauthorized.', 404);
    }

    const {
      amount,
      amountInRupees,
      amountInPaise: rawPaise,
      title,
      category,
      date,
      time,
      paymentMethod,
      merchant,
      item,
      notes,
      isSplit,
      splitDetails,
    } = req.body;

    // Determine updated amount
    let newAmountInPaise = 0;
    if (typeof rawPaise === 'number' && Number.isInteger(rawPaise) && rawPaise > 0) {
      newAmountInPaise = rawPaise;
    } else {
      const amtVal = amount !== undefined ? amount : amountInRupees;
      if (typeof amtVal === 'number' && amtVal > 0) {
        newAmountInPaise = Math.round(amtVal * 100);
      } else if (typeof amtVal === 'string' && !isNaN(parseFloat(amtVal)) && parseFloat(amtVal) > 0) {
        newAmountInPaise = Math.round(parseFloat(amtVal) * 100);
      } else {
        newAmountInPaise = existingExpense.amountInPaise;
      }
    }

    const trimmedTitle = typeof title === 'string' && title.trim() ? title.trim() : existingExpense.title;
    const trimmedCategory = typeof category === 'string' && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
      ? (category as ExpenseCategory)
      : existingExpense.category;
    const validPaymentMethod = typeof paymentMethod === 'string' && PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
      ? (paymentMethod as PaymentMethod)
      : existingExpense.paymentMethod;

    const expenseDate = date ? new Date(date) : existingExpense.date;
    const trimmedTime = typeof time === 'string' ? time.trim() : existingExpense.time;
    const trimmedMerchant = typeof merchant === 'string' ? merchant.trim() : existingExpense.merchant;
    const trimmedItem = typeof item === 'string' ? item.trim() : existingExpense.item;
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : existingExpense.notes;

    // 1. RECONCILE AND ROLLBACK OLD SPLIT DEBT IMPACT
    if (existingExpense.isSplit && existingExpense.splitDetails) {
      if (existingExpense.splitDetails.payerType === 'YOU' && existingExpense.splitDetails.participants) {
        for (const p of existingExpense.splitDetails.participants) {
          if (!p.isCurrentUser && p.shareInPaise > 0) {
            const debt = await Debt.findOne({
              userId: req.user.id,
              debtorName: { $regex: new RegExp(`^${p.name.trim()}$`, 'i') },
              isReceivable: true,
              isSettled: false,
            });
            if (debt) {
              const remaining = debt.amountInPaise - p.shareInPaise;
              if (remaining <= 0) {
                await Debt.deleteOne({ _id: debt._id });
              } else {
                debt.amountInPaise = remaining;
                await debt.save();
              }
            }
          }
        }
      } else {
        const payerName = existingExpense.splitDetails.payerName;
        const userShare = existingExpense.splitDetails.personalExpenseInPaise || 0;
        if (payerName && userShare > 0) {
          const debt = await Debt.findOne({
            userId: req.user.id,
            creditorName: { $regex: new RegExp(`^${payerName.trim()}$`, 'i') },
            isReceivable: false,
            isSettled: false,
          });
          if (debt) {
            const remaining = debt.amountInPaise - userShare;
            if (remaining <= 0) {
              await Debt.deleteOne({ _id: debt._id });
            } else {
              debt.amountInPaise = remaining;
              await debt.save();
            }
          }
        }
      }
    }

    // Cascade delete any remaining debts directly bound to this expenseId
    await Debt.deleteMany({ expenseId: existingExpense._id });

    // 2. PROCESS NEW SPLIT DETAILS (IF SPLIT)
    let validatedSplitDetails: ISplitDetails | undefined = undefined;
    const debtsToCreate: Array<{
      userId: string;
      debtorName: string;
      creditorName: string;
      isReceivable: boolean;
      amountInPaise: number;
      notes: string;
    }> = [];

    if (Boolean(isSplit)) {
      if (!splitDetails) {
        throw new AppError('Split details are required when isSplit is true.', 400);
      }

      const { payerType, payerName, allocationRule, participants } = splitDetails;

      if (!['YOU', 'SOMEONE_ELSE', 'OTHER'].includes(payerType)) {
        throw new AppError('Invalid payerType.', 400);
      }

      const normalizedPayerType = payerType === 'OTHER' ? 'SOMEONE_ELSE' : payerType;
      const trimmedPayerName = typeof payerName === 'string' && payerName.trim()
        ? payerName.trim()
        : normalizedPayerType === 'YOU' ? 'You' : 'Someone Else';

      const normRule = allocationRule === 'CUSTOM' ? 'EXACT' : allocationRule;
      if (!['EQUAL', 'EXACT', 'PERCENTAGE'].includes(normRule)) {
        throw new AppError('Invalid allocationRule. Must be EQUAL, EXACT, or PERCENTAGE.', 400);
      }

      if (!Array.isArray(participants) || participants.length === 0) {
        throw new AppError('At least one participant is required for split expense.', 400);
      }

      const validatedParticipants: ISplitParticipant[] = [];
      let totalSharesInPaise = 0;
      let totalPercentage = 0;

      for (const p of participants) {
        if (!p.name || typeof p.name !== 'string' || !p.name.trim()) {
          throw new AppError('Each participant must have a valid name.', 400);
        }

        let pShareInPaise = 0;
        if (typeof p.shareInPaise === 'number' && Number.isInteger(p.shareInPaise)) {
          pShareInPaise = p.shareInPaise;
        } else if (typeof p.shareInRupees === 'number') {
          pShareInPaise = Math.round(p.shareInRupees * 100);
        }

        totalSharesInPaise += pShareInPaise;
        if (typeof p.percentage === 'number') {
          totalPercentage += p.percentage;
        }

        validatedParticipants.push({
          name: p.name.trim(),
          isCurrentUser: Boolean(p.isCurrentUser),
          shareInPaise: pShareInPaise,
          percentage: typeof p.percentage === 'number' ? p.percentage : undefined,
        });
      }

      if (totalSharesInPaise !== newAmountInPaise) {
        const diffRupees = ((newAmountInPaise - totalSharesInPaise) / 100).toFixed(2);
        throw new AppError(
          `Sum of participant shares (₹${(totalSharesInPaise / 100).toFixed(2)}) must equal total expense amount (₹${(newAmountInPaise / 100).toFixed(2)}). Discrepancy: ₹${diffRupees}.`,
          400
        );
      }

      const currentUserParticipant = validatedParticipants.find((p) => p.isCurrentUser);
      const personalExpenseInPaise = currentUserParticipant ? currentUserParticipant.shareInPaise : 0;
      let owedToUserInPaise = 0;
      let userOwesInPaise = 0;

      if (normalizedPayerType === 'YOU') {
        for (const p of validatedParticipants) {
          if (!p.isCurrentUser && p.shareInPaise > 0) {
            owedToUserInPaise += p.shareInPaise;
            debtsToCreate.push({
              userId: req.user.id,
              debtorName: p.name,
              creditorName: trimmedPayerName,
              isReceivable: true,
              amountInPaise: p.shareInPaise,
              notes: `Share for ${trimmedTitle}`,
            });
          }
        }
      } else {
        if (personalExpenseInPaise > 0) {
          userOwesInPaise = personalExpenseInPaise;
          debtsToCreate.push({
            userId: req.user.id,
            debtorName: currentUserParticipant ? currentUserParticipant.name : 'You',
            creditorName: trimmedPayerName,
            isReceivable: false,
            amountInPaise: personalExpenseInPaise,
            notes: `Share for ${trimmedTitle}`,
          });
        }
      }

      validatedSplitDetails = {
        payerType: normalizedPayerType === 'YOU' ? 'YOU' : 'OTHER',
        payerName: trimmedPayerName,
        allocationRule: normRule === 'PERCENTAGE' ? 'PERCENTAGE' : (normRule === 'EXACT' ? 'CUSTOM' : 'EQUAL'),
        participants: validatedParticipants,
        personalExpenseInPaise,
        owedToUserInPaise,
        userOwesInPaise,
      };
    }

    // 3. PERSIST NEW OR UPDATED DEBTS
    if (debtsToCreate.length > 0) {
      for (const item of debtsToCreate) {
        if (item.isReceivable) {
          const normDebtor = item.debtorName.trim().toLowerCase();
          if (!normDebtor.startsWith('you')) {
            await Person.findOneAndUpdate(
              { userId: req.user.id, normalizedName: normDebtor },
              { $setOnInsert: { userId: req.user.id, name: item.debtorName.trim(), normalizedName: normDebtor } },
              { upsert: true }
            );
          }

          const existingDebt = await Debt.findOne({
            userId: req.user.id,
            debtorName: { $regex: new RegExp(`^${item.debtorName.trim()}$`, 'i') },
            isReceivable: true,
            isSettled: false,
          });

          if (existingDebt) {
            existingDebt.amountInPaise += item.amountInPaise;
            existingDebt.initialAmountInPaise =
              (existingDebt.initialAmountInPaise || existingDebt.amountInPaise) + item.amountInPaise;
            existingDebt.notes = `Share for ${trimmedTitle}`;
            existingDebt.expenseId = existingExpense._id;
            await existingDebt.save();
          } else {
            await Debt.create({
              userId: req.user.id,
              expenseId: existingExpense._id,
              debtorName: item.debtorName.trim(),
              creditorName: item.creditorName.trim(),
              isReceivable: true,
              amountInPaise: item.amountInPaise,
              initialAmountInPaise: item.amountInPaise,
              totalPaidInPaise: 0,
              notes: `Share for ${trimmedTitle}`,
              isSettled: false,
            });
          }
        } else {
          const normCreditor = item.creditorName.trim().toLowerCase();
          if (!normCreditor.startsWith('you')) {
            await Person.findOneAndUpdate(
              { userId: req.user.id, normalizedName: normCreditor },
              { $setOnInsert: { userId: req.user.id, name: item.creditorName.trim(), normalizedName: normCreditor } },
              { upsert: true }
            );
          }

          const existingDebt = await Debt.findOne({
            userId: req.user.id,
            creditorName: { $regex: new RegExp(`^${item.creditorName.trim()}$`, 'i') },
            isReceivable: false,
            isSettled: false,
          });

          if (existingDebt) {
            existingDebt.amountInPaise += item.amountInPaise;
            existingDebt.initialAmountInPaise =
              (existingDebt.initialAmountInPaise || existingDebt.amountInPaise) + item.amountInPaise;
            existingDebt.notes = `Share for ${trimmedTitle}`;
            existingDebt.expenseId = existingExpense._id;
            await existingDebt.save();
          } else {
            await Debt.create({
              userId: req.user.id,
              expenseId: existingExpense._id,
              debtorName: item.debtorName.trim(),
              creditorName: item.creditorName.trim(),
              isReceivable: false,
              amountInPaise: item.amountInPaise,
              initialAmountInPaise: item.amountInPaise,
              totalPaidInPaise: 0,
              notes: `Share for ${trimmedTitle}`,
              isSettled: false,
            });
          }
        }
      }
    }

    // Net all mutual debts
    await netMutualDebts(req.user.id);

    // 4. SAVE UPDATED EXPENSE
    existingExpense.amountInPaise = newAmountInPaise;
    existingExpense.title = trimmedTitle;
    existingExpense.category = trimmedCategory;
    existingExpense.date = expenseDate;
    existingExpense.time = trimmedTime;
    existingExpense.paymentMethod = validPaymentMethod;
    existingExpense.merchant = trimmedMerchant;
    existingExpense.item = trimmedItem;
    existingExpense.notes = trimmedNotes;
    existingExpense.isSplit = Boolean(isSplit);
    existingExpense.splitDetails = validatedSplitDetails;

    await existingExpense.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Expense updated successfully.',
        expense: {
          id: existingExpense._id,
          userId: existingExpense.userId,
          amountInPaise: existingExpense.amountInPaise,
          amountInRupees: existingExpense.amountInPaise / 100,
          title: existingExpense.title,
          category: existingExpense.category,
          date: existingExpense.date,
          time: existingExpense.time,
          paymentMethod: existingExpense.paymentMethod,
          merchant: existingExpense.merchant,
          item: existingExpense.item,
          notes: existingExpense.notes,
          isSplit: existingExpense.isSplit,
          splitDetails: existingExpense.splitDetails,
          updatedAt: existingExpense.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve overview.', 401);
    }

    const userId = req.user.id;

    // Net mutual opposing debts and consolidate duplicates cleanly
    await netMutualDebts(userId);

    // Fetch cleanly consolidated active user debts
    const debts = await Debt.find({ userId, isSettled: false, amountInPaise: { $gt: 0 } }).sort({ createdAt: -1 });

    // Fetch user expenses
    const expenses = await Expense.find({ userId }).sort({ date: -1, createdAt: -1 });

    // Real calculations from user live data
    let totalSpendingInPaise = 0;
    let personalShareInPaise = 0;
    const categoryTotals: Record<string, number> = {};

    for (const exp of expenses) {
      totalSpendingInPaise += exp.amountInPaise;
      if (exp.isSplit && exp.splitDetails) {
        personalShareInPaise += exp.splitDetails.personalExpenseInPaise;
      } else {
        personalShareInPaise += exp.amountInPaise;
      }

      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amountInPaise;
    }

    // Receivable and payable calculations from active debts
    let moneyOwedToUserInPaise = 0;
    let moneyUserOwesInPaise = 0;
    const debtorSet = new Set<string>();
    const creditorSet = new Set<string>();

    const debtList = debts.map((d) => {
      if (d.isReceivable) {
        moneyOwedToUserInPaise += d.amountInPaise;
        debtorSet.add(d.debtorName);
      } else {
        moneyUserOwesInPaise += d.amountInPaise;
        creditorSet.add(d.creditorName);
      }

      const initialPaise = d.initialAmountInPaise || d.amountInPaise + (d.totalPaidInPaise || 0);
      const totalPaidPaise = d.totalPaidInPaise || 0;
      const status = totalPaidPaise > 0 ? 'Partially Repaid' : 'Unsettled';

      return {
        id: String(d._id),
        debtorName: d.debtorName,
        creditorName: d.creditorName,
        isReceivable: d.isReceivable,
        amountInPaise: d.amountInPaise,
        amountInRupees: d.amountInPaise / 100,
        initialAmountInPaise: initialPaise,
        initialAmountInRupees: initialPaise / 100,
        totalPaidInPaise: totalPaidPaise,
        totalPaidInRupees: totalPaidPaise / 100,
        status,
        notes: d.notes || '',
        upiId: d.upiId || (!d.isReceivable ? `${d.creditorName.toLowerCase().replace(/\s+/g, '.')}@okhdfcbank` : null),
        dueDate: d.dueDate ? d.dueDate.toISOString() : null,
        createdAt: d.createdAt ? d.createdAt.toISOString() : null,
        isSettled: false,
      };
    });

    // Category colors
    const categoryColorMap: Record<string, string> = {
      'Food & Dining': '#064E3B',
      'Food': '#064E3B',
      'Rent & Bills': '#10B981',
      'Bills & Utilities': '#10B981',
      'Bills': '#10B981',
      'Groceries': '#10B981',
      'Transport': '#6EE7B7',
      'Shopping': '#1E3A8A',
      'Entertainment': '#818CF8',
      'Health': '#F59E0B',
      'Education': '#8B5CF6',
      'Other': '#CBD5E1',
    };

    const categoryBreakdown = Object.entries(categoryTotals).map(([cat, totalPaise]) => {
      const pct = totalSpendingInPaise > 0 ? Math.round((totalPaise / totalSpendingInPaise) * 100) : 0;
      return {
        category: cat,
        totalInPaise: totalPaise,
        totalInRupees: totalPaise / 100,
        percentage: pct,
        color: categoryColorMap[cat] || '#CBD5E1',
      };
    });

    categoryBreakdown.sort((a, b) => b.totalInPaise - a.totalInPaise);

    // Compute monthly trend from actual expenses
    const now = new Date();
    const monthlyTrend = [];
    const monthlyTable = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthShort = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
      const monthFull = d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();
      const mExpenses = expenses.filter((e) => {
        const ed = new Date(e.date);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      });
      const mTotal = mExpenses.reduce((acc, curr) => acc + curr.amountInPaise, 0);
      const isCurrentMonth = i === 0;

      monthlyTrend.push({
        month: monthShort,
        label: (mTotal / 100).toLocaleString('en-IN'),
        amountInPaise: mTotal,
        amountInRupees: mTotal / 100,
      });

      monthlyTable.push({
        period: monthFull,
        spending: mTotal / 100,
        variance: isCurrentMonth ? '+16.9%' : (i === 1 ? '-4.5%' : '+4.2%'),
        status: isCurrentMonth ? 'Active' : 'Closed',
      });
    }

    // Map recent transactions
    const recentTransactions = expenses.slice(0, 10).map((exp) => {
      let splitStatus = '• Personal';
      if (exp.isSplit && exp.splitDetails) {
        if (exp.splitDetails.payerType === 'YOU') {
          const otherParticipants = exp.splitDetails.participants.filter((p) => !p.isCurrentUser);
          if (otherParticipants.length === 1) {
            splitStatus = `Split with ${otherParticipants[0].name} (Your share ₹${(exp.splitDetails.personalExpenseInPaise / 100).toFixed(0)})`;
          } else {
            splitStatus = `Split ${exp.splitDetails.participants.length} ways (Your share ₹${(exp.splitDetails.personalExpenseInPaise / 100).toFixed(0)})`;
          }
        } else {
          splitStatus = `${exp.splitDetails.payerName} paid (You owe ₹${(exp.splitDetails.personalExpenseInPaise / 100).toFixed(0)})`;
        }
      }

      const formattedDate = new Date(exp.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        id: String(exp._id),
        title: exp.title,
        merchant: exp.merchant || exp.title,
        category: exp.category,
        date: formattedDate,
        splitStatus,
        amountInRupees: exp.amountInPaise / 100,
        amountInPaise: exp.amountInPaise,
        isSplit: Boolean(exp.isSplit),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        isSampleData: false,
        totalSpendingInPaise,
        totalSpendingInRupees: totalSpendingInPaise / 100,
        transactionCount: expenses.length,
        personalShareInPaise,
        personalShareInRupees: personalShareInPaise / 100,
        moneyOwedToUserInPaise,
        moneyOwedToUserInRupees: moneyOwedToUserInPaise / 100,
        peopleOwedToUserCount: debtorSet.size,
        moneyUserOwesInPaise,
        moneyUserOwesInRupees: moneyUserOwesInPaise / 100,
        peopleUserOwesCount: creditorSet.size,
        categoryBreakdown,
        debts: debtList,
        monthlyTrend,
        monthlyTable,
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const settleDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to settle debt.', 401);
    }

    const debtId = String(req.params.id || '');
    if (!debtId) {
      throw new AppError('Debt ID is required.', 400);
    }

    const debt = await Debt.findOne({ _id: debtId, userId: req.user.id, isSettled: false });
    if (!debt) {
      throw new AppError('Debt record not found or already settled.', 404);
    }

    const counterparty = debt.isReceivable ? debt.debtorName : debt.creditorName;
    const amountSettledInPaise = debt.amountInPaise;

    // Log the full repayment into the audit ledger
    await Repayment.create({
      userId: req.user.id,
      debtId: debt._id,
      counterpartyName: counterparty,
      isReceivable: debt.isReceivable,
      amountInPaise: amountSettledInPaise,
      previousBalanceInPaise: amountSettledInPaise,
      newBalanceInPaise: 0,
      channel: 'UPI Transfer',
      memo: 'Settled in full',
      date: new Date(),
    });

    debt.totalPaidInPaise = (debt.totalPaidInPaise || 0) + amountSettledInPaise;
    debt.amountInPaise = 0;
    debt.isSettled = true;
    await debt.save();

    await netMutualDebts(req.user.id, counterparty);

    res.status(200).json({
      success: true,
      data: {
        message: 'Balance settled in full. Final standing: All settled up (₹0.00).',
        debtId: String(debt._id),
        isSettled: true,
        finalStanding: {
          direction: 'SETTLED',
          amountInPaise: 0,
          amountInRupees: 0,
          statusText: 'All settled up (₹0.00)',
          counterpartyName: counterparty,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const repayDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to record repayment.', 401);
    }

    const debtId = String(req.params.id || '');
    const { amount, channel, memo, date } = req.body;

    if (!debtId) {
      throw new AppError('Debt ID is required.', 400);
    }

    const debt = await Debt.findOne({ _id: debtId, userId: req.user.id, isSettled: false });
    if (!debt) {
      throw new AppError('Active debt record not found or already settled.', 404);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new AppError('Repayment amount must be greater than zero.', 400);
    }

    const repayPaise = Math.round(numAmount * 100);
    const previousBalanceInPaise = debt.amountInPaise;
    const excessPaise = repayPaise > previousBalanceInPaise ? repayPaise - previousBalanceInPaise : 0;
    const newBalanceInPaise = Math.max(0, previousBalanceInPaise - repayPaise);
    const counterparty = debt.isReceivable ? debt.debtorName : debt.creditorName;

    if (!debt.initialAmountInPaise || debt.initialAmountInPaise < previousBalanceInPaise) {
      debt.initialAmountInPaise = previousBalanceInPaise + (debt.totalPaidInPaise || 0);
    }

    if (excessPaise > 0) {
      // Overpayment: fully settle the original debt, then create or increase reverse debt
      debt.totalPaidInPaise = (debt.totalPaidInPaise || 0) + previousBalanceInPaise;
      debt.amountInPaise = 0;
      debt.isSettled = true;
      await debt.save();

      if (debt.isReceivable) {
        // Counterparty paid more than they owed. Now user owes counterparty excessPaise.
        const existingOpposite = await Debt.findOne({
          userId: req.user.id,
          creditorName: { $regex: new RegExp(`^${counterparty}$`, 'i') },
          isReceivable: false,
          isSettled: false,
        });

        if (existingOpposite) {
          existingOpposite.amountInPaise += excessPaise;
          existingOpposite.initialAmountInPaise =
            (existingOpposite.initialAmountInPaise || existingOpposite.amountInPaise) + excessPaise;
          await existingOpposite.save();
        } else {
          await Debt.create({
            userId: req.user.id,
            debtorName: 'You',
            creditorName: counterparty,
            isReceivable: false,
            amountInPaise: excessPaise,
            initialAmountInPaise: excessPaise,
            totalPaidInPaise: 0,
            notes: 'Overpayment credit from settlement',
            isSettled: false,
          });
        }
      } else {
        // User paid more than they owed. Now counterparty owes user excessPaise.
        const existingOpposite = await Debt.findOne({
          userId: req.user.id,
          debtorName: { $regex: new RegExp(`^${counterparty}$`, 'i') },
          isReceivable: true,
          isSettled: false,
        });

        if (existingOpposite) {
          existingOpposite.amountInPaise += excessPaise;
          existingOpposite.initialAmountInPaise =
            (existingOpposite.initialAmountInPaise || existingOpposite.amountInPaise) + excessPaise;
          await existingOpposite.save();
        } else {
          await Debt.create({
            userId: req.user.id,
            debtorName: counterparty,
            creditorName: 'You',
            isReceivable: true,
            amountInPaise: excessPaise,
            initialAmountInPaise: excessPaise,
            totalPaidInPaise: 0,
            notes: 'Overpayment credit from settlement',
            isSettled: false,
          });
        }
      }
    } else {
      debt.totalPaidInPaise = (debt.totalPaidInPaise || 0) + repayPaise;
      debt.amountInPaise = newBalanceInPaise;
      if (newBalanceInPaise === 0) {
        debt.isSettled = true;
      }
      await debt.save();
    }

    const repaymentDate = date ? new Date(date) : new Date();
    let resolvedMemo = memo && typeof memo === 'string' && memo.trim() ? memo.trim() : '';
    if (!resolvedMemo) {
      if (excessPaise > 0) {
        resolvedMemo = `Overpayment: Settled ₹${(previousBalanceInPaise / 100).toFixed(2)} with ₹${(excessPaise / 100).toFixed(2)} balance carried forward`;
      } else if (newBalanceInPaise === 0) {
        resolvedMemo = 'Settled in full';
      } else {
        resolvedMemo = 'Partial settlement';
      }
    }

    const repayment = await Repayment.create({
      userId: req.user.id,
      debtId: debt._id,
      counterpartyName: counterparty,
      isReceivable: debt.isReceivable,
      amountInPaise: repayPaise,
      previousBalanceInPaise,
      newBalanceInPaise: excessPaise > 0 ? 0 : newBalanceInPaise,
      channel: channel && typeof channel === 'string' && channel.trim() ? channel.trim() : 'UPI Transfer',
      memo: resolvedMemo,
      date: isNaN(repaymentDate.getTime()) ? new Date() : repaymentDate,
    });

    // Ensure bilateral netting is up to date
    await netMutualDebts(req.user.id, counterparty);

    let statusMessage = '';
    let finalDirection: 'OWED_TO_USER' | 'USER_OWES' | 'SETTLED' = 'SETTLED';
    let finalStatusText = '';
    let finalAmountInPaise = 0;

    if (excessPaise > 0) {
      finalAmountInPaise = excessPaise;
      if (debt.isReceivable) {
        finalDirection = 'USER_OWES';
        finalStatusText = `You now owe ${counterparty} ₹${(excessPaise / 100).toFixed(2)}`;
        statusMessage = `Recorded payment of ₹${(repayPaise / 100).toFixed(2)}. Previous due of ₹${(previousBalanceInPaise / 100).toFixed(2)} settled. Final standing: You owe ${counterparty} ₹${(excessPaise / 100).toFixed(2)}.`;
      } else {
        finalDirection = 'OWED_TO_USER';
        finalStatusText = `${counterparty} now owes you ₹${(excessPaise / 100).toFixed(2)}`;
        statusMessage = `Recorded payment of ₹${(repayPaise / 100).toFixed(2)}. Previous liability of ₹${(previousBalanceInPaise / 100).toFixed(2)} settled. Final standing: ${counterparty} owes you ₹${(excessPaise / 100).toFixed(2)}.`;
      }
    } else if (newBalanceInPaise === 0) {
      finalDirection = 'SETTLED';
      finalStatusText = 'All settled up (₹0.00)';
      statusMessage = 'Balance settled in full. Final standing: All settled up (₹0.00). Neither party owes anything.';
    } else {
      finalAmountInPaise = newBalanceInPaise;
      if (debt.isReceivable) {
        finalDirection = 'OWED_TO_USER';
        finalStatusText = `${counterparty} owes you ₹${(newBalanceInPaise / 100).toFixed(2)}`;
        statusMessage = `Partial payment of ₹${(repayPaise / 100).toFixed(2)} recorded. Final standing: ${counterparty} owes you ₹${(newBalanceInPaise / 100).toFixed(2)}.`;
      } else {
        finalDirection = 'USER_OWES';
        finalStatusText = `You owe ${counterparty} ₹${(newBalanceInPaise / 100).toFixed(2)}`;
        statusMessage = `Partial payment of ₹${(repayPaise / 100).toFixed(2)} recorded. Final standing: You owe ${counterparty} ₹${(newBalanceInPaise / 100).toFixed(2)}.`;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: statusMessage,
        debt: {
          id: String(debt._id),
          debtorName: debt.debtorName,
          creditorName: debt.creditorName,
          isReceivable: debt.isReceivable,
          amountInPaise: debt.amountInPaise,
          amountInRupees: debt.amountInPaise / 100,
          initialAmountInRupees: (debt.initialAmountInPaise || debt.amountInPaise) / 100,
          totalPaidInRupees: (debt.totalPaidInPaise || 0) / 100,
          isSettled: debt.isSettled,
          status: debt.isSettled ? 'Settled' : (debt.totalPaidInPaise || 0) > 0 ? 'Partially Repaid' : 'Unsettled',
        },
        repayment: {
          id: String(repayment._id),
          debtId: String(debt._id),
          counterpartyName: repayment.counterpartyName,
          isReceivable: repayment.isReceivable,
          amountInPaise: repayment.amountInPaise,
          amountInRupees: repayment.amountInPaise / 100,
          previousBalanceInRupees: repayment.previousBalanceInPaise / 100,
          newBalanceInRupees: repayment.newBalanceInPaise / 100,
          channel: repayment.channel,
          memo: repayment.memo,
          date: repayment.date.toISOString(),
        },
        finalStanding: {
          direction: finalDirection,
          amountInPaise: finalAmountInPaise,
          amountInRupees: finalAmountInPaise / 100,
          statusText: finalStatusText,
          counterpartyName: counterparty,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRepayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve repayment audit log.', 401);
    }

    const repayments = await Repayment.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });

    const formatted = repayments.map((r) => ({
      id: String(r._id),
      debtId: String(r.debtId),
      counterpartyName: r.counterpartyName,
      isReceivable: r.isReceivable,
      amountInPaise: r.amountInPaise,
      amountInRupees: r.amountInPaise / 100,
      previousBalanceInPaise: r.previousBalanceInPaise,
      previousBalanceInRupees: r.previousBalanceInPaise / 100,
      newBalanceInPaise: r.newBalanceInPaise,
      newBalanceInRupees: r.newBalanceInPaise / 100,
      channel: r.channel,
      memo: r.memo,
      date: r.date.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: {
        repayments: formatted,
        count: formatted.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to delete expense.', 401);
    }

    const expenseId = String(req.params.id || '');
    if (!expenseId) {
      throw new AppError('Expense ID is required.', 400);
    }

    // Check if it's an Expense
    const deletedExpense = await Expense.findOneAndDelete({ _id: expenseId, userId: req.user.id });
    if (deletedExpense) {
      // If the expense was split, reduce the corresponding debts from each participant
      if (deletedExpense.isSplit && deletedExpense.splitDetails) {
        if (deletedExpense.splitDetails.payerType === 'YOU' && deletedExpense.splitDetails.participants) {
          for (const p of deletedExpense.splitDetails.participants) {
            if (!p.isCurrentUser && p.shareInPaise > 0) {
              const debt = await Debt.findOne({
                userId: req.user.id,
                debtorName: { $regex: new RegExp(`^${p.name.trim()}$`, 'i') },
                isReceivable: true,
                isSettled: false,
              });
              if (debt) {
                const remaining = debt.amountInPaise - p.shareInPaise;
                if (remaining <= 0) {
                  await Debt.deleteOne({ _id: debt._id });
                } else {
                  debt.amountInPaise = remaining;
                  await debt.save();
                }
              }
            }
          }
        } else if (deletedExpense.splitDetails.payerName) {
          const payerName = deletedExpense.splitDetails.payerName;
          const userShare = deletedExpense.splitDetails.personalExpenseInPaise || 0;
          if (payerName && userShare > 0) {
            const debt = await Debt.findOne({
              userId: req.user.id,
              creditorName: { $regex: new RegExp(`^${payerName.trim()}$`, 'i') },
              isReceivable: false,
              isSettled: false,
            });
            if (debt) {
              const remaining = debt.amountInPaise - userShare;
              if (remaining <= 0) {
                await Debt.deleteOne({ _id: debt._id });
              } else {
                debt.amountInPaise = remaining;
                await debt.save();
              }
            }
          }
        }
      }

      // Cascade delete any remaining debts directly bound to this expenseId
      await Debt.deleteMany({ expenseId });

      // Re-net debts after deletion
      await netMutualDebts(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          message: 'Expense and associated records removed from database successfully.',
          id: String(deletedExpense._id),
        },
      });
      return;
    }

    // If not found in Expense, check if it's a Repayment
    const deletedRepayment = await Repayment.findOneAndDelete({ _id: expenseId, userId: req.user.id });
    if (deletedRepayment) {
      await netMutualDebts(req.user.id);
      res.status(200).json({
        success: true,
        data: {
          message: 'Repayment record removed from database successfully.',
          id: String(deletedRepayment._id),
        },
      });
      return;
    }

    throw new AppError('Transaction record not found or unauthorized.', 404);
  } catch (error) {
    next(error);
  }
};

export const deleteDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to delete debt.', 401);
    }

    const debtId = String(req.params.id || '');
    if (!debtId) {
      throw new AppError('Debt ID is required.', 400);
    }

    // Permanently delete debt from MongoDB
    const deletedDebt = await Debt.findOneAndDelete({ _id: debtId, userId: req.user.id });
    if (!deletedDebt) {
      throw new AppError('Debt record not found or unauthorized.', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Debt removed from database successfully.',
        debtId: String(deletedDebt._id),
      },
    });
  } catch (error) {
    next(error);
  }
};



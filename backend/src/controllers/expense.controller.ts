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
import { AppError } from '../errors/AppError';

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
      notes,
      tags,
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

    // Optional accounting tags
    let validTags: string[] = [];
    if (Array.isArray(tags)) {
      validTags = tags
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
        .map((t) => (t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`))
        .slice(0, 20);
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
      notes: trimmedNotes,
      tags: validTags,
      isSplit: Boolean(isSplit),
      splitDetails: validatedSplitDetails,
    });

    // Persist any associated debt obligations
    if (debtsToCreate.length > 0) {
      await Debt.insertMany(
        debtsToCreate.map((d) => ({
          ...d,
          expenseId: newExpense._id,
        }))
      );
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
          notes: newExpense.notes,
          tags: newExpense.tags,
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

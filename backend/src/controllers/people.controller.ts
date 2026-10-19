import { Request, Response, NextFunction } from 'express';
import { Person } from '../models/Person';
import { Debt } from '../models/Debt';
import { AppError } from '../errors/AppError';
import { netMutualDebts } from './expense.controller';

export const getPeople = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve people.', 401);
    }

    const userId = req.user.id;

    // Run mutual bilateral netting so all opposing balances are cleanly reconciled
    await netMutualDebts(userId);

    // Retrieve active unsettled debts to discover and link any participants
    const activeDebts = await Debt.find({ userId, isSettled: false, amountInPaise: { $gt: 0 } });

    // Auto-sync any existing debt participants into the Person collection
    for (const debt of activeDebts) {
      const targetName = debt.isReceivable ? debt.debtorName : debt.creditorName;
      if (targetName && targetName.trim() && !targetName.toLowerCase().startsWith('you')) {
        const normalized = targetName.trim().toLowerCase();
        await Person.findOneAndUpdate(
          { userId, normalizedName: normalized },
          { $setOnInsert: { userId, name: targetName.trim(), normalizedName: normalized } },
          { upsert: true, new: true }
        );
      }
    }

    // Fetch all people saved for this user
    const people = await Person.find({ userId }).sort({ name: 1 });

    // Build debt map for quick balance lookup
    const debtMap = new Map<string, { debtId: string; amountInPaise: number; isReceivable: boolean }>();
    for (const debt of activeDebts) {
      const targetName = (debt.isReceivable ? debt.debtorName : debt.creditorName).trim().toLowerCase();
      debtMap.set(targetName, {
        debtId: String(debt._id),
        amountInPaise: debt.amountInPaise,
        isReceivable: debt.isReceivable,
      });
    }

    const peopleList = people.map((p) => {
      const activeDebt = debtMap.get(p.normalizedName);
      return {
        id: String(p._id),
        name: p.name,
        hasActiveDebt: Boolean(activeDebt),
        debtId: activeDebt?.debtId || null,
        balanceInPaise: activeDebt?.amountInPaise || 0,
        balanceInRupees: (activeDebt?.amountInPaise || 0) / 100,
        isReceivable: activeDebt ? activeDebt.isReceivable : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        people: peopleList,
        count: peopleList.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPerson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to create person.', 401);
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Person name is required.', 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      throw new AppError('Person name cannot exceed 100 characters.', 400);
    }

    const normalizedName = trimmedName.toLowerCase();
    const userId = req.user.id;

    // Upsert person so duplicate requests for the same name return the existing person
    const person = await Person.findOneAndUpdate(
      { userId, normalizedName },
      { $setOnInsert: { userId, name: trimmedName, normalizedName } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      data: {
        message: 'Person saved successfully.',
        person: {
          id: String(person._id),
          name: person.name,
          hasActiveDebt: false,
          balanceInPaise: 0,
          balanceInRupees: 0,
          isReceivable: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePerson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to delete person.', 401);
    }

    const personId = String(req.params.id || '');
    if (!personId) {
      throw new AppError('Person ID is required.', 400);
    }

    const deleted = await Person.findOneAndDelete({ _id: personId, userId: req.user.id });
    if (!deleted) {
      throw new AppError('Person not found or unauthorized.', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Person removed successfully.',
        id: personId,
      },
    });
  } catch (error) {
    next(error);
  }
};

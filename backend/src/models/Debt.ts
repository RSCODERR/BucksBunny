import mongoose, { Schema, Document } from 'mongoose';

export interface IDebt extends Document {
  userId: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  debtorName: string;
  creditorName: string;
  isReceivable: boolean;
  amountInPaise: number;
  isSettled: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DebtSchema = new Schema<IDebt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      required: [true, 'Expense ID is required'],
      index: true,
    },
    debtorName: {
      type: String,
      required: [true, 'Debtor name is required'],
      trim: true,
      maxlength: [100, 'Debtor name cannot exceed 100 characters'],
    },
    creditorName: {
      type: String,
      required: [true, 'Creditor name is required'],
      trim: true,
      maxlength: [100, 'Creditor name cannot exceed 100 characters'],
    },
    isReceivable: {
      type: Boolean,
      required: true,
      index: true,
    },
    amountInPaise: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      min: [1, 'Debt amount must be at least 1 paisa (₹0.01)'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount in paise must be a whole integer',
      },
    },
    isSettled: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Debt = mongoose.model<IDebt>('Debt', DebtSchema);

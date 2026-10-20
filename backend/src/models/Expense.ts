import mongoose, { Schema, Document } from 'mongoose';

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

export interface ISplitParticipant {
  name: string;
  isCurrentUser: boolean;
  shareInPaise: number;
  percentage?: number;
}

export interface ISplitDetails {
  payerType: 'YOU' | 'OTHER';
  payerName: string;
  allocationRule: 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';
  participants: ISplitParticipant[];
  personalExpenseInPaise: number;
  owedToUserInPaise: number;
  userOwesInPaise: number;
}

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amountInPaise: number;
  title: string;
  category: ExpenseCategory;
  date: Date;
  time?: string | null;
  paymentMethod?: PaymentMethod | null;
  merchant: string;
  item: string;
  notes?: string | null;
  isSplit: boolean;
  splitDetails?: ISplitDetails | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    amountInPaise: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      min: [1, 'Amount must be at least 1 paisa (₹0.01)'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount in paise must be a whole integer',
      },
    },
    title: {
      type: String,
      required: [true, 'Expense title or description is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: 'Invalid expense category. Choose from the approved list.',
      },
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    time: {
      type: String,
      trim: true,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method.',
      },
      default: null,
    },
    merchant: {
      type: String,
      required: [true, 'Merchant or payee name is required'],
      trim: true,
      minlength: [1, 'Merchant or payee name must be at least 1 character'],
      maxlength: [100, 'Merchant name cannot exceed 100 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: null,
    },
    item: {
      type: String,
      required: [true, 'Item spent on is required'],
      trim: true,
      minlength: [1, 'Item spent on must be at least 1 character'],
      maxlength: [100, 'Item name cannot exceed 100 characters'],
    },
    isSplit: {
      type: Boolean,
      default: false,
    },
    splitDetails: {
      type: {
        payerType: {
          type: String,
          enum: ['YOU', 'OTHER'],
          required: true,
        },
        payerName: {
          type: String,
          required: true,
          trim: true,
        },
        allocationRule: {
          type: String,
          enum: ['EQUAL', 'CUSTOM', 'PERCENTAGE'],
          required: true,
        },
        participants: [
          {
            name: { type: String, required: true, trim: true },
            isCurrentUser: { type: Boolean, required: true },
            shareInPaise: { type: Number, required: true },
            percentage: { type: Number },
          },
        ],
        personalExpenseInPaise: { type: Number, required: true },
        owedToUserInPaise: { type: Number, required: true },
        userOwesInPaise: { type: Number, required: true },
      },
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

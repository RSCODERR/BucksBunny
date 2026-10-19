import mongoose, { Schema, Document } from 'mongoose';

export interface IRepayment extends Document {
  userId: mongoose.Types.ObjectId;
  debtId: mongoose.Types.ObjectId;
  counterpartyName: string;
  isReceivable: boolean;
  amountInPaise: number;
  previousBalanceInPaise: number;
  newBalanceInPaise: number;
  channel: string;
  memo: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RepaymentSchema = new Schema<IRepayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    debtId: {
      type: Schema.Types.ObjectId,
      ref: 'Debt',
      required: [true, 'Debt ID is required'],
      index: true,
    },
    counterpartyName: {
      type: String,
      required: [true, 'Counterparty name is required'],
      trim: true,
      maxlength: [100, 'Counterparty name cannot exceed 100 characters'],
    },
    isReceivable: {
      type: Boolean,
      required: true,
      index: true,
    },
    amountInPaise: {
      type: Number,
      required: [true, 'Repayment amount in paise is required'],
      min: [1, 'Repayment must be at least 1 paisa (₹0.01)'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount in paise must be a whole integer',
      },
    },
    previousBalanceInPaise: {
      type: Number,
      required: [true, 'Previous balance in paise is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Previous balance must be an integer',
      },
    },
    newBalanceInPaise: {
      type: Number,
      required: [true, 'New balance in paise is required'],
      min: [0, 'New balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'New balance must be an integer',
      },
    },
    channel: {
      type: String,
      required: [true, 'Payment channel is required'],
      trim: true,
      default: 'UPI Transfer',
    },
    memo: {
      type: String,
      trim: true,
      maxlength: [500, 'Memo cannot exceed 500 characters'],
      default: 'Repayment settlement',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Repayment = mongoose.model<IRepayment>('Repayment', RepaymentSchema);

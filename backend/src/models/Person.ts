import mongoose, { Schema, Document } from 'mongoose';

export type PersonOrigin = 'manual' | 'friend';

export interface IPerson extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  origin: PersonOrigin;
  linkedUserId?: mongoose.Types.ObjectId | null;
  linkedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Person name is required'],
      trim: true,
      maxlength: [100, 'Person name cannot exceed 100 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    origin: {
      type: String,
      enum: ['manual', 'friend'],
      default: 'manual',
      required: true,
    },
    linkedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    linkedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate people with the same normalized name for the same user
PersonSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

// Prevent linking multiple person records to the same registered account for the same user
PersonSchema.index(
  { userId: 1, linkedUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { linkedUserId: { $type: 'objectId' } },
  }
);

export const Person = mongoose.model<IPerson>('Person', PersonSchema);

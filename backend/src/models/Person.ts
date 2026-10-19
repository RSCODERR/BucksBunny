import mongoose, { Schema, Document } from 'mongoose';

export interface IPerson extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate people with the same normalized name for the same user
PersonSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

export const Person = mongoose.model<IPerson>('Person', PersonSchema);

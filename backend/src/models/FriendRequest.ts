import mongoose, { Schema, Document } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: FriendRequestStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically removes expired requests after expiresAt has elapsed
FriendRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure only one active pending request from sender to recipient at a time
FriendRequestSchema.index(
  { senderId: 1, recipientId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);

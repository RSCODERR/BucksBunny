import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'repayment_recorded'
  | 'friend_request_received'
  | 'friend_request_accepted';

export type RelatedEntityType = 'expense' | 'friend_request' | 'repayment' | 'user' | 'other';

export interface INotification extends Document {
  recipientUserId: mongoose.Types.ObjectId;
  actorUserId?: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId?: mongoose.Types.ObjectId | null;
  data?: Record<string, any>;
  readAt?: Date | null;
  expiresAt: Date;
  deduplicationKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required'],
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'expense_created',
        'expense_updated',
        'expense_deleted',
        'repayment_recorded',
        'friend_request_received',
        'friend_request_accepted',
      ],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    relatedEntityType: {
      type: String,
      enum: ['expense', 'friend_request', 'repayment', 'user', 'other'],
      default: 'other',
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    deduplicationKey: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge notification documents after 24 hours
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Composite indexes for fast user feeds and unread count queries
NotificationSchema.index({ recipientUserId: 1, expiresAt: 1, createdAt: -1 });
NotificationSchema.index({ recipientUserId: 1, readAt: 1, expiresAt: 1 });
NotificationSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

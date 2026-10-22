import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
  userA: mongoose.Types.ObjectId;
  userB: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    userA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User A ID is required'],
      index: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User B ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Canonical ordering hook: guarantees userA string is always less than userB string
FriendshipSchema.pre('save', function (next) {
  if (this.userA.toString() > this.userB.toString()) {
    const temp = this.userA;
    this.userA = this.userB;
    this.userB = temp;
  }
  next();
});

// Unique canonical friendship index
FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema);

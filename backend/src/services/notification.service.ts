import mongoose from 'mongoose';
import { Notification, INotification, NotificationType, RelatedEntityType } from '../models/Notification';
import { FriendRequest } from '../models/FriendRequest';
import { Person } from '../models/Person';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';

function canonicalPair(
  id1: string | mongoose.Types.ObjectId,
  id2: string | mongoose.Types.ObjectId
): [mongoose.Types.ObjectId, mongoose.Types.ObjectId] {
  const o1 = new mongoose.Types.ObjectId(id1.toString());
  const o2 = new mongoose.Types.ObjectId(id2.toString());
  return o1.toString() < o2.toString() ? [o1, o2] : [o2, o1];
}

export interface CreateNotificationParams {
  recipientUserId: string | mongoose.Types.ObjectId;
  actorUserId?: string | mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string | mongoose.Types.ObjectId | null;
  data?: Record<string, any>;
  deduplicationKey?: string;
}

export interface AttentionItem {
  id: string;
  type: 'friend_request' | 'expense_action' | string;
  title: string;
  message: string;
  date: string;
  actionUrl: string;
  actionLabel: string;
  entityId?: string | null;
  actorName?: string;
}

class NotificationService {
  /**
   * Safe notification creator. Never throws or halts parent transactions.
   */
  async createNotification(params: CreateNotificationParams): Promise<INotification | null> {
    try {
      const recipientId = new mongoose.Types.ObjectId(params.recipientUserId.toString());
      const actorId = params.actorUserId
        ? new mongoose.Types.ObjectId(params.actorUserId.toString())
        : null;

      // Do not notify self for own actions
      if (actorId && recipientId.equals(actorId)) {
        return null;
      }

      // 24-hour server-calculated expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const doc = await Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: params.type,
        title: params.title.trim(),
        message: params.message.trim(),
        relatedEntityType: params.relatedEntityType || 'other',
        relatedEntityId: params.relatedEntityId
          ? new mongoose.Types.ObjectId(params.relatedEntityId.toString())
          : null,
        data: params.data || {},
        expiresAt,
        deduplicationKey: params.deduplicationKey || null,
      });

      return doc;
    } catch (error: any) {
      // Gracefully handle duplicate keys (E11000) for idempotent event generation
      if (error && error.code === 11000) {
        return null;
      }
      console.error('[NotificationService.createNotification] Non-fatal notification error:', error);
      return null;
    }
  }

  /**
   * Retrieve active, non-expired notifications for a user with pagination
   */
  async getNotifications(
    recipientUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: Array<{
      id: string;
      type: NotificationType;
      title: string;
      message: string;
      relatedEntityType: string;
      relatedEntityId: string | null;
      data: any;
      isRead: boolean;
      readAt: string | null;
      createdAt: string;
      expiresAt: string;
      actor: { id: string; name: string; username: string } | null;
    }>;
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  }> {
    const currentUserId = new mongoose.Types.ObjectId(recipientUserId);
    const now = new Date();

    const query = {
      recipientUserId: currentUserId,
      expiresAt: { $gt: now },
    };

    const skip = Math.max(0, (page - 1) * limit);

    const [rawDocs, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorUserId', 'name username'),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, readAt: null }),
    ]);

    const notifications = rawDocs.map((doc: any) => ({
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      relatedEntityType: doc.relatedEntityType,
      relatedEntityId: doc.relatedEntityId ? doc.relatedEntityId.toString() : null,
      data: doc.data || {},
      isRead: Boolean(doc.readAt),
      readAt: doc.readAt ? doc.readAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      expiresAt: doc.expiresAt.toISOString(),
      actor: doc.actorUserId
        ? {
            id: doc.actorUserId._id.toString(),
            name: doc.actorUserId.name || doc.actorUserId.username,
            username: doc.actorUserId.username,
          }
        : null,
    }));

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    };
  }

  /**
   * Retrieve unread count strictly for active non-expired notifications
   */
  async getUnreadCount(recipientUserId: string): Promise<number> {
    const currentUserId = new mongoose.Types.ObjectId(recipientUserId);
    const now = new Date();
    return Notification.countDocuments({
      recipientUserId: currentUserId,
      readAt: null,
      expiresAt: { $gt: now },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(recipientUserId: string, notificationId: string): Promise<boolean> {
    const currentUserId = new mongoose.Types.ObjectId(recipientUserId);
    const notifId = new mongoose.Types.ObjectId(notificationId);
    const now = new Date();

    const result = await Notification.updateOne(
      { _id: notifId, recipientUserId: currentUserId, expiresAt: { $gt: now } },
      { $set: { readAt: new Date() } }
    );

    return result.matchedCount > 0;
  }

  /**
   * Mark all active notifications as read
   */
  async markAllAsRead(recipientUserId: string): Promise<number> {
    const currentUserId = new mongoose.Types.ObjectId(recipientUserId);
    const now = new Date();

    const result = await Notification.updateMany(
      { recipientUserId: currentUserId, readAt: null, expiresAt: { $gt: now } },
      { $set: { readAt: new Date() } }
    );

    return result.modifiedCount;
  }

  /**
   * Retrieve actionable items for the "Needs Your Attention" dashboard section.
   * Derived strictly from actual pending system states (pending incoming friend requests).
   */
  async getAttentionItems(recipientUserId: string): Promise<AttentionItem[]> {
    const currentUserId = new mongoose.Types.ObjectId(recipientUserId);
    const now = new Date();
    const items: AttentionItem[] = [];

    // Pending incoming friend requests
    const incomingRequests = await FriendRequest.find({
      recipientId: currentUserId,
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .populate('senderId', 'name username')
      .sort({ createdAt: -1 })
      .limit(5);

    for (const req of incomingRequests as any[]) {
      if (req.senderId && req.senderId.username) {
        const senderName = req.senderId.name || req.senderId.username;
        items.push({
          id: `fr_${req._id}`,
          type: 'friend_request',
          title: 'Incoming Friend Request',
          message: `${senderName} (@${req.senderId.username}) sent you a friend request.`,
          date: req.createdAt.toISOString(),
          actionUrl: '/people?tab=requests',
          actionLabel: 'Review Request',
          entityId: req._id.toString(),
          actorName: senderName,
        });
      }
    }

    return items;
  }

  /**
   * Helper to look up an eligible registered friend participant.
   * Enforces that:
   * 1. Contact is linked to a registered User.
   * 2. Owner and linked User have an active mutual Friendship.
   */
  async getEligibleFriendParticipant(
    ownerUserId: string | mongoose.Types.ObjectId,
    participantName: string
  ): Promise<{ friendUserId: mongoose.Types.ObjectId; friendName: string; friendUsername: string } | null> {
    const normName = participantName.trim().toLowerCase();
    const ownerObjId = new mongoose.Types.ObjectId(ownerUserId.toString());

    const person = await Person.findOne({
      userId: ownerObjId,
      normalizedName: normName,
      linkedUserId: { $ne: null },
    });

    if (!person || !person.linkedUserId) {
      return null;
    }

    const [userA, userB] = canonicalPair(ownerObjId, person.linkedUserId);
    const isConfirmedFriend = await Friendship.exists({ userA, userB });
    if (!isConfirmedFriend) {
      return null;
    }

    const friendUser = await User.findById(person.linkedUserId, 'name username');
    if (!friendUser) {
      return null;
    }

    return {
      friendUserId: friendUser._id,
      friendName: friendUser.name || friendUser.username,
      friendUsername: friendUser.username,
    };
  }

  /**
   * Trigger expense_created notification for eligible friend participants.
   * Notification must be sent strictly when the user paid (payerType === 'YOU')
   * and the friend owes them. If someone else paid, no notification is sent.
   */
  async notifyExpenseCreated(expense: any, creatorUserId: string): Promise<void> {
    try {
      if (!expense.isSplit || !expense.splitDetails || !Array.isArray(expense.splitDetails.participants)) {
        return;
      }

      // Strictly notify only if creator paid and friend owes creator
      if (expense.splitDetails.payerType !== 'YOU') {
        return;
      }

      const creator = await User.findById(creatorUserId, 'name username');
      const creatorName = creator?.name || creator?.username || 'A friend';

      for (const p of expense.splitDetails.participants) {
        if (p.isCurrentUser || !p.shareInPaise || p.shareInPaise <= 0) continue;

        const friend = await this.getEligibleFriendParticipant(creatorUserId, p.name);
        if (!friend) continue;

        const shareFormatted = `₹${(p.shareInPaise / 100).toFixed(2)}`;
        const message = `${creatorName} added you to "${expense.title}". Your share is ${shareFormatted}.`;

        await this.createNotification({
          recipientUserId: friend.friendUserId,
          actorUserId: creatorUserId,
          type: 'expense_created',
          title: 'New shared expense',
          message,
          relatedEntityType: 'expense',
          relatedEntityId: expense._id,
          data: {
            expenseId: expense._id.toString(),
            shareInPaise: p.shareInPaise,
            totalAmountInPaise: expense.amountInPaise,
            expenseTitle: expense.title,
          },
          deduplicationKey: `expense_${expense._id}_${friend.friendUserId}_created`,
        });
      }
    } catch (err) {
      console.error('[NotificationService.notifyExpenseCreated] Error:', err);
    }
  }

  /**
   * Trigger expense_updated notification for affected friend participants.
   * Notification must be sent strictly when updater paid (payerType === 'YOU').
   */
  async notifyExpenseUpdated(
    expense: any,
    updaterUserId: string,
    previousParticipants: Array<{ name: string; shareInPaise: number }>
  ): Promise<void> {
    try {
      if (!expense.isSplit || !expense.splitDetails || !Array.isArray(expense.splitDetails.participants)) {
        return;
      }

      // Strictly notify only if updater paid and friend owes updater
      if (expense.splitDetails.payerType !== 'YOU') {
        return;
      }

      const updater = await User.findById(updaterUserId, 'name username');
      const updaterName = updater?.name || updater?.username || 'A friend';

      const prevMap = new Map<string, number>();
      for (const prev of previousParticipants || []) {
        prevMap.set(prev.name.trim().toLowerCase(), prev.shareInPaise);
      }

      for (const p of expense.splitDetails.participants) {
        if (p.isCurrentUser) continue;

        const friend = await this.getEligibleFriendParticipant(updaterUserId, p.name);
        if (!friend) continue;

        const oldShare = prevMap.get(p.name.trim().toLowerCase());
        // Only notify if share changed or participant was newly added
        if (oldShare !== undefined && oldShare === p.shareInPaise) {
          continue;
        }

        const shareFormatted = `₹${(p.shareInPaise / 100).toFixed(2)}`;
        const message = oldShare !== undefined
          ? `${updaterName} updated "${expense.title}". Your share is now ${shareFormatted} (previously ₹${(oldShare / 100).toFixed(2)}).`
          : `${updaterName} added you to "${expense.title}". Your share is ${shareFormatted}.`;

        await this.createNotification({
          recipientUserId: friend.friendUserId,
          actorUserId: updaterUserId,
          type: 'expense_updated',
          title: 'Shared expense updated',
          message,
          relatedEntityType: 'expense',
          relatedEntityId: expense._id,
          data: {
            expenseId: expense._id.toString(),
            shareInPaise: p.shareInPaise,
            previousShareInPaise: oldShare,
            totalAmountInPaise: expense.amountInPaise,
            expenseTitle: expense.title,
          },
          deduplicationKey: `expense_${expense._id}_${friend.friendUserId}_upd_${Date.now()}`,
        });
      }
    } catch (err) {
      console.error('[NotificationService.notifyExpenseUpdated] Error:', err);
    }
  }

  /**
   * Trigger expense_deleted notification for previously eligible friend participants.
   * Notification must be sent strictly when deleter paid (payerType === 'YOU').
   */
  async notifyExpenseDeleted(deletedExpense: any, deleterUserId: string): Promise<void> {
    try {
      if (!deletedExpense.isSplit || !deletedExpense.splitDetails || !Array.isArray(deletedExpense.splitDetails.participants)) {
        return;
      }

      // Strictly notify only if deleter paid and friend owed deleter
      if (deletedExpense.splitDetails.payerType !== 'YOU') {
        return;
      }

      const deleter = await User.findById(deleterUserId, 'name username');
      const deleterName = deleter?.name || deleter?.username || 'A friend';

      for (const p of deletedExpense.splitDetails.participants) {
        if (p.isCurrentUser || !p.shareInPaise || p.shareInPaise <= 0) continue;

        const friend = await this.getEligibleFriendParticipant(deleterUserId, p.name);
        if (!friend) continue;

        const shareFormatted = `₹${(p.shareInPaise / 100).toFixed(2)}`;
        const message = `${deleterName} removed "${deletedExpense.title}" (your previous share was ${shareFormatted}).`;

        await this.createNotification({
          recipientUserId: friend.friendUserId,
          actorUserId: deleterUserId,
          type: 'expense_deleted',
          title: 'Shared expense removed',
          message,
          relatedEntityType: 'expense',
          relatedEntityId: deletedExpense._id,
          data: {
            expenseTitle: deletedExpense.title,
            previousShareInPaise: p.shareInPaise,
          },
          deduplicationKey: `expense_${deletedExpense._id}_${friend.friendUserId}_deleted`,
        });
      }
    } catch (err) {
      console.error('[NotificationService.notifyExpenseDeleted] Error:', err);
    }
  }

  /**
   * Trigger repayment_recorded notification for the counterparty
   */
  async notifyRepaymentRecorded(
    repayment: any,
    recorderUserId: string,
    counterpartyName: string
  ): Promise<void> {
    try {
      const friend = await this.getEligibleFriendParticipant(recorderUserId, counterpartyName);
      if (!friend) return;

      const recorder = await User.findById(recorderUserId, 'name username');
      const recorderName = recorder?.name || recorder?.username || 'A friend';
      const amountFormatted = `₹${(repayment.amountInPaise / 100).toFixed(2)}`;

      const message = repayment.isReceivable
        ? `${recorderName} recorded receiving a repayment of ${amountFormatted} from you.`
        : `${recorderName} recorded a repayment of ${amountFormatted} to you.`;

      await this.createNotification({
        recipientUserId: friend.friendUserId,
        actorUserId: recorderUserId,
        type: 'repayment_recorded',
        title: 'Repayment recorded',
        message,
        relatedEntityType: 'repayment',
        relatedEntityId: repayment._id,
        data: {
          repaymentId: repayment._id.toString(),
          amountInPaise: repayment.amountInPaise,
          isReceivableForRecorder: repayment.isReceivable,
        },
        deduplicationKey: `repayment_${repayment._id}_${friend.friendUserId}`,
      });
    } catch (err) {
      console.error('[NotificationService.notifyRepaymentRecorded] Error:', err);
    }
  }

  /**
   * Trigger friend_request_received notification for the recipient
   */
  async notifyFriendRequestReceived(senderUserId: string, recipientUserId: string): Promise<void> {
    try {
      const sender = await User.findById(senderUserId, 'name username');
      if (!sender) return;

      const senderName = sender.name || sender.username;
      const message = `${senderName} (@${sender.username}) sent you a friend request.`;

      await this.createNotification({
        recipientUserId,
        actorUserId: senderUserId,
        type: 'friend_request_received',
        title: 'Incoming Friend Request',
        message,
        relatedEntityType: 'friend_request',
        deduplicationKey: `fr_${senderUserId}_${recipientUserId}_received`,
      });
    } catch (err) {
      console.error('[NotificationService.notifyFriendRequestReceived] Error:', err);
    }
  }

  /**
   * Trigger friend_request_accepted notification for the original requester
   */
  async notifyFriendRequestAccepted(acceptorUserId: string, requesterUserId: string): Promise<void> {
    try {
      const acceptor = await User.findById(acceptorUserId, 'name username');
      if (!acceptor) return;

      const acceptorName = acceptor.name || acceptor.username;
      const message = `${acceptorName} (@${acceptor.username}) accepted your friend request. You are now friends on BucksBunny.`;

      await this.createNotification({
        recipientUserId: requesterUserId,
        actorUserId: acceptorUserId,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message,
        relatedEntityType: 'friend_request',
        deduplicationKey: `fr_${acceptorUserId}_${requesterUserId}_accepted`,
      });
    } catch (err) {
      console.error('[NotificationService.notifyFriendRequestAccepted] Error:', err);
    }
  }
}

export const notificationService = new NotificationService();

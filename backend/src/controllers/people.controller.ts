import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Person } from '../models/Person';
import { Debt } from '../models/Debt';
import { Expense } from '../models/Expense';
import { User } from '../models/User';
import { Friendship } from '../models/Friendship';
import { FriendRequest } from '../models/FriendRequest';
import { AppError } from '../errors/AppError';
import { netMutualDebts } from './expense.controller';
import { notificationService } from '../services/notification.service';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Returns canonical ordered pair of User ObjectIds for the Friendship model
 */
function canonicalPair(
  id1: string | mongoose.Types.ObjectId,
  id2: string | mongoose.Types.ObjectId
): [mongoose.Types.ObjectId, mongoose.Types.ObjectId] {
  const o1 = new mongoose.Types.ObjectId(id1.toString());
  const o2 = new mongoose.Types.ObjectId(id2.toString());
  return o1.toString() < o2.toString() ? [o1, o2] : [o2, o1];
}

/**
 * Synchronizes or upgrades a contact record when a friendship is confirmed
 * Prevents duplicate key errors if a manual contact with the same name already exists
 */
async function syncFriendContact(
  ownerId: mongoose.Types.ObjectId,
  friendUserId: mongoose.Types.ObjectId,
  friendUsername: string
): Promise<void> {
  const normalized = friendUsername.trim().toLowerCase();

  // 1. If owner already has a contact linked to this registered user under any name, ensure origin is 'friend'
  const existingByLinked = await Person.findOne({ userId: ownerId, linkedUserId: friendUserId });
  if (existingByLinked) {
    if (existingByLinked.origin !== 'friend') {
      existingByLinked.origin = 'friend';
      await existingByLinked.save();
    }
    return;
  }

  // 2. If owner already has a contact with this exact normalized name:
  const existingByName = await Person.findOne({ userId: ownerId, normalizedName: normalized });
  if (existingByName) {
    // If it's already linked to this friend, ensure origin is friend
    if (existingByName.linkedUserId && existingByName.linkedUserId.equals(friendUserId)) {
      if (existingByName.origin !== 'friend') {
        existingByName.origin = 'friend';
        await existingByName.save();
      }
      return;
    }

    // If it is an unlinked manual contact with the same name, do not overwrite it!
    // Instead create a distinct friend contact name to satisfy the unique index
    if (!existingByName.linkedUserId) {
      let candidateName = `${friendUsername} (Friend)`;
      let candidateNormalized = candidateName.toLowerCase();
      let counter = 1;
      while (await Person.exists({ userId: ownerId, normalizedName: candidateNormalized })) {
        candidateName = `${friendUsername} (${counter})`;
        candidateNormalized = candidateName.toLowerCase();
        counter++;
      }
      await Person.create({
        userId: ownerId,
        name: candidateName,
        normalizedName: candidateNormalized,
        origin: 'friend',
        linkedUserId: friendUserId,
        linkedAt: new Date(),
      });
      return;
    }
  }

  // 3. Otherwise create fresh friend contact record
  await Person.create({
    userId: ownerId,
    name: friendUsername,
    normalizedName: normalized,
    origin: 'friend',
    linkedUserId: friendUserId,
    linkedAt: new Date(),
  });
}

/**
 * GET /api/v1/people
 * List all people for current user with balance and linking details
 */
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
          { $setOnInsert: { userId, name: targetName.trim(), normalizedName: normalized, origin: 'manual' } },
          { upsert: true, new: true }
        );
      }
    }

    // Auto-sync any confirmed registered friends from Friendship into the Person collection if missing
    const currentObjId = new mongoose.Types.ObjectId(userId);
    const friendships = await Friendship.find({
      $or: [{ userA: currentObjId }, { userB: currentObjId }],
    });
    const friendUserIds = friendships.map((f) => (f.userA.equals(currentObjId) ? f.userB : f.userA));
    for (const fId of friendUserIds) {
      const exists = await Person.findOne({ userId: currentObjId, linkedUserId: fId });
      if (!exists) {
        const friendUser = await User.findById(fId, 'name username');
        if (friendUser) {
          await syncFriendContact(currentObjId, fId as mongoose.Types.ObjectId, friendUser.username);
        }
      }
    }

    // Fetch all people saved for this user
    const people = await Person.find({ userId }).sort({ name: 1 });

    // Fetch linked user details in bulk
    const linkedUserIds = people
      .filter((p) => p.linkedUserId)
      .map((p) => p.linkedUserId as mongoose.Types.ObjectId);

    const linkedUsers = await User.find({ _id: { $in: linkedUserIds } }, 'name username');
    const linkedUserMap = new Map<string, { id: string; name: string; username: string }>();
    for (const u of linkedUsers) {
      linkedUserMap.set(u._id.toString(), {
        id: u._id.toString(),
        name: u.name || u.username,
        username: u.username,
      });
    }

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
      const isLinked = Boolean(p.linkedUserId);
      const linkedUser = p.linkedUserId ? linkedUserMap.get(p.linkedUserId.toString()) || null : null;
      // Strict rule: Only manual records that were subsequently linked are eligible for unlinking
      const isUnlinkable = (p.origin === 'manual' || !p.origin) && isLinked;

      return {
        id: String(p._id),
        name: p.name,
        origin: p.origin || 'manual',
        isLinked,
        linkedUser,
        isUnlinkable,
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

/**
 * POST /api/v1/people
 * Add a new manual person
 */
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

    // Disallow adding oneself as a contact
    const currentUser = await User.findById(userId, 'username');
    if (normalizedName === 'you' || (currentUser && currentUser.username.toLowerCase() === normalizedName)) {
      throw new AppError('You cannot add yourself as a contact.', 400);
    }

    // Check if contact already exists
    const existing = await Person.findOne({ userId, normalizedName });
    if (existing) {
      let linkedUser = null;
      if (existing.linkedUserId) {
        const u = await User.findById(existing.linkedUserId, 'name username');
        if (u) linkedUser = { id: u._id.toString(), name: u.name || u.username, username: u.username };
      }

      res.status(200).json({
        success: true,
        data: {
          message: `Contact "${existing.name}" is already in your contacts.`,
          person: {
            id: String(existing._id),
            name: existing.name,
            origin: existing.origin || 'manual',
            isLinked: Boolean(existing.linkedUserId),
            linkedUser,
            isUnlinkable: (existing.origin === 'manual' || !existing.origin) && Boolean(existing.linkedUserId),
            hasActiveDebt: false,
            balanceInPaise: 0,
            balanceInRupees: 0,
            isReceivable: null,
          },
        },
      });
      return;
    }

    const person = await Person.create({
      userId,
      name: trimmedName,
      normalizedName,
      origin: 'manual',
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Person saved successfully.',
        person: {
          id: String(person._id),
          name: person.name,
          origin: person.origin || 'manual',
          isLinked: false,
          linkedUser: null,
          isUnlinkable: false,
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

/**
 * DELETE /api/v1/people/:id
 * Delete a person record (supports manual contacts, linked contacts, and registered friends)
 */
export const deletePerson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to delete person.', 401);
    }

    const personId = String(req.params.id || '');
    if (!personId || !mongoose.Types.ObjectId.isValid(personId)) {
      throw new AppError('Invalid person ID.', 400);
    }

    const person = await Person.findOne({ _id: personId, userId: req.user.id });
    if (!person) {
      throw new AppError('Contact not found or unauthorized.', 404);
    }

    // Check if there is an active unsettled balance with this person
    const nameRegex = new RegExp(`^${escapeRegex(person.name)}$`, 'i');
    const activeDebt = await Debt.findOne({
      userId: req.user.id,
      isSettled: false,
      amountInPaise: { $gt: 0 },
      $or: [{ debtorName: nameRegex }, { creditorName: nameRegex }],
    });
    if (activeDebt) {
      throw new AppError(
        `Cannot remove "${person.name}" because there is an active unsettled balance (₹${(activeDebt.amountInPaise / 100).toFixed(2)}). Please settle the balance first.`,
        400
      );
    }

    // If this contact was a registered friend or linked to an account, dissolve the friendship
    if (person.linkedUserId) {
      const [userA, userB] = canonicalPair(req.user.id, person.linkedUserId);
      await Friendship.deleteOne({ userA, userB });
      await FriendRequest.deleteMany({
        $or: [
          { senderId: req.user.id, recipientId: person.linkedUserId },
          { senderId: person.linkedUserId, recipientId: req.user.id },
        ],
      });
    }

    await Person.deleteOne({ _id: person._id });

    res.status(200).json({
      success: true,
      data: {
        message: person.origin === 'friend'
          ? `Friend "${person.name}" removed and friendship dissolved.`
          : `Contact "${person.name}" removed successfully.`,
        id: personId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/people/search-users?query=...
 * Search verified registered users by username (returns minimal public data)
 */
export const searchRegisteredUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to search users.', 401);
    }

    const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';
    if (!query || query.length < 1) {
      res.status(200).json({ success: true, data: { users: [] } });
      return;
    }

    const safeRegex = new RegExp(escapeRegex(query), 'i');

    const users = await User.find(
      {
        _id: { $ne: req.user.id },
        isEmailVerified: true,
        username: { $regex: safeRegex },
      },
      'name username'
    )
      .limit(10)
      .lean();

    const minimalUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.name || u.username,
      username: u.username,
    }));

    res.status(200).json({
      success: true,
      data: {
        users: minimalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/people/friends
 * Retrieve accepted registered friends and pending incoming/outgoing requests
 */
export const getFriendsAndRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const currentUserId = req.user.id;
    const currentObjId = new mongoose.Types.ObjectId(currentUserId);

    // 1. Fetch all friendships
    const friendships = await Friendship.find({
      $or: [{ userA: currentObjId }, { userB: currentObjId }],
    }).sort({ createdAt: -1 });

    const otherUserIds = friendships.map((f) => (f.userA.equals(currentObjId) ? f.userB : f.userA));
    const friendUsers = await User.find({ _id: { $in: otherUserIds } }, 'name username');
    const userMap = new Map<string, { name: string; username: string }>();
    for (const u of friendUsers) {
      userMap.set(u._id.toString(), {
        name: u.name || u.username,
        username: u.username,
      });
    }

    // Check if the current user has a Person record for each friend
    const existingPersonRecords = await Person.find({
      userId: currentObjId,
      linkedUserId: { $in: otherUserIds },
    });
    const personMap = new Map<string, string>();
    for (const p of existingPersonRecords) {
      if (p.linkedUserId) {
        personMap.set(p.linkedUserId.toString(), p._id.toString());
      }
    }

    const friends = otherUserIds
      .map((id) => {
        const idStr = id.toString();
        const friendInfo = userMap.get(idStr);
        if (!friendInfo) return null;
        return {
          id: idStr,
          name: friendInfo.name,
          username: friendInfo.username,
          personId: personMap.get(idStr) || null,
        };
      })
      .filter(Boolean);

    // 2. Fetch incoming pending requests (with application-level expiration check)
    const now = new Date();
    const rawIncoming = await FriendRequest.find({
      recipientId: currentObjId,
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .populate('senderId', 'name username')
      .sort({ createdAt: -1 });

    const incomingRequests = rawIncoming
      .map((r: any) => {
        if (!r.senderId || !r.senderId.username) return null;
        return {
          id: r._id.toString(),
          sender: {
            id: r.senderId._id.toString(),
            name: r.senderId.name || r.senderId.username,
            username: r.senderId.username,
          },
          createdAt: r.createdAt.toISOString(),
          expiresAt: r.expiresAt.toISOString(),
        };
      })
      .filter(Boolean);

    // 3. Fetch outgoing pending requests
    const rawOutgoing = await FriendRequest.find({
      senderId: currentObjId,
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .populate('recipientId', 'name username')
      .sort({ createdAt: -1 });

    const outgoingRequests = rawOutgoing
      .map((r: any) => {
        if (!r.recipientId || !r.recipientId.username) return null;
        return {
          id: r._id.toString(),
          recipient: {
            id: r.recipientId._id.toString(),
            name: r.recipientId.name || r.recipientId.username,
            username: r.recipientId.username,
          },
          createdAt: r.createdAt.toISOString(),
          expiresAt: r.expiresAt.toISOString(),
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        friends,
        incomingRequests,
        outgoingRequests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/people/friends/request
 * Send a friend request to a registered user
 */
export const sendFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const recipientUsername = req.body.recipientUsername || req.body.targetUsername;
    const recipientId = req.body.recipientId || req.body.targetUserId;

    let targetUser = null;
    if (recipientId && typeof recipientId === 'string' && mongoose.Types.ObjectId.isValid(recipientId)) {
      targetUser = await User.findOne({ _id: recipientId, isEmailVerified: true });
    } else if (recipientUsername && typeof recipientUsername === 'string' && recipientUsername.trim()) {
      targetUser = await User.findOne({
        username: recipientUsername.trim().toLowerCase(),
        isEmailVerified: true,
      });
    }

    if (!targetUser) {
      throw new AppError('User not found. Please verify the username.', 404);
    }

    const currentUserId = req.user.id;
    if (targetUser._id.toString() === currentUserId) {
      throw new AppError('You cannot send a friend request to yourself.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(currentUserId);
    const targetObjId = targetUser._id;

    // 1. Check if already friends
    const [userA, userB] = canonicalPair(currentObjId, targetObjId);
    const existingFriendship = await Friendship.findOne({ userA, userB });
    if (existingFriendship) {
      throw new AppError(`You are already friends with @${targetUser.username}.`, 400);
    }

    const now = new Date();

    // 2. Check if an active request already exists from current user to target
    const existingOutgoing = await FriendRequest.findOne({
      senderId: currentObjId,
      recipientId: targetObjId,
      status: 'pending',
      expiresAt: { $gt: now },
    });
    if (existingOutgoing) {
      throw new AppError(`A pending friend request has already been sent to @${targetUser.username}.`, 409);
    }

    // 3. Handle Reciprocal Request: Check if recipient already sent an active request to current user
    const reciprocal = await FriendRequest.findOne({
      senderId: targetObjId,
      recipientId: currentObjId,
      status: 'pending',
      expiresAt: { $gt: now },
    });

    if (reciprocal) {
      // Establish friendship immediately
      await Friendship.findOneAndUpdate({ userA, userB }, { userA, userB }, { upsert: true, new: true });

      // Clean up all requests between them immediately (per rule: accepted/rejected requests do not bloat DB)
      await FriendRequest.deleteMany({
        $or: [
          { senderId: currentObjId, recipientId: targetObjId },
          { senderId: targetObjId, recipientId: currentObjId },
        ],
      });

      // Synchronize/upgrade contacts for both users
      await syncFriendContact(currentObjId, targetObjId, targetUser.username);
      const currentUser = await User.findById(currentObjId, 'username');
      if (currentUser) {
        await syncFriendContact(targetObjId, currentObjId, currentUser.username);
      }

      // Notify the target user that mutual request resulted in friendship
      await notificationService.notifyFriendRequestAccepted(currentObjId.toString(), targetObjId.toString());

      res.status(200).json({
        success: true,
        data: {
          message: `Mutual request detected. You and @${targetUser.username} are now friends!`,
          isMutualAccept: true,
          friend: {
            id: targetUser._id.toString(),
            username: targetUser.username,
          },
        },
      });
      return;
    }

    // 4. Create new pending friend request (expires in 10 days)
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const newRequest = await FriendRequest.create({
      senderId: currentObjId,
      recipientId: targetObjId,
      status: 'pending',
      expiresAt,
    });

    // Notify the recipient about the incoming friend request
    await notificationService.notifyFriendRequestReceived(currentObjId.toString(), targetObjId.toString());

    res.status(201).json({
      success: true,
      data: {
        message: `Friend request sent to @${targetUser.username}.`,
        request: {
          id: newRequest._id.toString(),
          recipient: {
            id: targetUser._id.toString(),
            username: targetUser.username,
          },
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/people/friends/request/:id/accept
 * Accept an incoming friend request
 */
export const acceptFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const requestId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new AppError('Invalid request ID.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);
    const request = await FriendRequest.findOne({
      _id: requestId,
      recipientId: currentObjId,
    }).populate('senderId', 'username');

    if (!request) {
      throw new AppError('Friend request not found or unauthorized.', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError(`This friend request has already been ${request.status}.`, 400);
    }

    if (request.expiresAt.getTime() < Date.now()) {
      await FriendRequest.deleteOne({ _id: request._id });
      throw new AppError('This friend request has expired and cannot be accepted.', 400);
    }

    const senderObjId = request.senderId._id;
    const [userA, userB] = canonicalPair(currentObjId, senderObjId);

    // Establish friendship
    await Friendship.findOneAndUpdate({ userA, userB }, { userA, userB }, { upsert: true, new: true });

    // Clean up all friend requests between them from the database (no DB bloat!)
    await FriendRequest.deleteMany({
      $or: [
        { senderId: currentObjId, recipientId: senderObjId },
        { senderId: senderObjId, recipientId: currentObjId },
      ],
    });

    const senderUser: any = request.senderId;
    const currentUser = await User.findById(currentObjId, 'username');

    // Auto-create or upgrade contacts for both users
    if (senderUser) {
      await syncFriendContact(currentObjId, senderObjId, senderUser.username);
    }

    if (currentUser) {
      await syncFriendContact(senderObjId, currentObjId, currentUser.username);
    }

    // Notify the original requester that their friend request was accepted
    await notificationService.notifyFriendRequestAccepted(currentObjId.toString(), senderObjId.toString());

    res.status(200).json({
      success: true,
      data: {
        message: `Accepted friend request from @${senderUser?.username || 'user'}.`,
        friend: {
          id: senderObjId.toString(),
          username: senderUser?.username,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/people/friends/request/:id/reject
 * Reject an incoming friend request (removes request from DB)
 */
export const rejectFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const requestId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new AppError('Invalid request ID.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);
    const request = await FriendRequest.findOne({
      _id: requestId,
      recipientId: currentObjId,
    });

    if (!request) {
      throw new AppError('Friend request not found or unauthorized.', 404);
    }

    // Delete request record from database immediately to prevent DB bloat
    await FriendRequest.deleteOne({ _id: requestId });

    res.status(200).json({
      success: true,
      data: {
        message: 'Friend request declined and removed.',
        id: requestId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/people/friends/request/:id/cancel
 * Cancel a pending outgoing friend request (removes request from DB)
 */
export const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required.', 401);
    }

    const requestId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new AppError('Invalid request ID.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);
    const request = await FriendRequest.findOne({
      _id: requestId,
      senderId: currentObjId,
      status: 'pending',
    });

    if (!request) {
      throw new AppError('Active outgoing friend request not found.', 404);
    }

    // Delete request record from database immediately to prevent DB bloat
    await FriendRequest.deleteOne({ _id: requestId });

    res.status(200).json({
      success: true,
      data: {
        message: 'Friend request cancelled and removed.',
        id: requestId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/people/:id/link
 * Link an existing manually added person record to a registered account
 */
export const linkPersonToAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to link account.', 401);
    }

    const personId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(personId)) {
      throw new AppError('Invalid person ID.', 400);
    }

    const { targetUsername, targetUserId } = req.body;
    if (!targetUsername && !targetUserId) {
      throw new AppError('Target username or user ID is required to link an account.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Verify person record belongs to current user
    const person = await Person.findOne({ _id: personId, userId: currentObjId });
    if (!person) {
      throw new AppError('Person record not found or unauthorized.', 404);
    }

    // 2. Find target registered user
    let targetUser = null;
    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      targetUser = await User.findOne({ _id: targetUserId, isEmailVerified: true });
    } else if (targetUsername && typeof targetUsername === 'string') {
      targetUser = await User.findOne({
        username: targetUsername.trim().toLowerCase(),
        isEmailVerified: true,
      });
    }

    if (!targetUser) {
      throw new AppError('Target registered user not found.', 404);
    }

    // 3. User cannot link a contact to themselves
    if (targetUser._id.equals(currentObjId)) {
      throw new AppError('You cannot link a contact record to your own account.', 400);
    }

    // 4. Ensure target account is not already linked to another active person record owned by the user
    const alreadyLinked = await Person.findOne({
      userId: currentObjId,
      linkedUserId: targetUser._id,
      _id: { $ne: person._id },
    });
    if (alreadyLinked) {
      // If alreadyLinked is an empty auto-created friend placeholder with no debts or expenses,
      // clean it up and link this manual contact which carries the actual financial records
      const hasDebts = await Debt.exists({
        userId: currentObjId,
        isSettled: false,
        $or: [{ debtorName: alreadyLinked.name }, { creditorName: alreadyLinked.name }],
      });
      const hasExpenses = await Expense.exists({
        userId: currentObjId,
        'splitDetails.participants.name': alreadyLinked.name,
      });

      if (!hasDebts && !hasExpenses) {
        await Person.deleteOne({ _id: alreadyLinked._id });
      } else {
        throw new AppError(
          `The account @${targetUser.username} is already associated with contact ("${alreadyLinked.name}").`,
          400
        );
      }
    }

    // 5. Update person record to link target account, explicitly preserving origin as 'manual'
    person.linkedUserId = targetUser._id;
    person.linkedAt = new Date();
    person.origin = person.origin || 'manual';
    await person.save();

    res.status(200).json({
      success: true,
      data: {
        message: `Contact "${person.name}" successfully linked to @${targetUser.username}.`,
        person: {
          id: person._id.toString(),
          name: person.name,
          origin: person.origin,
          isLinked: true,
          linkedUser: {
            id: targetUser._id.toString(),
            name: targetUser.name || targetUser.username,
            username: targetUser.username,
          },
          isUnlinkable: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/people/:id/unlink
 * Unlink a previously linked manual person record.
 * STRICT ELIGIBILITY RULE:
 * Available ONLY for manually created person records that were subsequently linked to a registered account.
 * Registered friends or direct entries cannot be unlinked.
 */
export const unlinkPersonAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to unlink account.', 401);
    }

    const personId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(personId)) {
      throw new AppError('Invalid person ID.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);
    const person = await Person.findOne({ _id: personId, userId: currentObjId });
    if (!person) {
      throw new AppError('Person record not found or unauthorized.', 404);
    }

    // Strict eligibility check
    if (!person.linkedUserId) {
      throw new AppError('This contact is not currently linked to any registered account.', 400);
    }

    if (person.origin !== 'manual') {
      throw new AppError(
        'This contact is not eligible for unlinking. Only manually created contacts that were subsequently linked may be unlinked.',
        400
      );
    }

    const previousLinkedUserId = person.linkedUserId;

    // Remove account association, keeping the manual person record and all historical expenses intact
    person.linkedUserId = null;
    person.linkedAt = null;
    await person.save();

    // If the unlinked account is still a confirmed friend in Friendship, restore their friend contact in Person
    if (previousLinkedUserId) {
      const [userA, userB] = canonicalPair(currentObjId, previousLinkedUserId);
      const isStillFriend = await Friendship.exists({ userA, userB });
      if (isStillFriend) {
        const friendUser = await User.findById(previousLinkedUserId, 'name username');
        if (friendUser) {
          await syncFriendContact(currentObjId, previousLinkedUserId as mongoose.Types.ObjectId, friendUser.username);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: `Account successfully unlinked from "${person.name}". Historical expenses and balances remain intact.`,
        person: {
          id: person._id.toString(),
          name: person.name,
          origin: 'manual',
          isLinked: false,
          linkedUser: null,
          isUnlinkable: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/people/:id/details
 * Retrieve complete profile, debt balance, and transaction history for a person
 */
export const getPersonDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required to retrieve person details.', 401);
    }

    const personId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(personId)) {
      throw new AppError('Invalid person ID.', 400);
    }

    const currentObjId = new mongoose.Types.ObjectId(req.user.id);
    const person = await Person.findOne({ _id: personId, userId: currentObjId });
    if (!person) {
      throw new AppError('Person record not found or unauthorized.', 404);
    }

    // Lookup linked user public data if linked
    let linkedUser = null;
    if (person.linkedUserId) {
      const u = await User.findById(person.linkedUserId, 'name username');
      if (u) {
        linkedUser = { id: u._id.toString(), name: u.name || u.username, username: u.username };
      }
    }

    // Mutual debt netting
    await netMutualDebts(req.user.id, person.name);

    // Active debt
    const nameRegex = new RegExp(`^${escapeRegex(person.name)}$`, 'i');
    const activeDebt = await Debt.findOne({
      userId: currentObjId,
      isSettled: false,
      amountInPaise: { $gt: 0 },
      $or: [{ debtorName: nameRegex }, { creditorName: nameRegex }],
    });

    // Recent shared expenses with this person
    const sharedExpenses = await Expense.find({
      userId: currentObjId,
      isSplit: true,
      'splitDetails.participants.name': nameRegex,
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

    const history = sharedExpenses.map((exp) => {
      const participant = exp.splitDetails?.participants.find((p) => p.name.toLowerCase() === person.name.toLowerCase());
      return {
        id: exp._id.toString(),
        title: exp.title,
        merchant: exp.merchant,
        item: exp.item,
        category: exp.category,
        date: exp.date.toISOString(),
        formattedDate: new Date(exp.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        totalAmountInRupees: exp.amountInPaise / 100,
        theirShareInRupees: participant ? participant.shareInPaise / 100 : 0,
      };
    });

    const isLinked = Boolean(person.linkedUserId);
    const isUnlinkable = (person.origin === 'manual' || !person.origin) && isLinked;

    res.status(200).json({
      success: true,
      data: {
        person: {
          id: person._id.toString(),
          name: person.name,
          origin: person.origin || 'manual',
          isLinked,
          linkedUser,
          isUnlinkable,
          linkedAt: person.linkedAt ? person.linkedAt.toISOString() : null,
          createdAt: person.createdAt.toISOString(),
        },
        balance: {
          hasActiveDebt: Boolean(activeDebt),
          debtId: activeDebt ? activeDebt._id.toString() : null,
          balanceInPaise: activeDebt ? activeDebt.amountInPaise : 0,
          balanceInRupees: activeDebt ? activeDebt.amountInPaise / 100 : 0,
          isReceivable: activeDebt ? activeDebt.isReceivable : null,
        },
        sharedExpenses: history,
      },
    });
  } catch (error) {
    next(error);
  }
};

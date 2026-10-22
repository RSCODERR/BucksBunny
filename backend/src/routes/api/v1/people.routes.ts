import { Router } from 'express';
import {
  getPeople,
  createPerson,
  deletePerson,
  searchRegisteredUsers,
  getFriendsAndRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  linkPersonToAccount,
  unlinkPersonAccount,
  getPersonDetails,
} from '../../../controllers/people.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// Specific routes first to prevent collision with /:id
router.get('/search-users', authenticateUser, searchRegisteredUsers);
router.get('/friends', authenticateUser, getFriendsAndRequests);
router.post('/friends/request', authenticateUser, sendFriendRequest);
router.post('/friends/request/:id/accept', authenticateUser, acceptFriendRequest);
router.post('/friends/request/:id/reject', authenticateUser, rejectFriendRequest);
router.delete('/friends/request/:id/cancel', authenticateUser, cancelFriendRequest);

// Parameterized routes for individual person
router.patch('/:id/link', authenticateUser, linkPersonToAccount);
router.patch('/:id/unlink', authenticateUser, unlinkPersonAccount);
router.get('/:id/details', authenticateUser, getPersonDetails);

// Base people routes
router.get('/', authenticateUser, getPeople);
router.post('/', authenticateUser, createPerson);
router.delete('/:id', authenticateUser, deletePerson);

export default router;

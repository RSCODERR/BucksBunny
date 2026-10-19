import { Router } from 'express';
import {
  getPeople,
  createPerson,
  deletePerson,
} from '../../../controllers/people.controller';
import { authenticateUser } from '../../../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/people - List all people for current user
router.get('/', authenticateUser, getPeople);

// POST /api/v1/people - Add a new person
router.post('/', authenticateUser, createPerson);

// DELETE /api/v1/people/:id - Delete a person
router.delete('/:id', authenticateUser, deletePerson);

export default router;

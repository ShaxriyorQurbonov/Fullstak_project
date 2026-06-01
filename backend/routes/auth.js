import express from 'express';
import { login, logout, register, getMe } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/register  (Admin only)
router.post('/register', authenticate, authorize(['admin']), register);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;

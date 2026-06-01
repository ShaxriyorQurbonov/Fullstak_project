import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAllFromDB, addToDB, readDB, writeDB } from '../utils/db.js';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const users = getAllFromDB('users.json', 'users');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Support plain-text passwords for seed data and bcrypt hashed passwords
    let isValid = false;
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // plain-text fallback for demo accounts
      isValid = (password === user.password);
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  // JWT is stateless — client must discard the token.
  res.json({ message: 'Logged out successfully.' });
};

// POST /api/auth/register  (Admin only)
export const register = async (req, res) => {
  try {
    const { username, password, role, name } = req.body;

    if (!username || !password || !role || !name) {
      return res.status(400).json({ message: 'username, password, role and name are all required.' });
    }

    const allowedRoles = ['admin', 'clinician', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${allowedRoles.join(', ')}.` });
    }

    const users = getAllFromDB('users.json', 'users');
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = addToDB('users.json', 'users', { username, password: hashedPassword, role, name });

    if (!newUser) {
      return res.status(500).json({ message: 'Failed to create user.' });
    }

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ message: 'User registered successfully.', user: safeUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/auth/me  — return current user info from token
export const getMe = (req, res) => {
  res.json({ user: req.user });
};

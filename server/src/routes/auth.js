const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const signJwt = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// SIGNUP (default USER)
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const allowed = new Set(['ADMIN','USER','SECRETARY','DOCTOR']);
    const roleToUse = allowed.has(role) ? role : 'USER';

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (firstName, lastName, email, passwordHash, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, roleToUse]
    );

    const [[user]] = await pool.query(
      'SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id=?',
      [result.insertId]
    );
    res.status(201).json({ message: 'Account created successfully', user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use' });
    next(err);
  }
});

// LOGIN (includes role)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const [[user]] = await pool.query(
      'SELECT id, firstName, lastName, email, passwordHash, role FROM users WHERE email=? LIMIT 1',
      [email]
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
    });
  } catch (err) { next(err); }
});

module.exports = router;

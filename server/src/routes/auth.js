// server/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const signJwt = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

function toPublicUser(row) {
  if (!row) return null;
  const { passwordHash, ...pub } = row;
  return pub;
}

// ===== SIGNUP (default role USER unless provided & allowed) =====
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const allowed = new Set(['ADMIN', 'USER', 'SECRETARY', 'DOCTOR']);
    const roleToUse = allowed.has(role) ? role : 'USER';

    // ensure unique
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email=? LIMIT 1',
      [email]
    );
    if (existing.length) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (firstName, lastName, email, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [firstName, lastName, email, passwordHash, roleToUse]
    );

    const [[user]] = await pool.query(
      'SELECT id, firstName, lastName, email, role, createdAt, updatedAt FROM users WHERE id=?',
      [result.insertId]
    );

    res.status(201).json({ message: 'Account created successfully', user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already in use' });
    next(err);
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

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
  } catch (err) {
    next(err);
  }
});

// ===== ME (Bearer token) =====
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/.exec(auth);
    if (!m) return res.status(401).json({ error: 'Missing Authorization header' });

    let payload;
    try {
      payload = jwt.verify(m[1], JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const [[row]] = await pool.query(
      'SELECT id, firstName, lastName, email, role, createdAt, updatedAt FROM users WHERE id=? LIMIT 1',
      [payload.userId]
    );
    if (!row) return res.status(404).json({ error: 'User not found' });

    res.json(toPublicUser(row));
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== LOGOUT (no-op for JWT; here for client flow symmetry) =====
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = router;

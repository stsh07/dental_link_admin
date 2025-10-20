const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const [result] = await pool.query(
        'INSERT INTO users (firstName, lastName, email, passwordHash) VALUES (?, ?, ?, ?)',
        [firstName, lastName, email, passwordHash]
      );

      const [rows] = await pool.query(
        'SELECT id, firstName, lastName, email, createdAt FROM users WHERE id = ?',
        [result.insertId]
      );

      return res.status(201).json({
        message: 'Account created successfully',
        user: rows[0],
      });
    } catch (dbErr) {
      if (dbErr && (dbErr.code === 'ER_DUP_ENTRY' || String(dbErr.message).includes('Duplicate'))) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      dbErr.context = 'DB_INSERT_USER';
      throw dbErr;
    }
  } catch (err) {
    err.context = err.context || 'SIGNUP_ROUTE';
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, firstName, lastName, email, passwordHash FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ userId: user.id, email: user.email });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    err.context = err.context || 'LOGIN_ROUTE';
    return next(err);
  }
});

module.exports = router;

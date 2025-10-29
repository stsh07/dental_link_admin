// server/src/routes/reset-admin.js
const express = require('express');
// Use bcryptjs on Windows to avoid native build issues
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

/**
 * POST /api/reset-admin
 * Optional JSON body: { email, password, firstName, lastName }
 * Falls back to .env SEED_* or safe defaults.
 */
router.post('/', async (req, res) => {
  const email = req.body?.email || process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com';
  const plain = req.body?.password || process.env.SEED_ADMIN_PASSWORD || 'admin12345';
  const firstName = req.body?.firstName || 'Admin';
  const lastName  = req.body?.lastName  || 'DentalLink';

  try {
    // Ensure users table exists (id, email unique, passwordHash present)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(100),
        lastName VARCHAR(100),
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('USER','ADMIN','SECRETARY','DOCTOR') NOT NULL DEFAULT 'USER',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const passwordHash = await bcrypt.hash(plain, 10);

    // UPSERT admin by email
    await pool.query(
      `INSERT INTO users (firstName, lastName, email, passwordHash, role)
       VALUES (?, ?, ?, ?, 'ADMIN')
       ON DUPLICATE KEY UPDATE
         firstName=VALUES(firstName),
         lastName=VALUES(lastName),
         passwordHash=VALUES(passwordHash),
         role='ADMIN'`,
      [firstName, lastName, email, passwordHash]
    );

    const [rows] = await pool.query(
      `SELECT email, role, LEFT(passwordHash,8) AS hashPrefix, LENGTH(passwordHash) AS hashLen
       FROM users WHERE email=? LIMIT 1`,
      [email]
    );

    return res.json({ ok: true, user: rows[0] || null });
  } catch (err) {
    console.error('[/api/reset-admin] error:', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

module.exports = router;

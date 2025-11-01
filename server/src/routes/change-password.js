// server/src/routes/change-password.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");

const router = express.Router();

/**
 * POST /api/change-password
 * body: { email, oldPassword, newPassword }
 *
 * We look up the user in `users` table (your screenshot).
 */
router.post("/", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body || {};

    // 1) basic validation
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "email, oldPassword and newPassword are required.",
      });
    }

    // 2) fetch user by email
    // table: users
    // columns: id, firstName, lastName, email, passwordHash, role, createdAt, updatedAt
    const rows = await query(
      "SELECT id, email, passwordHash FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "USER_NOT_FOUND",
      });
    }

    // 3) compare old password with stored hash
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash || "");
    if (!isMatch) {
      return res.status(400).json({
        ok: false,
        error: "OLD_PASSWORD_INCORRECT",
        message: "Old password is incorrect.",
      });
    }

    // 4) hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // 5) update in DB
    await query(
      "UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ?",
      [newHash, user.id]
    );

    return res.json({ ok: true, message: "Password updated." });
  } catch (err) {
    console.error("[change-password]", err);
    return res.status(500).json({
      ok: false,
      error: "SERVER_ERROR",
    });
  }
});

module.exports = router;

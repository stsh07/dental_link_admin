// Plain-text password check to match your current DB data
const express = require("express");
const router = express.Router();
const db = require("../db"); // the mysql2 pool/connection
// If you later hash passwords, switch to bcrypt.compare()

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Query the users table
    const [rows] = await db.query(
      "SELECT id, email, password, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    // PLAIN TEXT compare (matches your current DB)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ success: return minimal user info (no password)
    return res.json({
      user: { id: user.id, email: user.email, role: user.role || "admin" },
    });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// server/src/routes/reviews.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

/* --------------------------------------------------
   Make sure reviews table exists
-------------------------------------------------- */
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT NOT NULL,
      dentist_id INT NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      review_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_appt (appointment_id),
      INDEX idx_dentist (dentist_id),
      INDEX idx_email (user_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/* --------------------------------------------------
   GET /api/reviews
   → all reviews (for admin Reviews page)
-------------------------------------------------- */
router.get("/reviews", async (_req, res) => {
  try {
    await ensureTable();

    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.appointment_id,
        r.dentist_id,
        r.user_email,
        r.review_text,
        r.created_at,
        a.full_name AS patient_name,
        d.full_name AS dentist_name
      FROM reviews r
      LEFT JOIN appointments a ON r.appointment_id = a.id
      LEFT JOIN dentists d     ON r.dentist_id = d.id
      ORDER BY r.created_at DESC
      `
    );

    const reviews = rows.map((row) => ({
      id: Number(row.id),
      appointmentId: Number(row.appointment_id),
      dentistId: Number(row.dentist_id),
      userEmail: row.user_email,
      reviewText: row.review_text,
      createdAt: row.created_at,
      patientName: row.patient_name || row.user_email,
      doctorName: row.dentist_name || `Dentist #${row.dentist_id}`,
    }));

    res.json({ ok: true, reviews });
  } catch (err) {
    console.error("GET /reviews error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* --------------------------------------------------
   ✅ NEW:
   GET /api/reviews/by-dentist/:dentistId
   → for Doctor Profile, show reviews for THIS dentist
-------------------------------------------------- */
router.get("/reviews/by-dentist/:dentistId", async (req, res) => {
  try {
    await ensureTable();

    const dentistId = Number(req.params.dentistId);
    if (!Number.isFinite(dentistId) || dentistId <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_DENTIST_ID" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.appointment_id,
        r.dentist_id,
        r.user_email,
        r.review_text,
        r.created_at,
        a.full_name AS patient_name
      FROM reviews r
      LEFT JOIN appointments a ON r.appointment_id = a.id
      WHERE r.dentist_id = ?
      ORDER BY r.created_at DESC
      `,
      [dentistId]
    );

    const reviews = rows.map((row) => ({
      id: Number(row.id),
      appointmentId: Number(row.appointment_id),
      dentistId: Number(row.dentist_id),
      userEmail: row.user_email,
      reviewText: row.review_text,
      createdAt: row.created_at,
      patientName: row.patient_name || row.user_email,
    }));

    res.json({ ok: true, reviews });
  } catch (err) {
    console.error("GET /reviews/by-dentist error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* --------------------------------------------------
   GET /api/reviews/by-appointment/:id
-------------------------------------------------- */
router.get("/reviews/by-appointment/:id", async (req, res) => {
  try {
    const apptId = Number(req.params.id);
    if (!Number.isFinite(apptId) || apptId <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_APPOINTMENT_ID" });
    }

    await ensureTable();

    const [[row]] = await pool.query(
      `
      SELECT id, appointment_id, dentist_id, user_email, review_text, created_at
      FROM reviews
      WHERE appointment_id = ?
      LIMIT 1
      `,
      [apptId]
    );

    if (!row) return res.json({ ok: true, review: null });

    res.json({
      ok: true,
      review: {
        id: Number(row.id),
        appointmentId: Number(row.appointment_id),
        dentistId: Number(row.dentist_id),
        userEmail: row.user_email,
        reviewText: row.review_text,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error("GET /reviews/by-appointment error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* --------------------------------------------------
   POST /api/reviews
-------------------------------------------------- */
router.post("/reviews", async (req, res) => {
  try {
    await ensureTable();

    let { appointmentId, reviewText } = req.body || {};
    appointmentId = Number(appointmentId);
    reviewText = String(reviewText || "").trim();

    const missing = [];
    if (!appointmentId) missing.push("appointmentId");
    if (!reviewText) missing.push("reviewText");
    if (missing.length) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS", missing });
    }

    // fetch appointment to derive dentist_id + email
    const [[appt]] = await pool.query(
      `
      SELECT id, email, status, dentist_id
      FROM appointments
      WHERE id = ?
      LIMIT 1
      `,
      [appointmentId]
    );

    if (!appt) {
      return res.status(404).json({ ok: false, error: "APPOINTMENT_NOT_FOUND" });
    }

    if (String(appt.status || "") !== "COMPLETED") {
      return res.status(400).json({ ok: false, error: "APPOINTMENT_NOT_COMPLETED" });
    }

    const dentistId = Number(appt.dentist_id || 0);
    const userEmail = String(appt.email || "").toLowerCase();

    // 1 review per appointment
    const [[dup]] = await pool.query(
      `
      SELECT id
      FROM reviews
      WHERE appointment_id = ?
      LIMIT 1
      `,
      [appointmentId]
    );
    if (dup) {
      return res.status(409).json({ ok: false, error: "ALREADY_REVIEWED" });
    }

    const [r] = await pool.query(
      `
      INSERT INTO reviews (appointment_id, dentist_id, user_email, review_text)
      VALUES (?, ?, ?, ?)
      `,
      [appointmentId, dentistId, userEmail, reviewText]
    );

    res.status(201).json({
      ok: true,
      id: r.insertId,
      appointmentId,
      dentistId,
      userEmail,
      reviewText,
    });
  } catch (err) {
    console.error("POST /reviews error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;

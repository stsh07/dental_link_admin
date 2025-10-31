// server/src/routes/reviews.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/* Ensure table (no rating column) */
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

/* Fetch review for an appointment (no rating returned) */
router.get('/reviews/by-appointment/:id', async (req, res) => {
  try {
    const apptId = Number(req.params.id);
    if (!Number.isFinite(apptId) || apptId <= 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_APPOINTMENT_ID' });
    }

    await ensureTable();

    const [[row]] = await pool.query(
      `SELECT id, appointment_id, dentist_id, user_email, review_text, created_at
         FROM reviews
        WHERE appointment_id = ?
        LIMIT 1`,
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
    console.error('GET /reviews/by-appointment error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

/* Create review (derive dentist & email from the appointment; no rating) */
router.post('/reviews', async (req, res) => {
  try {
    await ensureTable();

    let { appointmentId, reviewText } = req.body || {};
    appointmentId = Number(appointmentId);
    reviewText = String(reviewText || '').trim();

    const missing = [];
    if (!appointmentId) missing.push('appointmentId');
    if (!reviewText) missing.push('reviewText');
    if (missing.length) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS', missing });

    // Load appointment and validate
    const [[appt]] = await pool.query(
      `SELECT id, email, status, dentist_id
         FROM appointments
        WHERE id = ?
        LIMIT 1`,
      [appointmentId]
    );
    if (!appt) return res.status(404).json({ ok: false, error: 'APPOINTMENT_NOT_FOUND' });
    if (String(appt.status || '') !== 'COMPLETED') {
      return res.status(400).json({ ok: false, error: 'APPOINTMENT_NOT_COMPLETED' });
    }

    const dentistId = Number(appt.dentist_id || 0);
    const userEmail = String(appt.email || '').toLowerCase();

    // One review per appointment
    const [[dup]] = await pool.query(
      `SELECT id FROM reviews WHERE appointment_id = ? LIMIT 1`,
      [appointmentId]
    );
    if (dup) return res.status(409).json({ ok: false, error: 'ALREADY_REVIEWED' });

    const [r] = await pool.query(
      `INSERT INTO reviews (appointment_id, dentist_id, user_email, review_text)
       VALUES (?, ?, ?, ?)`,
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
    console.error('POST /reviews error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;

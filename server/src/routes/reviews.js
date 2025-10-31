const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const clampRating = (n) => Math.max(1, Math.min(5, Number(n || 0)));

router.get('/reviews/by-appointment/:id', async (req, res) => {
  try {
    const apptId = Number(req.params.id);
    if (!Number.isFinite(apptId) || apptId <= 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_APPOINTMENT_ID' });
    }

    const [[row]] = await pool.query(
      `SELECT id, appointment_id, dentist_id, user_email, rating, review_text, created_at
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
        rating: Number(row.rating),
        reviewText: row.review_text,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error('GET /reviews/by-appointment error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    let { appointmentId, dentistId, userEmail, rating, reviewText } = req.body || {};
    appointmentId = Number(appointmentId);
    dentistId = Number(dentistId);
    rating = clampRating(rating);
    userEmail = String(userEmail || '').trim().toLowerCase();
    reviewText = String(reviewText || '').trim();

    const missing = [];
    if (!appointmentId) missing.push('appointmentId');
    if (!dentistId) missing.push('dentistId');
    if (!userEmail) missing.push('userEmail');
    if (!reviewText) missing.push('reviewText');
    if (!rating) missing.push('rating');
    if (missing.length) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS', missing });

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
    if (appt.dentist_id !== dentistId) {
      return res.status(400).json({ ok: false, error: 'DENTIST_MISMATCH' });
    }
    if (String(appt.email || '').toLowerCase() !== userEmail) {
      return res.status(403).json({ ok: false, error: 'EMAIL_MISMATCH' });
    }

    const [[dup]] = await pool.query(
      `SELECT id FROM reviews WHERE appointment_id = ? LIMIT 1`,
      [appointmentId]
    );
    if (dup) return res.status(409).json({ ok: false, error: 'ALREADY_REVIEWED' });

    const [r] = await pool.query(
      `INSERT INTO reviews (appointment_id, dentist_id, user_email, rating, review_text)
       VALUES (?, ?, ?, ?, ?)`,
      [appointmentId, dentistId, userEmail, rating, reviewText]
    );

    res.status(201).json({
      ok: true,
      id: r.insertId,
      appointmentId,
      dentistId,
      userEmail,
      rating,
      reviewText,
    });
  } catch (err) {
    console.error('POST /reviews error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;

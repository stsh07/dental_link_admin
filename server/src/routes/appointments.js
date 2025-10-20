const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/* ---- time utils (Asia/Manila, +08:00) ---- */
function toISODate(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` : d;
}
function toTime24(t) {
  if (!t) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.length === 5 ? `${t}:00` : t;
  const a = /^(\d{1,2}):(\d{2})\s*([APap][Mm])$/.exec(t);
  if (!a) return t;
  let hh = parseInt(a[1], 10);
  const mm = a[2], mer = a[3].toUpperCase();
  if (mer === 'PM' && hh !== 12) hh += 12;
  if (mer === 'AM' && hh === 12) hh = 0;
  return `${String(hh).padStart(2,'0')}:${mm}:00`;
}
function manilaInstant(dateYYYYMMDD, timeHHMMSS) {
  const t = /^\d{2}:\d{2}:\d{2}$/.test(timeHHMMSS) ? timeHHMMSS : (timeHHMMSS || '00:00:00');
  const d = new Date(`${dateYYYYMMDD}T${t}+08:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function manilaNow() { return new Date(new Date().toISOString().slice(0,19) + '+08:00'); }
function yyyyMmDd(d) { return d.toISOString().slice(0,10); }
function hhMm(d) { return d.toISOString().slice(11,16); }

/* ---- clinic slots ---- */
function genSlots(start = '09:00', end = '17:00', stepMin = 30) {
  const out = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h < eh || (h === eh && m < em)) {
    out.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += stepMin;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return out;
}
const CLINIC_START = '09:00';
const CLINIC_END = '17:00';
const STEP_MIN = 30;

/* ---------- reference endpoints ---------- */
router.get('/dentists', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name AS name FROM dentists ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /dentists error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

router.get('/procedures', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM procedures ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /procedures error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------- slots map: show all, disable past/booked ---------- */
router.get('/appointments/slots', async (req, res) => {
  try {
    const date = toISODate((req.query.date || '').toString());
    const dentistId = req.query.dentistId ? Number(req.query.dentistId) : null;
    if (!date) return res.status(400).json({ error: 'MISSING_DATE' });

    const now = manilaNow();
    const todayStr = yyyyMmDd(now);
    const currentHM = hhMm(now);

    const base = genSlots(CLINIC_START, CLINIC_END, STEP_MIN);

    // booked times
    let bookedSet = new Set();
    if (dentistId) {
      const [rows] = await pool.query(
        `SELECT preferred_time FROM appointments
         WHERE preferred_date = ? AND dentist_id = ? AND status IN ('PENDING','CONFIRMED')`,
        [date, dentistId]
      );
      bookedSet = new Set(rows.map(r => r.preferred_time.slice(0,5)));
    }

    const slots = base.map(time => {
      const past = (date === todayStr) && (time <= currentHM); // past or exactly now -> disabled
      const booked = bookedSet.has(time);
      return { time, past, booked, available: !(past || booked) };
    });

    res.json({ date, dentistId, slots });
  } catch (err) {
    console.error('GET /appointments/slots error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------- list appointments ---------- */
router.get('/appointments', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT id, full_name, email, age, gender, phone,
             preferred_date, preferred_time, dentist_id, procedure_id,
             status, notes, created_at, updated_at
      FROM appointments
    `;
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /appointments error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------- create appointment (reject past/unavailable) ---------- */
router.post('/appointments', async (req, res) => {
  try {
    let {
      fullName, email, age, gender, phone,
      preferredDate, preferredTime,
      dentistId, procedureId,
      dentist, procedure, notes
    } = req.body || {};

    preferredDate = toISODate(preferredDate);
    preferredTime = toTime24(preferredTime);

    const missing = [];
    if (!fullName) missing.push('fullName');
    if (!email) missing.push('email');
    if (age == null) missing.push('age');
    if (!gender) missing.push('gender');
    if (!phone) missing.push('phone');
    if (!preferredDate) missing.push('preferredDate');
    if (!preferredTime) missing.push('preferredTime');

    if (!dentistId && dentist) {
      const [[d]] = await pool.query('SELECT id FROM dentists WHERE full_name=? LIMIT 1', [dentist]);
      dentistId = d?.id; if (!dentistId) missing.push('dentistId');
    }
    if (!procedureId && procedure) {
      const [[p]] = await pool.query('SELECT id FROM procedures WHERE name=? LIMIT 1', [procedure]);
      procedureId = p?.id; if (!procedureId) missing.push('procedureId');
    }
    if (!dentistId) missing.push('dentistId');
    if (!procedureId) missing.push('procedureId');
    if (missing.length) return res.status(400).json({ error: 'MISSING_FIELDS', missing });

    // past
    const appt = manilaInstant(preferredDate, preferredTime);
    if (!appt) return res.status(400).json({ error: 'INVALID_DATETIME' });
    if (appt.getTime() < Date.now()) return res.status(400).json({ error: 'PAST_DATETIME' });

    // inside clinic hours
    const HM = preferredTime.slice(0,5);
    const slots = genSlots(CLINIC_START, CLINIC_END, STEP_MIN);
    if (!slots.includes(HM)) return res.status(400).json({ error: 'OUTSIDE_HOURS' });

    // not taken
    const [[dup]] = await pool.query(
      `SELECT id FROM appointments
       WHERE preferred_date=? AND preferred_time=? AND dentist_id=? AND status IN ('PENDING','CONFIRMED')
       LIMIT 1`,
      [preferredDate, preferredTime, dentistId]
    );
    if (dup) return res.status(409).json({ error: 'TIME_TAKEN' });

    const [r] = await pool.query(
      `INSERT INTO appointments
        (full_name, email, age, gender, phone,
         preferred_date, preferred_time, dentist_id, procedure_id,
         status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        fullName, email, Number(age), gender, phone,
        preferredDate, preferredTime, dentistId, procedureId, notes ?? null
      ]
    );

    res.status(201).json({ id: r.insertId, status: 'PENDING' });
  } catch (err) {
    console.error('POST /appointments error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------- update status ---------- */
router.patch('/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['PENDING','CONFIRMED','DECLINED','CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'INVALID_STATUS' });

    const [r] = await pool.query('UPDATE appointments SET status=? WHERE id=?', [status, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'NOT_FOUND' });

    res.json({ id, status });
  } catch (err) {
    console.error('PATCH /appointments/:id/status error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;

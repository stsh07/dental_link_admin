const express = require('express'); 
const router = express.Router();
const { pool } = require('../db');

/* ===== Manila time helpers ===== */
const OFFSET = 8 * 60 * 60 * 1000;
const todayManila = () => {
  const d = new Date(Date.now() + OFFSET);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
};
const toISODate = (d) => {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` : d;
};
const toTime24 = (t) => {
  if (!t) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.length === 5 ? `${t}:00` : t;
  const a = /^(\d{1,2}):(\d{2})\s*([APap][Mm])$/.exec(t);
  if (!a) return t;
  let hh = parseInt(a[1],10), mm = a[2], mer = a[3].toUpperCase();
  if (mer==='PM' && hh!==12) hh+=12;
  if (mer==='AM' && hh===12) hh=0;
  return `${String(hh).padStart(2,'0')}:${mm}:00`;
};
const manilaInstant = (dateYMD, timeHMS) => {
  const t = /^\d{2}:\d{2}:\d{2}$/.test(timeHMS||'') ? timeHMS : ((timeHMS||'') + ':00').replace(/:00:00$/,'');
  const d = new Date(`${dateYMD}T${t||'00:00:00'}+08:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ===== 2-hour blocks (no lunch 12–1) ===== */
const BLOCKS = [
  { start: '08:00', end: '10:00' },
  { start: '10:00', end: '12:00' },
  { start: '13:00', end: '15:00' },
  { start: '15:00', end: '17:00' },
];

/* ===== Reference data ===== */
router.get('/dentists', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name AS name FROM dentists WHERE is_active=1 ORDER BY name');
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

/* ===== Slots (disable only AFTER block end) ===== */
router.get('/appointments/slots', async (req, res) => {
  try {
    const date = toISODate(String(req.query.date || ''));
    const dentistId = req.query.dentistId ? Number(req.query.dentistId) : null;
    if (!date) return res.status(400).json({ error: 'MISSING_DATE' });

    let countsByStart = new Map();
    if (dentistId) {
      const [rows] = await pool.query(
        `SELECT preferred_time, COUNT(*) AS c
           FROM appointments
          WHERE preferred_date=? AND dentist_id=? AND status IN ('PENDING','CONFIRMED')
          GROUP BY preferred_time`,
        [date, dentistId]
      );
      countsByStart = new Map(rows.map(r => [r.preferred_time.slice(0,5), Number(r.c)]));
    }

    const today = todayManila();
    const nowMs = Date.now();

    const slots = BLOCKS.map(b => {
      const endMs = manilaInstant(date, `${b.end}:00`)?.getTime() ?? 0;
      const past = (date === today) && (endMs < nowMs);
      const booked = (countsByStart.get(b.start) || 0) >= 1;
      return { time: b.start, past, booked, available: !(past || booked) };
    });

    res.json({ date, dentistId, slots });
  } catch (err) {
    console.error('GET /appointments/slots error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== Public list ===== */
router.get('/appointments', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT id, full_name, email, age, gender, phone, address,
             preferred_date, preferred_time, dentist_id, procedure_id,
             status, notes, created_at, updated_at
      FROM appointments`;
    const params = [];
    if (status) { sql += ' WHERE status=?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /appointments error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== Create ===== */
router.post('/appointments', async (req, res) => {
  try {
    let {
      fullName, email, age, gender, phone, address,
      preferredDate, preferredTime,
      dentistId, procedureId, dentist, procedure, notes
    } = req.body || {};

    preferredDate = toISODate(preferredDate);
    preferredTime = toTime24(preferredTime);

    const missing = [];
    if (!fullName) missing.push('fullName');
    if (!email) missing.push('email');
    if (age == null) missing.push('age');
    if (!gender) missing.push('gender');
    if (!phone) missing.push('phone');
    if (!address) missing.push('address');
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

    const HM = preferredTime.slice(0,5);
    const blk = BLOCKS.find(b => b.start === HM);
    if (!blk) return res.status(400).json({ error: 'OUTSIDE_BLOCKS' });

    const endMs = manilaInstant(preferredDate, `${blk.end}:00`)?.getTime() ?? 0;
    if (endMs < Date.now()) return res.status(400).json({ error: 'PAST_BLOCK' });

    const [[dup]] = await pool.query(
      `SELECT id FROM appointments
        WHERE preferred_date=? AND preferred_time=? AND dentist_id=? AND status IN ('PENDING','CONFIRMED')
        LIMIT 1`,
      [preferredDate, preferredTime, dentistId]
    );
    if (dup) return res.status(409).json({ error: 'TIME_TAKEN' });

    const [[cnt]] = await pool.query(
      `SELECT COUNT(*) AS c FROM appointments
        WHERE preferred_date=? AND dentist_id=? AND status IN ('PENDING','CONFIRMED')`,
      [preferredDate, dentistId]
    );
    if (Number(cnt.c) >= 4) return res.status(409).json({ error: 'DAILY_CAP_REACHED' });

    const [r] = await pool.query(
      `INSERT INTO appointments
        (full_name, email, age, gender, phone, address,
         preferred_date, preferred_time, dentist_id, procedure_id,
         status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        fullName, email, Number(age), gender, phone, address,
        preferredDate, preferredTime, dentistId, procedureId, notes ?? null
      ]
    );

    res.status(201).json({ id: r.insertId, status: 'PENDING' });
  } catch (err) {
    console.error('POST /appointments error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== Update status (public patch) ===== */
router.patch('/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['PENDING','CONFIRMED','DECLINED','COMPLETED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'INVALID_STATUS' });

    const [r] = await pool.query('UPDATE appointments SET status=? WHERE id=?', [status, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'NOT_FOUND' });

    res.json({ id: Number(id), status });
  } catch (err) {
    console.error('PATCH /appointments/:id/status error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== ADMIN: joined list for table ===== */
router.get('/admin/appointments', async (req, res) => {
  try {
    const status = (req.query.status || '').toString().toUpperCase();
    const search = (req.query.search || '').toString().trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '100', 10)));
    const offset = (page - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    if (status && ['PENDING','CONFIRMED','DECLINED','COMPLETED'].includes(status)) {
      where += ' AND a.status=?';
      params.push(status);
    }
    if (search) {
      where += ' AND (a.full_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `
      SELECT a.id,
             a.full_name      AS patientName,
             d.full_name      AS doctorName,
             a.preferred_date AS preferredDate,
             a.preferred_time AS preferredTime,
             p.name           AS serviceName,
             a.status         AS status
      FROM appointments a
      JOIN dentists d   ON d.id = a.dentist_id
      JOIN procedures p ON p.id = a.procedure_id
      ${where}
      ORDER BY a.preferred_date DESC, a.preferred_time ASC
      LIMIT ? OFFSET ?`;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM appointments a
      JOIN dentists d   ON d.id = a.dentist_id
      JOIN procedures p ON p.id = a.procedure_id
      ${where}`;

    const [rows] = await pool.query(sql, [...params, pageSize, offset]);
    const [[{ total }]] = await pool.query(countSql, params);

    const items = rows.map(r => ({
      id: r.id,
      patientName: r.patientName,
      doctor: r.doctorName,
      date: r.preferredDate,
      timeStart: r.preferredTime.slice(0,5),
      service: r.serviceName,
      status: r.status,
    }));

    res.json({ page, pageSize, total, items });
  } catch (err) {
    console.error('GET /admin/appointments error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== ADMIN: single detail ===== */
router.get('/admin/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await pool.query(
      `SELECT
         a.id,
         a.full_name       AS patientName,
         a.email           AS email,
         a.phone           AS phone,
         a.age             AS age,
         a.gender          AS gender,
         a.address         AS address,
         a.notes           AS notes,
         a.preferred_date  AS preferredDate,
         a.preferred_time  AS preferredTime,
         a.status          AS status,
         d.full_name       AS doctorName,
         p.name            AS procedureName
       FROM appointments a
       JOIN dentists d   ON d.id = a.dentist_id
       JOIN procedures p ON p.id = a.procedure_id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });

    res.json({
      id: row.id,
      patientName: row.patientName,
      email: row.email || null,
      phone: row.phone || null,
      age: row.age != null ? Number(row.age) : null,
      gender: row.gender || null,
      address: row.address || null,
      notes: row.notes || null,
      date: row.preferredDate,
      timeStart: row.preferredTime.slice(0,5),
      status: row.status,
      doctor: row.doctorName,
      service: row.procedureName,
    });
  } catch (err) {
    console.error('GET /admin/appointments/:id error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== ADMIN: dashboard stats ===== */
router.get('/admin/stats', async (_req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT
         COUNT(*)                AS total,
         SUM(status='PENDING')   AS pending,
         SUM(status='CONFIRMED') AS confirmed,
         SUM(status='DECLINED')  AS declined,
         SUM(status='COMPLETED') AS completed
       FROM appointments`
    );

    res.json({
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      confirmed: Number(row.confirmed || 0),
      declined: Number(row.declined || 0),
      completed: Number(row.completed || 0),
    });
  } catch (err) {
    console.error('GET /admin/stats error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ===== ADMIN: patients list (CONFIRMED + COMPLETED) — MariaDB-safe (no ANY_VALUE) ===== */
router.get('/admin/patients', async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '50', 10)));
    const offset = (page - 1) * pageSize;

    // Build WHERE
    const whereParts = [`a.status IN ('CONFIRMED','COMPLETED')`];
    const params = [];
    if (search) {
      whereParts.push(`(a.full_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${whereParts.join(' AND ')}`;

    // Count distinct patients (by name+email+phone)
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT 1
        FROM appointments a
        ${where}
        GROUP BY a.full_name, a.email, a.phone
      ) t`;
    const [[{ total }]] = await pool.query(countSql, params);

    // Pick one row per patient; use MAX() for representative values and latest visit date
    const dataSql = `
      SELECT
        MAX(a.id)             AS id,
        a.full_name           AS name,
        MAX(a.age)            AS age,
        MAX(a.gender)         AS gender,
        MAX(a.email)          AS email,
        MAX(a.phone)          AS phone,
        MAX(a.preferred_date) AS lastVisit
      FROM appointments a
      ${where}
      GROUP BY a.full_name, a.email, a.phone
      ORDER BY lastVisit DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    const items = rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      age: r.age != null ? Number(r.age) : null,
      gender: r.gender || null,
      email: r.email || null,
      phone: r.phone || null,
      lastVisit: r.lastVisit, // YYYY-MM-DD
    }));

    res.json({ page, pageSize, total, items });
  } catch (err) {
    console.error('GET /admin/patients error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;

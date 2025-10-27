// server/src/routes/doctors.js
const express = require("express");
const router = express.Router();
const { pool, query } = require("../db");

/** Normalizes a dentist row for the front-end */
function mapDentist(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email ?? null,
    age: row.age != null ? Number(row.age) : null,
    gender: row.gender ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    position: row.position ?? null,
    work_time: row.work_time || "08:00 – 17:00",
    status: row.status || "At Work",
    patients_today: row.patients_today != null ? Number(row.patients_today) : 0,
    created_at: row.created_at,
  };
}

/** ========== LIST (active only) ========== */
router.get("/", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, email, age, gender, address, phone,
              position, work_time, status, patients_today, created_at
         FROM dentists
        WHERE is_active = 1
        ORDER BY created_at DESC`
    );
    res.json({ ok: true, doctors: rows.map(mapDentist) });
  } catch (e) {
    console.error("[doctors:list]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/** ========== GET ONE ========== */
router.get("/:id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, email, age, gender, address, phone,
              position, work_time, status, patients_today, created_at
         FROM dentists
        WHERE id = ? AND is_active = 1
        LIMIT 1`,
      [req.params.id]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    res.json({ ok: true, doctor: mapDentist(row) });
  } catch (e) {
    console.error("[doctors:getOne]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

router.get("/:id/appointments", async (req, res) => {
  const id = Number(req.params.id);
  const scope = String(req.query.scope || "active").toLowerCase();

  const allowed = {
    active: `('PENDING','CONFIRMED')`,
    history: `('COMPLETED','DECLINED')`,
  };
  const statusList = allowed[scope] || allowed.active;

  try {
    const rows = await query(
      `
      SELECT 
        a.id,
        COALESCE(a.patient_name, a.patient, '')              AS patient_name,
        COALESCE(a.service, a.procedure, '')                 AS service,
        DATE_FORMAT(a.date, '%Y-%m-%d')                      AS date,
        DATE_FORMAT(a.time_start, '%H:%i')                   AS time_start,
        a.status,
        a.review
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      WHERE 
        (
          a.dentist_id = ?
          OR (
               a.dentist_id IS NULL 
           AND a.doctor IS NOT NULL 
           AND a.doctor = (SELECT full_name FROM dentists WHERE id = ? LIMIT 1)
          )
        )
        AND a.status IN ${statusList}
      ORDER BY a.date DESC, a.time_start DESC, a.id DESC
      `,
      [id, id]
    );

    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error("[doctors:appointments]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/** ========== CREATE ========== */
router.post("/", async (req, res) => {
  const {
    firstName,
    lastName,
    email = null,
    age = null,
    gender = null,
    address = null,
    phone = null,
    position = null,
    work_time = "08:00 – 17:00",
    status = "At Work",
    patients_today = 0,
  } = req.body || {};

  if (!firstName || !lastName) {
    return res.status(400).json({ ok: false, error: "FIRST_LAST_REQUIRED" });
  }
  const full_name = `${firstName} ${lastName}`.trim();

  try {
    const [r] = await pool.query(
      `INSERT INTO dentists
        (full_name, first_name, last_name, email, age, gender, address, phone,
         position, work_time, status, patients_today, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        full_name,
        firstName || null,
        lastName || null,
        email || null,
        age || null,
        gender || null,
        address || null,
        phone || null,
        position || null,
        work_time || "08:00 – 17:00",
        status || "At Work",
        patients_today ?? 0,
      ]
    );
    res.status(201).json({ ok: true, id: r.insertId, message: "Doctor created" });
  } catch (e) {
    console.error("[doctors:create]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/** ========== UPDATE STATUS ========== */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, error: "STATUS_REQUIRED" });

    await pool.query(`UPDATE dentists SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("[doctors:status]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/** ========== SOFT DELETE ========== */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`UPDATE dentists SET is_active = 0 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("[doctors:delete]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

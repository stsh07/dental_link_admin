const express = require("express");
const router = express.Router();
const { pool, query } = require("../db");

// uploads
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "..", "..", "uploads", "doctors");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("ONLY_IMAGE"));
    cb(null, true);
  },
});

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
    profile_url: row.profile_url ?? null,
    created_at: row.created_at,
  };
}

async function hasColumn(tableName, columnName) {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `;
  const rows = await query(sql, [tableName, columnName]);
  return (rows[0]?.cnt || 0) > 0;
}

async function firstExistingColumn(tableName, candidates) {
  for (const col of candidates) {
    if (await hasColumn(tableName, col)) return col;
  }
  return null;
}

/* ================= LIST (active only) ================= */
router.get("/", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, email, age, gender, address, phone,
              position, work_time, status, patients_today, profile_url, created_at
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

/* ================= ACTIVE COUNTS ================= */
router.get("/counts/active", async (_req, res) => {
  try {
    const doctorColExists = await hasColumn("appointments", "doctor");

    let rows;
    if (doctorColExists) {
      rows = await query(
        `
        SELECT
          d.full_name,
          COALESCE(cnt_id.cnt, 0) + COALESCE(cnt_name.cnt, 0) AS count
        FROM dentists d
        LEFT JOIN (
          SELECT a.dentist_id, COUNT(*) AS cnt
          FROM appointments a
          WHERE a.status IN ('PENDING','CONFIRMED')
            AND a.dentist_id IS NOT NULL
          GROUP BY a.dentist_id
        ) cnt_id ON cnt_id.dentist_id = d.id
        LEFT JOIN (
          SELECT a.doctor, COUNT(*) AS cnt
          FROM appointments a
          WHERE a.status IN ('PENDING','CONFIRMED')
            AND a.dentist_id IS NULL
            AND a.doctor IS NOT NULL
          GROUP BY a.doctor
        ) cnt_name ON cnt_name.doctor = d.full_name
        WHERE d.is_active = 1
        ORDER BY d.full_name ASC
        `
      );
    } else {
      rows = await query(
        `
        SELECT
          d.full_name,
          COALESCE(cnt_id.cnt, 0) AS count
        FROM dentists d
        LEFT JOIN (
          SELECT a.dentist_id, COUNT(*) AS cnt
          FROM appointments a
          WHERE a.status IN ('PENDING','CONFIRMED')
            AND a.dentist_id IS NOT NULL
          GROUP BY a.dentist_id
        ) cnt_id ON cnt_id.dentist_id = d.id
        WHERE d.is_active = 1
        ORDER BY d.full_name ASC
        `
      );
    }

    const counts = {};
    for (const r of rows) counts[r.full_name] = Number(r.count) || 0;

    res.json({ ok: true, counts });
  } catch (e) {
    console.error("[doctors:counts:active]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* ================= GET ONE ================= */
router.get("/:id(\\d+)", async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, email, age, gender, address, phone,
              position, work_time, status, patients_today, profile_url, created_at
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

/* ================= APPOINTMENTS FOR DOCTOR ================= */
router.get("/:id(\\d+)/appointments", async (req, res) => {
  const id = Number(req.params.id);
  const scope = String(req.query.scope || "active").toLowerCase();

  const allowed = {
    active: `('PENDING','CONFIRMED')`,
    history: `('COMPLETED','DECLINED')`,
  };
  const statusList = allowed[scope] || allowed.active;

  try {
    const doctorColExists = await hasColumn("appointments", "doctor");

    const patientCol = await firstExistingColumn("appointments", [
      "patient_name",
      "full_name",
      "patient",
      "client_name",
      "name",
    ]);

    const serviceTextCol = await firstExistingColumn("appointments", [
      "service",
      "procedure",
      "treatment",
    ]);

    const dateCol = await firstExistingColumn("appointments", [
      "date",
      "appointment_date",
      "appt_date",
      "scheduled_date",
      "schedule_date",
      "preferred_date",
      "created_at",
    ]);

    const timeStartCol = await firstExistingColumn("appointments", [
      "time_start",
      "start_time",
      "time",
      "appointment_time",
      "appt_time",
      "scheduled_time",
      "preferred_time",
    ]);

    const reviewCol = await firstExistingColumn("appointments", [
      "review",
      "feedback",
      "notes",
    ]);

    const patientExpr = patientCol ? `a.\`${patientCol}\`` : `a.\`full_name\``;
    const serviceExpr = serviceTextCol ? `a.\`${serviceTextCol}\`` : `p.name`;
    const dateFmtExpr = dateCol ? `DATE_FORMAT(a.\`${dateCol}\`, '%Y-%m-%d')` : `NULL`;
    const timeFmtExpr = timeStartCol ? `DATE_FORMAT(a.\`${timeStartCol}\`, '%H:%i')` : `NULL`;
    const reviewExpr = reviewCol ? `a.\`${reviewCol}\`` : `''`;

    const doctorMatch = doctorColExists
      ? `
          OR (
            a.dentist_id IS NULL
            AND a.doctor IS NOT NULL
            AND a.doctor = (SELECT full_name FROM dentists WHERE id = ? LIMIT 1)
          )
        `
      : "";

    const params = doctorColExists ? [id, id] : [id];

    const orderByDate = dateCol ? `a.\`${dateCol}\`` : `a.id`;
    const orderByTime = timeStartCol ? `a.\`${timeStartCol}\`` : `a.id`;

    const rows = await query(
      `
      SELECT
        a.id,
        ${patientExpr}                         AS patient_name,
        ${serviceExpr}                         AS service,
        IFNULL(${dateFmtExpr}, '')             AS date,
        IFNULL(${timeFmtExpr}, '')             AS time_start,
        a.status,
        ${reviewExpr}                          AS review
      FROM appointments a
      LEFT JOIN dentists d   ON d.id = a.dentist_id
      LEFT JOIN procedures p ON p.id = a.procedure_id
      WHERE
        (
          a.dentist_id = ?
          ${doctorMatch}
        )
        AND a.status IN ${statusList}
      ORDER BY ${orderByDate} DESC, ${orderByTime} DESC, a.id DESC
      `,
      params
    );

    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error("[doctors:appointments]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* ================= CREATE ================= */
router.post("/", upload.single("profile"), async (req, res) => {
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
  const profile_url = req.file ? `/uploads/doctors/${req.file.filename}` : null;

  try {
    const [r] = await pool.query(
      `INSERT INTO dentists
        (full_name, first_name, last_name, email, age, gender, address, phone,
         position, work_time, status, patients_today, profile_url, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
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
        profile_url,
      ]
    );
    res.status(201).json({ ok: true, id: r.insertId, message: "Doctor created" });
  } catch (e) {
    console.error("[doctors:create]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* ================= UPDATE STATUS ================= */
router.patch("/:id(\\d+)/status", async (req, res) => {
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

/* ================= DELETE (hard delete, fallback to soft) ================= */
router.delete("/:id(\\d+)", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

  try {
    // get current doctor to know profile file
    const [rows] = await pool.query(
      "SELECT profile_url FROM dentists WHERE id = ? LIMIT 1",
      [id]
    );
    const row = rows?.[0];

    try {
      const [del] = await pool.query("DELETE FROM dentists WHERE id = ?", [id]);
      if (del.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "NOT_FOUND" });
      }

      // delete photo from disk (optional)
      if (row && row.profile_url && row.profile_url.startsWith("/uploads/doctors/")) {
        const abs = path.join(__dirname, "..", "..", row.profile_url);
        fs.promises.unlink(abs).catch(() => {});
      }

      return res.json({ ok: true });
    } catch (err) {
      // foreign key? then do soft delete
      if (err && (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451)) {
        await pool.query("UPDATE dentists SET is_active = 0 WHERE id = ?", [id]);
        return res.json({
          ok: true,
          softDeleted: true,
          warning: "Doctor has related records. Marked as inactive instead.",
        });
      }
      throw err;
    }
  } catch (e) {
    console.error("[doctors:delete]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

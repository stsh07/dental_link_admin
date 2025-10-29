// server/src/routes/admin.js
const express = require("express");
const router = express.Router();
const { query } = require("../db");

const DB_NAME = process.env.DB_NAME || "dental_link";

/* ---------------- Helpers ---------------- */

function up(s) {
  return String(s || "").toUpperCase();
}

// Discover real columns in `appointments` to avoid "Unknown column" errors
async function getAppointmentColumns() {
  const cols = await query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appointments'
    `,
    [DB_NAME]
  );
  const set = new Set(cols.map((r) => r.COLUMN_NAME.toLowerCase()));
  const have = (n) => set.has(n.toLowerCase());

  return {
    idCol: have("id") ? "id" : "id", // assume id exists
    statusCol: have("status") ? "status" : null,

    // patient
    patientCol: have("patient_name")
      ? "patient_name"
      : have("patient")
      ? "patient"
      : null,

    // service/procedure
    serviceCol: have("service")
      ? "service"
      : have("procedure")
      ? "procedure"
      : null,

    // date
    dateCol: have("date")
      ? "date"
      : have("preferred_date")
      ? "preferred_date"
      : have("appt_date")
      ? "appt_date"
      : null,

    // time start
    timeCol: have("time_start")
      ? "time_start"
      : have("preferred_time")
      ? "preferred_time"
      : have("time")
      ? "time"
      : null,

    // dentist relation
    dentistIdCol: have("dentist_id") ? "dentist_id" : null,
  };
}

function buildAdminAppointmentsSelect(cols, whereStatusSql) {
  const fields = [];

  // id + status
  fields.push(`a.\`${cols.idCol}\` AS id`);
  fields.push(cols.statusCol ? `a.\`${cols.statusCol}\` AS status` : `'PENDING' AS status`);

  // normalized text fields
  fields.push(cols.patientCol ? `a.\`${cols.patientCol}\` AS patient_raw` : `'' AS patient_raw`);
  fields.push(cols.serviceCol ? `a.\`${cols.serviceCol}\` AS service_raw` : `'' AS service_raw`);

  // normalized date (YYYY-MM-DD)
  fields.push(
    cols.dateCol
      ? `DATE_FORMAT(a.\`${cols.dateCol}\`, '%Y-%m-%d') AS date_fmt`
      : `NULL AS date_fmt`
  );

  // normalized time (HH:MM)
  // TIME_FORMAT works both on TIME and DATETIME; for VARCHAR times it may be NULL → FE will handle gracefully
  fields.push(
    cols.timeCol ? `TIME_FORMAT(a.\`${cols.timeCol}\`, '%H:%i') AS time_fmt` : `NULL AS time_fmt`
  );

  // doctor name via join if we have dentist_id; leave null otherwise
  const join = cols.dentistIdCol
    ? `LEFT JOIN dentists d ON d.id = a.\`${cols.dentistIdCol}\``
    : `LEFT JOIN dentists d ON 1=0`;

  return `
    SELECT
      ${fields.join(",\n      ")},
      d.full_name AS doctor
    FROM appointments a
    ${join}
    ${whereStatusSql ? `WHERE ${whereStatusSql}` : ""}
    ORDER BY ${cols.dateCol ? `a.\`${cols.dateCol}\` DESC,` : ""} a.${cols.idCol} DESC
  `;
}

function mapApptRow(r) {
  return {
    id: Number(r.id),
    patientName: (r.patient_raw || "").toString(),
    service: (r.service_raw || "").toString(),
    date: r.date_fmt || "",       // YYYY-MM-DD
    timeStart: r.time_fmt || "",  // HH:MM
    status: up(r.status),
    doctor: r.doctor || "",
  };
}

/* ---------------- Dashboard Stats (kept) ---------------- */
router.get("/stats", async (_req, res) => {
  try {
    const [docRow] = await query(
      "SELECT COUNT(*) AS totalDoctors FROM dentists WHERE is_active = 1"
    );

    const [rows] = await query(
      `
      SELECT
        COUNT(*) AS totalAppointments,
        SUM(CASE WHEN UPPER(status) IN ('PENDING') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN UPPER(status) IN ('CONFIRMED','APPROVED') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN UPPER(status) IN ('COMPLETED','DONE','FINISHED') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN UPPER(status) IN ('DECLINED','CANCELLED','CANCELED') THEN 1 ELSE 0 END) AS declined
      FROM appointments
      `
    );

    const totalDoctors = Number(docRow?.totalDoctors || 0);
    const totalAppointments = Number(rows?.totalAppointments || 0);
    const pending = Number(rows?.pending || 0);
    const confirmed = Number(rows?.confirmed || 0);
    const completed = Number(rows?.completed || 0);
    const declined = Number(rows?.declined || 0);
    const approved = confirmed;

    res.json({
      ok: true,
      stats: {
        totalDoctors,
        totalAppointments,
        pending,
        confirmed,
        approved,  // compatibility
        completed,
        declined,
      },
    });
  } catch (e) {
    console.error("[admin:stats]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* ---------------- Admin Appointments (normalized) ----------------
   GET /api/admin/appointments?scope=active|history|all&page=1&pageSize=500

   - scope=active   → CONFIRMED/APPROVED only
   - scope=history  → COMPLETED/DECLINED (+ DONE/FINISHED/CANCELLED/CANCELED)
   - scope=all (default) → everything

   Returns items with { id, patientName, service, date, timeStart, status, doctor }
------------------------------------------------------------------- */
router.get("/appointments", async (req, res) => {
  const scope = String(req.query.scope || "all").toLowerCase();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize, 10) || 500));
  const offset = (page - 1) * pageSize;

  let whereStatusSql = "";
  if (scope === "active") {
    whereStatusSql = `UPPER(a.status) IN ('CONFIRMED','APPROVED')`;
  } else if (scope === "history") {
    whereStatusSql = `UPPER(a.status) IN ('COMPLETED','DONE','FINISHED','DECLINED','CANCELLED','CANCELED')`;
  }

  try {
    const cols = await getAppointmentColumns();

    // count total for pagination based on scope
    const countSql = `
      SELECT COUNT(*) AS total
      FROM appointments a
      ${whereStatusSql ? `WHERE ${whereStatusSql}` : ""}
    `;
    const [cRow] = await query(countSql);
    const total = Number(cRow?.total || 0);

    // fetch page
    const selectSql = buildAdminAppointmentsSelect(cols, whereStatusSql);
    const rows = await query(`${selectSql} LIMIT ? OFFSET ?`, [pageSize, offset]);

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      items: rows.map(mapApptRow),
    });
  } catch (e) {
    console.error("[admin:appointments]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* ---------------- Patients placeholder (kept to stop 404) ---------------- */
router.get("/patients", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize, 10) || 100));
  res.json({
    ok: true,
    page,
    pageSize,
    total: 0,
    items: [],
  });
});

module.exports = router;

// server/src/routes/admin.js
const express = require("express");
const router = express.Router();
const { query } = require("../db");

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

const COND_HISTORY =
  "TRIM(UPPER(a.status)) IN ('COMPLETED','DONE','FINISHED','DECLINED','CANCELLED','CANCELED') " +
  "OR TRIM(UPPER(a.status)) LIKE '%DECLINED%' " +
  "OR TRIM(UPPER(a.status)) LIKE '%CANCELLED%' " +
  "OR TRIM(UPPER(a.status)) LIKE '%CANCELED%'";
const COND_COMPLETED = "TRIM(UPPER(a.status)) IN ('COMPLETED','DONE','FINISHED')";
const COND_DECLINED =
  "TRIM(UPPER(a.status)) IN ('DECLINED','CANCELLED','CANCELED') " +
  "OR TRIM(UPPER(a.status)) LIKE '%DECLINED%'";
const COND_ACTIVE = "TRIM(UPPER(a.status)) IN ('CONFIRMED','APPROVED')";

router.get("/stats", async (_req, res) => {
  try {
    const [aptAll] = await query("SELECT COUNT(*) AS c FROM appointments");
    const [aptPending] = await query(
      "SELECT COUNT(*) AS c FROM appointments WHERE TRIM(UPPER(status))='PENDING'"
    );
    const [aptApproved] = await query(
      "SELECT COUNT(*) AS c FROM appointments WHERE TRIM(UPPER(status)) IN ('APPROVED','CONFIRMED')"
    );
    const [aptCompleted] = await query(
      "SELECT COUNT(*) AS c FROM appointments WHERE TRIM(UPPER(status)) IN ('COMPLETED','DONE','FINISHED')"
    );
    let dentists = [{ c: 0 }];
    try {
      dentists = await query("SELECT COUNT(*) AS c FROM dentists WHERE is_active=1");
    } catch (_) {}
    let services = [{ c: 0 }];
    try {
      services = await query("SELECT COUNT(*) AS c FROM services");
    } catch (_) {}

    res.json({
      ok: true,
      stats: {
        totalAppointments: aptAll.c || 0,
        pending: aptPending.c || 0,
        approved: aptApproved.c || 0,
        confirmed: aptApproved.c || 0,
        completed: aptCompleted.c || 0,
        totalDoctors: dentists[0]?.c || 0,
        totalServices: services[0]?.c || 0,
      },
    });
  } catch (e) {
    console.error("[admin:stats]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

router.get("/appointments", async (req, res) => {
  const scope = String(req.query.scope || "all").toLowerCase();
  const page = num(req.query.page, 1);
  const pageSize = Math.min(1000, num(req.query.pageSize, 500));
  const offset = (page - 1) * pageSize;

  let whereSql = "1=1";
  if (scope === "active") {
    whereSql = COND_ACTIVE;
  } else if (scope === "history" || scope === "past") {
    whereSql = COND_HISTORY;
  } else if (scope === "completed") {
    whereSql = COND_COMPLETED;
  } else if (scope === "declined") {
    whereSql = COND_DECLINED;
  }

  try {
    const [cnt] = await query(
      `SELECT COUNT(*) AS total FROM appointments a WHERE ${whereSql}`
    );
    const total = cnt?.total || 0;

    const rows = await query(
      `
      SELECT
        a.id,
        a.full_name AS patientName,
        d.full_name AS doctor,
        DATE_FORMAT(a.preferred_date, '%Y-%m-%d') AS date,
        TIME_FORMAT(a.preferred_time, '%H:%i') AS timeStart,
        s.name AS service,
        a.status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE ${whereSql}
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      LIMIT ? OFFSET ?
      `,
      [pageSize, offset]
    );

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        patientName: r.patientName || "",
        doctor: r.doctor || "",
        date: r.date || "",
        timeStart: r.timeStart || "",
        service: r.service || "",
        status: (r.status || "").toUpperCase(),
      })),
    });
  } catch (e) {
    console.error("[admin:appointments]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

router.get("/patients", async (req, res) => {
  const page = num(req.query.page, 1);
  const pageSize = Math.min(1000, num(req.query.pageSize, 100));
  res.json({
    ok: true,
    page,
    pageSize,
    total: 0,
    items: [],
  });
});

/* === TOP SERVICES (completed only) === */
router.get("/top-services", async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        COALESCE(s.name, 'No service') AS name,
        COUNT(*) AS cnt
      FROM appointments a
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE TRIM(UPPER(a.status)) IN ('COMPLETED','DONE','FINISHED')
      GROUP BY COALESCE(s.name, 'No service')
      ORDER BY cnt DESC
      `
    );

    const totalCompleted = rows.reduce((sum, r) => sum + Number(r.cnt || 0), 0);
    const top3 = rows.slice(0, 3).map((r) => ({
      name: r.name,
      count: Number(r.cnt || 0),
      percentage: totalCompleted
        ? Math.round((Number(r.cnt || 0) / totalCompleted) * 100)
        : 0,
    }));

    res.json({
      ok: true,
      totalCompleted,
      items: top3,
    });
  } catch (e) {
    console.error("[admin:top-services]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

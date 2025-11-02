// server/src/routes/admin.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function count(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return toNumber(rows[0]?.c || rows[0]?.total || 0);
  } catch (e) {
    console.error("[admin] count error:", e.message || e);
    return 0;
  }
}

router.get("/stats", async (_req, res) => {
  const total = await count("SELECT COUNT(*) AS c FROM appointments");
  const pending = await count(
    "SELECT COUNT(*) AS c FROM appointments WHERE UPPER(status) = 'PENDING'"
  );
  const confirmed = await count(
    "SELECT COUNT(*) AS c FROM appointments WHERE UPPER(status) IN ('CONFIRMED','APPROVED')"
  );
  const completed = await count(
    "SELECT COUNT(*) AS c FROM appointments WHERE UPPER(status) IN ('COMPLETED','DONE','FINISHED')"
  );
  const declined = await count(
    "SELECT COUNT(*) AS c FROM appointments WHERE UPPER(status) IN ('DECLINED','CANCELLED','CANCELED') OR UPPER(status) LIKE '%DECLINED%'"
  );

  res.json({
    total,
    pending,
    confirmed,
    completed,
    declined,
  });
});

router.get("/appointments", async (req, res) => {
  const scope = String(req.query.scope || "all").toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(1000, Math.max(1, Number(req.query.pageSize) || 500));
  const offset = (page - 1) * pageSize;

  let whereSql = "1=1";
  if (scope === "active") {
    whereSql = "UPPER(a.status) IN ('CONFIRMED','APPROVED')";
  } else if (scope === "history" || scope === "past") {
    whereSql =
      "UPPER(a.status) IN ('COMPLETED','DONE','FINISHED','DECLINED','CANCELLED','CANCELED') " +
      "OR UPPER(a.status) LIKE '%DECLINED%'";
  } else if (scope === "completed") {
    whereSql = "UPPER(a.status) IN ('COMPLETED','DONE','FINISHED')";
  } else if (scope === "declined") {
    whereSql =
      "UPPER(a.status) IN ('DECLINED','CANCELLED','CANCELED') " +
      "OR UPPER(a.status) LIKE '%DECLINED%'";
  }

  try {
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a WHERE ${whereSql}`
    );
    const total = toNumber(cnt[0]?.total || cnt[0]?.c || 0);

    const [rows] = await pool.query(
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
        status: String(r.status || "").toUpperCase(),
      })),
    });
  } catch (e) {
    console.error("[admin] /appointments error:", e.message || e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

router.get("/top-services", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(s.name, 'No service') AS name,
        COUNT(*) AS cnt
      FROM appointments a
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE UPPER(a.status) IN ('COMPLETED','DONE','FINISHED')
      GROUP BY COALESCE(s.name, 'No service')
      ORDER BY cnt DESC
      `
    );

    const total = rows.reduce((sum, r) => sum + toNumber(r.cnt), 0);
    const items = rows.slice(0, 3).map((r) => ({
      name: r.name,
      count: toNumber(r.cnt),
      percentage: total ? Math.round((toNumber(r.cnt) / total) * 100) : 0,
    }));

    res.json({ ok: true, totalCompleted: total, items });
  } catch (e) {
    console.error("[admin] /top-services error:", e.message || e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

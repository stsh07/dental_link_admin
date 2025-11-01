// server/src/routes/appointments.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

/* admin paginated list */
router.get("/admin/appointments", async (req, res) => {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 50;
  const offset = (page - 1) * pageSize;
  const status = (req.query.status || "").toString().trim();

  let whereClause = "1=1";
  const params = [];

  if (status) {
    whereClause = "a.status = ?";
    params.push(status);
  }

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name      AS patientName,
        d.full_name      AS doctor,
        a.preferred_date AS date,
        a.preferred_time AS time,
        s.name           AS service,
        a.status         AS status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE ${whereClause}
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    res.json({
      ok: true,
      data: rows,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    console.error("GET /admin/appointments error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch appointments" });
  }
});

/* list all */
router.get("/appointments", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.preferred_date,
        a.preferred_time,
        a.status,
        s.name AS service,
        d.full_name AS dentist
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      `
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /appointments error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch appointments" });
  }
});

/* today */
router.get("/appointments/today", async (_req, res) => {
  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, "0");
    const d = today.getDate().toString().padStart(2, "0");
    const ymd = `${y}-${m}-${d}`;
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name,
        a.preferred_date,
        a.preferred_time,
        a.status,
        s.name AS service,
        d.full_name AS dentist
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE a.preferred_date = ?
      ORDER BY a.preferred_time ASC, a.id DESC
      `,
      [ymd]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /appointments/today error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch today's appointments" });
  }
});

/* single */
router.get("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.address,
        a.preferred_date,
        a.preferred_time,
        a.status,
        a.dentist_id,
        s.name AS service,
        d.full_name AS dentist
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Appointment not found" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("GET /appointments/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch appointment" });
  }
});

/* create */
router.post("/appointments", async (req, res) => {
  const {
    full_name,
    email,
    phone,
    address,
    preferred_date,
    preferred_time,
    dentist_id,
    procedure_id,
  } = req.body;

  if (!full_name || !preferred_date || !preferred_time) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO appointments
      (full_name, email, phone, address, preferred_date, preferred_time, dentist_id, procedure_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      [
        full_name,
        email || null,
        phone || null,
        address || null,
        preferred_date,
        preferred_time,
        dentist_id || null,
        procedure_id || null,
      ]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error("POST /appointments error:", err);
    res.status(500).json({ ok: false, error: "Failed to create appointment" });
  }
});

/* update status */
router.patch("/appointments/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });
  if (!status) return res.status(400).json({ ok: false, error: "Status is required" });

  try {
    const [r] = await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "Appointment not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /appointments/:id/status error:", err);
    res.status(500).json({ ok: false, error: "Failed to update status" });
  }
});

/* doctor appointments — FIXED (dentist_id only) */
router.get("/doctors/:id/appointments", async (req, res) => {
  const doctorId = Number(req.params.id);
  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid doctor id" });
  }

  const scope = (req.query.scope || "active").toString().toLowerCase();
  const ACTIVE = ["PENDING", "CONFIRMED", "APPROVED"];
  const HISTORY = ["COMPLETED", "DONE", "FINISHED", "DECLINED", "CANCELLED", "CANCELED"];

  let wanted;
  if (scope === "history") wanted = HISTORY;
  else if (scope === "all") wanted = ACTIVE.concat(HISTORY);
  else wanted = ACTIVE;

  const placeholders = wanted.map(() => "?").join(",");
  const statusSql = wanted.length ? `AND UPPER(a.status) IN (${placeholders})` : "";

  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name      AS patient_name,
        COALESCE(s.name, '')               AS service,
        DATE_FORMAT(a.preferred_date, '%Y-%m-%d') AS date,
        DATE_FORMAT(a.preferred_time, '%H:%i')    AS time_start,
        a.status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE
        a.dentist_id = ?
        ${statusSql}
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      LIMIT 1000
      `,
      wanted.length
        ? [doctorId, ...wanted.map((s) => s.toUpperCase())]
        : [doctorId]
    );

    res.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        patient_name: r.patient_name || "",
        service: r.service || "",
        date: r.date || "",
        time_start: r.time_start || "",
        status: (r.status || "").toUpperCase(),
      })),
    });
  } catch (err) {
    console.error("GET /doctors/:id/appointments error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch doctor's appointments" });
  }
});

/* delete appointment */
router.delete("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const [r] = await pool.query("DELETE FROM appointments WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "Appointment not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /appointments/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete appointment" });
  }
});

module.exports = router;

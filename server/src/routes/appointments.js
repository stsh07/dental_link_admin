// server/src/routes/appointments.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const SLOT_BLOCKS = ["08:00", "10:00", "13:00", "15:00"];
const MANILA_OFFSET = 8 * 60 * 60 * 1000;

const manilaNow = () => new Date(Date.now() + MANILA_OFFSET);
const todayYMD = () => {
  const d = manilaNow();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};
const toHM = (t) => {
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
};

function buildSlots(date, existingTimes) {
  const isToday = date === todayYMD();
  const now = manilaNow();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return SLOT_BLOCKS.map((t) => {
    const end =
      t === "08:00"
        ? 10 * 60
        : t === "10:00"
        ? 12 * 60
        : t === "13:00"
        ? 15 * 60
        : t === "15:00"
        ? 17 * 60
        : 24 * 60;
    const booked = existingTimes.has(t);
    let available = !booked;
    if (isToday && nowMin >= end) available = false;
    return { time: t, booked, available, past: isToday && nowMin >= end };
  });
}

/* =========================
   SLOTS (user form)
   ========================= */
router.get("/appointments/slots", async (req, res) => {
  try {
    const date = req.query.date;
    const dentistId = req.query.dentistId ? Number(req.query.dentistId) : null;
    if (!date) return res.status(400).json({ ok: false, error: "date required" });

    const params = [date];
    let sql =
      "SELECT preferred_time FROM appointments WHERE preferred_date = ? AND UPPER(status) IN ('PENDING','CONFIRMED','APPROVED')";
    if (dentistId) {
      sql += " AND dentist_id = ?";
      params.push(dentistId);
    }
    const [rows] = await pool.query(sql, params);
    const times = new Set(rows.map((r) => toHM(r.preferred_time)));
    const slots = buildSlots(date, times);
    res.json({ ok: true, date, dentistId, slots });
  } catch (err) {
    console.error("slots err:", err);
    res.status(500).json({ ok: false, error: "SLOTS_FAILED" });
  }
});

/* =========================
   CREATE (user site)
   ========================= */
router.post("/appointments", async (req, res) => {
  try {
    const b = req.body || {};
    const fullName = b.fullName || b.full_name;
    const email = b.email;
    const age = b.age ?? null;
    const gender = b.gender ?? null;
    const phone = b.phone ?? null;
    const address = b.address ?? null;
    const preferredDate = b.preferredDate || b.preferred_date;
    const preferredTime = b.preferredTime || b.preferred_time;
    const dentistId = b.dentistId || b.dentist_id;
    const procedureId = b.procedureId || b.procedure_id || b.service_id;

    if (!fullName || !email || !preferredDate || !preferredTime || !dentistId || !procedureId) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const [result] = await pool.query(
      `INSERT INTO appointments
       (full_name, email, age, gender, phone, address,
        preferred_date, preferred_time, dentist_id, procedure_id, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)`,
      [
        fullName,
        email,
        age,
        gender,
        phone,
        address,
        preferredDate,
        preferredTime,
        Number(dentistId),
        Number(procedureId),
      ]
    );

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error("create appt err:", err);
    res.status(500).json({ ok: false, error: "CREATE_FAILED" });
  }
});

/* =========================
   ADMIN LIST (for React pages)
   GET /api/admin/appointments?page=1&pageSize=500&search=...
   ========================= */
router.get("/admin/appointments", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * pageSize;

    const params = [];
    const countParams = [];
    let where = "1=1";

    if (search) {
      where += `
        AND (
          a.full_name LIKE ?
          OR a.email LIKE ?
          OR a.phone LIKE ?
          OR d.full_name LIKE ?
          OR s.name LIKE ?
          OR a.status LIKE ?
          OR DATE_FORMAT(a.preferred_date,'%Y-%m-%d') LIKE ?
        )
      `;
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
      countParams.push(like, like, like, like, like, like, like);
    }

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name AS patientName,
        a.email,
        a.phone,
        a.age,
        a.gender,
        a.address,
        DATE_FORMAT(a.preferred_date,'%Y-%m-%d') AS date,
        DATE_FORMAT(a.preferred_time,'%H:%i') AS timeStart,
        COALESCE(d.full_name, '') AS doctor,
        COALESCE(s.name, '') AS service,
        UPPER(a.status) AS status,
        a.notes
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE ${where}
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      LIMIT ?, ?
      `,
      [...params, offset, pageSize]
    );

    const [cnt] = await pool.query(
      `
      SELECT COUNT(*) AS c
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE ${where}
      `,
      countParams
    );

    res.json({
      page,
      pageSize,
      total: cnt[0].c,
      items: rows,
    });
  } catch (err) {
    console.error("admin list err:", err);
    res.status(500).json({ ok: false, error: "LIST_FAILED" });
  }
});

/* =========================
   ADMIN DETAIL (popup)
   ========================= */
router.get("/admin/appointments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name AS patientName,
        a.email,
        a.phone,
        a.age,
        a.gender,
        a.address,
        a.notes,
        DATE_FORMAT(a.preferred_date,'%Y-%m-%d') AS date,
        DATE_FORMAT(a.preferred_time,'%H:%i') AS timeStart,
        COALESCE(d.full_name, '') AS doctor,
        COALESCE(s.name, '') AS service,
        UPPER(a.status) AS status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    res.json(rows[0]);
  } catch (err) {
    console.error("admin detail err:", err);
    res.status(500).json({ ok: false, error: "DETAIL_FAILED" });
  }
});

/* =========================
   ADMIN APPROVE / DECLINE / COMPLETE
   ========================= */
router.post("/admin/appointments/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [r] = await pool.query("UPDATE appointments SET status='CONFIRMED' WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({ ok: true, id, status: "CONFIRMED" });
  } catch (err) {
    console.error("approve err:", err);
    res.status(500).json({ ok: false, error: "APPROVE_FAILED" });
  }
});

router.post("/admin/appointments/:id/decline", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [r] = await pool.query("UPDATE appointments SET status='DECLINED' WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({ ok: true, id, status: "DECLINED" });
  } catch (err) {
    console.error("decline err:", err);
    res.status(500).json({ ok: false, error: "DECLINE_FAILED" });
  }
});

router.post("/admin/appointments/:id/complete", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [r] = await pool.query("UPDATE appointments SET status='COMPLETED' WHERE id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({ ok: true, id, status: "COMPLETED" });
  } catch (err) {
    console.error("complete err:", err);
    res.status(500).json({ ok: false, error: "COMPLETE_FAILED" });
  }
});

/* =========================
   GENERIC STATUS (your React uses PATCH /api/appointments/:id/status)
   ========================= */
async function updateStatusHandler(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const body = req.body || {};
    let newStatus = body.status || body.action || "";
    newStatus = String(newStatus).trim().toUpperCase();

    if (newStatus === "APPROVE" || newStatus === "APPROVED") newStatus = "CONFIRMED";
    if (newStatus === "DECLINE") newStatus = "DECLINED";

    const allowed = new Set(["PENDING", "CONFIRMED", "DECLINED", "COMPLETED"]);
    if (!allowed.has(newStatus)) return res.status(400).json({ ok: false, error: "BAD_STATUS" });

    const [r] = await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [
      newStatus,
      id,
    ]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({ ok: true, id, status: newStatus });
  } catch (err) {
    console.error("status err:", err);
    res.status(500).json({ ok: false, error: "STATUS_FAILED" });
  }
}
router.post("/appointments/:id/status", updateStatusHandler);
router.patch("/appointments/:id/status", updateStatusHandler);
router.put("/appointments/:id/status", updateStatusHandler);

/* =========================
   USER HISTORY (for client site)
   ========================= */
router.get("/appointments/user/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: "EMAIL_REQUIRED" });

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        DATE_FORMAT(a.preferred_date,'%Y-%m-%d') AS dateISO,
        COALESCE(s.name, '') AS service,
        a.dentist_id AS dentistId,
        COALESCE(d.full_name, '') AS dentist,
        UPPER(a.status) AS status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE LOWER(a.email) = ?
        AND UPPER(a.status) IN ('COMPLETED','DONE','FINISHED','DECLINED','CANCELLED','CANCELED')
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      `,
      [email]
    );

    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error("user history err:", err);
    res.status(500).json({ ok: false, error: "HISTORY_FAILED" });
  }
});

/* =========================
   USER SINGLE APPT
   ========================= */
router.get("/appointments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        DATE_FORMAT(a.preferred_date,'%Y-%m-%d') AS date,
        DATE_FORMAT(a.preferred_time,'%H:%i') AS timeStart,
        COALESCE(s.name, '') AS service,
        COALESCE(d.full_name, '') AS doctor
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    res.json(rows[0]);
  } catch (err) {
    console.error("user appt err:", err);
    res.status(500).json({ ok: false, error: "DETAIL_FAILED" });
  }
});

/* =========================
   DOCTOR HISTORY
   ========================= */
router.get("/doctors/:id/appointments", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "BAD_ID" });

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.full_name AS patient_name,
        COALESCE(s.name, 'No service') AS service,
        DATE_FORMAT(a.preferred_date,'%Y-%m-%d') AS date,
        DATE_FORMAT(a.preferred_time,'%H:%i') AS time_start,
        UPPER(a.status) AS status
      FROM appointments a
      LEFT JOIN dentists d ON d.id = a.dentist_id
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE a.dentist_id = ?
      ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
      LIMIT 1000
      `,
      [id]
    );

    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error("doctor appts err:", err);
    res.status(500).json({ ok: false, error: "DOCTOR_APPTS_FAILED" });
  }
});

/* =========================
   TOP SERVICES
   ========================= */
router.get("/admin/appointments/top-services", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(s.name, 'Unknown') AS service,
        COUNT(*) AS cnt
      FROM appointments a
      LEFT JOIN services s ON s.id = a.procedure_id
      WHERE UPPER(a.status) IN ('COMPLETED','DONE','FINISHED')
      GROUP BY COALESCE(s.name, 'Unknown')
      ORDER BY cnt DESC
      LIMIT 3
      `
    );
    const total = rows.reduce((n, r) => n + r.cnt, 0) || 1;
    const items = rows.map((r) => ({
      name: r.service,
      percentage: Math.round((r.cnt / total) * 100),
    }));
    res.json({ ok: true, items });
  } catch (err) {
    console.error("top services err:", err);
    res.status(500).json({ ok: false, error: "TOP_SERVICES_FAILED" });
  }
});

module.exports = router;

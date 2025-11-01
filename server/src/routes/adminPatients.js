const express = require("express");
const router = express.Router();
const { query } = require("../db");

/* List: GET /api/admin/patients */
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);
    const search = String(req.query.search || "").trim();
    const offset = (page - 1) * pageSize;

    let where = "1=1";
    const params = [];

    if (search) {
      where += ` AND (
        a.full_name LIKE ?
        OR a.email LIKE ?
        OR a.phone LIKE ?
      )`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const totalRows = await query(
      `
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT COALESCE(a.email, a.full_name, a.phone) AS patient_key
        FROM appointments a
        WHERE ${where}
        GROUP BY patient_key
      ) AS sub
      `,
      params
    );
    const total = totalRows[0]?.cnt || 0;

    const rows = await query(
      `
      SELECT
        MIN(a.id)               AS id,
        MAX(a.full_name)        AS name,
        MAX(a.age)              AS age,
        MAX(a.gender)           AS gender,
        MAX(a.email)            AS email,
        MAX(a.phone)            AS phone,
        MAX(a.preferred_date)   AS last_visit
      FROM appointments a
      WHERE ${where}
      GROUP BY COALESCE(a.email, a.full_name, a.phone)
      ORDER BY last_visit DESC, name ASC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const items = rows.map((r) => ({
      id: Number(r.id),
      name: r.name || "Unknown",
      age: r.age != null ? Number(r.age) : null,
      gender: r.gender || null,
      email: r.email || null,
      phone: r.phone || null,
      lastVisit: r.last_visit || null,
    }));

    res.json({ ok: true, page, pageSize, total, items });
  } catch (e) {
    console.error("[adminPatients:list]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* Detail: GET /api/admin/patients/:id  (id is an anchor appointment.id) */
router.get("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const anchorRows = await query(
      `
      SELECT
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.gender,
        a.age,
        a.preferred_date,
        a.preferred_time,
        a.address
      FROM appointments a
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );

    const a = anchorRows[0];
    if (!a) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({
      ok: true,
      patient: {
        id: a.id,
        name: a.full_name,
        email: a.email,
        phone: a.phone,
        gender: a.gender,
        age: a.age != null ? Number(a.age) : null,
        address: a.address || "",
        lastVisit: a.preferred_date || null,
        __key: { email: a.email, full_name: a.full_name, phone: a.phone },
      },
    });
  } catch (e) {
    console.error("[adminPatients:getOne]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* Appointments: GET /api/admin/patients/:id/appointments */
router.get("/:id(\\d+)/appointments", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const anchorRows = await query(
      `
      SELECT a.id, a.full_name, a.email, a.phone
      FROM appointments a
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );
    const a = anchorRows[0];
    if (!a) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    let apptRows;
    if (a.email) {
      apptRows = await query(
        `
        SELECT
          a.id,
          COALESCE(p.name, CONCAT('Procedure #', a.procedure_id), '—') AS \`procedure\`,
          DATE_FORMAT(a.preferred_date, '%M %e, %Y') AS date,
          IFNULL(a.preferred_time, '') AS time,
          COALESCE(d.full_name, '—') AS dentist,
          a.status
        FROM appointments a
        LEFT JOIN procedures p ON p.id = a.procedure_id
        LEFT JOIN dentists   d ON d.id = a.dentist_id
        WHERE a.email = ?
        ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
        `,
        [a.email]
      );
    } else {
      apptRows = await query(
        `
        SELECT
          a.id,
          COALESCE(p.name, CONCAT('Procedure #', a.procedure_id), '—') AS \`procedure\`,
          DATE_FORMAT(a.preferred_date, '%M %e, %Y') AS date,
          IFNULL(a.preferred_time, '') AS time,
          COALESCE(d.full_name, '—') AS dentist,
          a.status
        FROM appointments a
        LEFT JOIN procedures p ON p.id = a.procedure_id
        LEFT JOIN dentists   d ON d.id = a.dentist_id
        WHERE a.full_name = ?
          AND (a.phone = ? OR (? IS NULL AND a.phone IS NULL))
        ORDER BY a.preferred_date DESC, a.preferred_time DESC, a.id DESC
        `,
        [a.full_name, a.phone, a.phone]
      );
    }

    const items = apptRows.map((r) => ({
      id: r.id,
      procedure: r.procedure,
      date: r.date,
      time: r.time,
      dentist: r.dentist,
      status: r.status,
    }));

    res.json({ ok: true, items });
  } catch (e) {
    console.error("[adminPatients:appointments]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* Delete: DELETE /api/admin/patients/:id  (hard delete by anchor appointment id) */
router.delete("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: "BAD_ID" });

    // If you have a real `patients` table, replace this with DELETE FROM patients WHERE id = ?
    const result = await query(`DELETE FROM appointments WHERE id = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (e) {
    console.error("[adminPatients:delete]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

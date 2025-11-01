// server/src/routes/adminPatients.js
const express = require("express");
const router = express.Router();
const { query } = require("../db");

/**
 * We DON'T have a real `patients` table.
 * We derive “patients” from `appointments` by grouping people that share the
 * same email (preferred) or same name+phone.
 *
 * Tables we have (based on your screenshots):
 * - appointments
 * - dentists
 * - procedures
 * - users
 */

/* -------------------------------------------------------------------------- */
/* 1. LIST: GET /api/admin/patients                                            */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * pageSize;

    let where = "1=1";
    const params = [];

    if (search) {
      // appointments table columns from your screenshot:
      // full_name, email, phone
      where += `
        AND (
          a.full_name LIKE ?
          OR a.email LIKE ?
          OR a.phone LIKE ?
        )
      `;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    // how many distinct “patients”
    const totalRows = await query(
      `
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT
          COALESCE(a.email, a.full_name, a.phone) AS patient_key
        FROM appointments a
        WHERE ${where}
        GROUP BY patient_key
      ) AS sub
      `,
      params
    );
    const total = totalRows[0]?.cnt || 0;

    // actual list
    const rows = await query(
      `
      SELECT
        MIN(a.id) AS id,                             -- use earliest appt id as “patient id”
        MAX(a.full_name) AS name,
        MAX(a.age) AS age,
        MAX(a.gender) AS gender,
        MAX(a.email) AS email,
        MAX(a.phone) AS phone,
        MAX(a.preferred_date) AS last_visit
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

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      items,
    });
  } catch (e) {
    console.error("[adminPatients:list]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* -------------------------------------------------------------------------- */
/* 2. DETAIL: GET /api/admin/patients/:id                                      */
/*    :id is actually the anchor appointment.id we emitted in the list         */
/* -------------------------------------------------------------------------- */
router.get("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // anchor appointment
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

    const anchor = anchorRows[0];
    if (!anchor) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    // return shape expected by React
    res.json({
      ok: true,
      patient: {
        id: anchor.id,
        name: anchor.full_name,
        email: anchor.email,
        phone: anchor.phone,
        gender: anchor.gender,
        age: anchor.age != null ? Number(anchor.age) : null,
        address: anchor.address || "",
        lastVisit: anchor.preferred_date || null,
        __key: {
          email: anchor.email,
          full_name: anchor.full_name,
          phone: anchor.phone,
        },
      },
    });
  } catch (e) {
    console.error("[adminPatients:getOne]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

/* -------------------------------------------------------------------------- */
/* 3. APPOINTMENTS: GET /api/admin/patients/:id/appointments                   */
/* -------------------------------------------------------------------------- */
router.get("/:id(\\d+)/appointments", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // find the anchor again to know how to match “same person”
    const anchorRows = await query(
      `
      SELECT
        a.id,
        a.full_name,
        a.email,
        a.phone
      FROM appointments a
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );
    const anchor = anchorRows[0];
    if (!anchor) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    let apptRows;
    if (anchor.email) {
      // match by email
      apptRows = await query(
        `
        SELECT
          a.id,
          -- your appointments table DOES NOT have a "procedure" column,
          -- so we only use procedures.name, then procedure_id as fallback
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
        [anchor.email]
      );
    } else {
      // match by name + phone
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
        [anchor.full_name, anchor.phone, anchor.phone]
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

module.exports = router;

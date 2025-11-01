// server/src/routes/adminPatients.js
const express = require("express");
const router = express.Router();
const { query } = require("../db");

// GET /api/admin/patients
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);
    const search = (req.query.search || "").toString().trim();

    const offset = (page - 1) * pageSize;

    let where = "1=1";
    const params = [];

    if (search) {
      where += " AND (p.full_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const totalRows = await query(
      `SELECT COUNT(*) AS cnt FROM patients p WHERE ${where}`,
      params
    );
    const total = totalRows[0]?.cnt || 0;

    const rows = await query(
      `
      SELECT
        p.id,
        p.full_name AS name,
        p.email,
        p.phone,
        p.gender,
        p.age,
        p.address,
        p.last_visit,
        p.created_at
      FROM patients p
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      gender: r.gender,
      age: r.age != null ? Number(r.age) : null,
      address: r.address,
      lastVisit: r.last_visit,
    }));

    res.json({ ok: true, page, pageSize, total, items });
  } catch (e) {
    console.error("[adminPatients:list]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

// GET /api/admin/patients/:id
router.get("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(
      `
      SELECT
        p.id,
        p.full_name AS name,
        p.email,
        p.phone,
        p.gender,
        p.age,
        p.address,
        p.last_visit,
        p.created_at
      FROM patients p
      WHERE p.id = ?
      LIMIT 1
      `,
      [id]
    );

    const row = rows[0];
    if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    res.json({
      ok: true,
      patient: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        gender: row.gender,
        age: row.age != null ? Number(row.age) : null,
        address: row.address,
        lastVisit: row.last_visit,
        created_at: row.created_at,
      },
    });
  } catch (e) {
    console.error("[adminPatients:getOne]", e);
    res.status(500).json({ ok: false, error: "DB_ERROR" });
  }
});

module.exports = router;

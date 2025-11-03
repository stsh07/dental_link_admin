// server/src/routes/notifications.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

/* minimal helpers */
const toISO = (x) => {
  const d = x ? new Date(x) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : "";
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      type VARCHAR(50) NOT NULL,
      ref_id BIGINT UNSIGNED NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_type_ref (type, ref_id),
      KEY idx_created (created_at),
      KEY idx_is_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/* backfill from PENDING appointments (one-time per appointment) */
async function seedFromPending(limit = 200) {
  await pool.query(
    `
    INSERT INTO notifications (type, ref_id, title, body, created_at)
    SELECT
      'APPOINTMENT_SUBMITTED' AS type,
      a.id AS ref_id,
      'New appointment submitted' AS title,
      CONCAT(
        COALESCE(NULLIF(TRIM(a.full_name), ''), COALESCE(NULLIF(TRIM(a.email), ''), COALESCE(NULLIF(TRIM(a.phone), ''), 'Unknown'))),
        ' requested an appointment',
        CASE
          WHEN a.preferred_date IS NOT NULL OR a.preferred_time IS NOT NULL
            THEN CONCAT(' • ', COALESCE(a.preferred_date, ''), CASE WHEN a.preferred_time IS NOT NULL THEN CONCAT(' ', a.preferred_time) ELSE '' END)
          ELSE ''
        END
      ) AS body,
      COALESCE(a.created_at, NOW()) AS created_at
    FROM appointments a
    LEFT JOIN notifications n
      ON n.type = 'APPOINTMENT_SUBMITTED' AND n.ref_id = a.id
    WHERE UPPER(a.status) = 'PENDING'
      AND n.id IS NULL
    ORDER BY a.created_at DESC
    LIMIT ?;
    `,
    [Math.min(Math.max(parseInt(limit || 200, 10), 1), 500)]
  );
}

/* GET /api/notifications?limit=50
   Returns unread notifications only, each with apptId (ref_id). */
router.get("/", async (req, res) => {
  try {
    await ensureTable();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);

    // Backfill before read so new PENDING appointments show up
    await seedFromPending(limit);

    const [rows] = await pool.query(
      `
      SELECT id, type, ref_id, title, body, is_read, created_at
      FROM notifications
      WHERE is_read = 0
      ORDER BY created_at DESC
      LIMIT ?;
      `,
      [limit]
    );

    const items = rows.map((r) => ({
      id: Number(r.id),               // notification id
      apptId: r.ref_id ? Number(r.ref_id) : null, // appointment id to open
      title: r.title || "Notification",
      body: r.body || "",
      date: toISO(r.created_at),
      read: !!r.is_read,
    }));

    res.json({ ok: true, items });
  } catch (e) {
    console.error("[notifications] error:", e);
    res.status(500).json({ ok: false, error: e.message || "NOTIF_ERROR" });
  }
});

/* Mark one notification as read */
router.patch("/:id/read", async (req, res) => {
  try {
    await ensureTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ ok: false, error: "BAD_ID" });
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "NOTIF_ERROR" });
  }
});

module.exports = router;

// server/src/routes/services.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "services");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "");
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

const DEFAULT_SERVICES = [
  {
    name: "Dental Braces",
    description:
      "Orthodontic treatment using brackets and wires (or aligners) to straighten teeth and correct bite issues.",
    image_url: "dentalBraces.svg",
  },
  {
    name: "Cleaning",
    description:
      "Professional removal of plaque, tartar, and stains to prevent cavities and gum disease.",
    image_url: "cleaning.svg",
  },
  {
    name: "Root Canal",
    description:
      "Removes infected or inflamed pulp from inside the tooth, cleans it, and seals it to save the tooth.",
    image_url: "rootCCanal.svg",
  },
  {
    name: "Tooth Extraction",
    description:
      "Removal of a tooth that is decayed, damaged, or impacted (like wisdom teeth).",
    image_url: "toothExtraction.svg",
  },
  {
    name: "Dental Consultation",
    description:
      "Initial check-up where the dentist examines your teeth, gums, and mouth, often with x-rays if needed.",
    image_url: "dentalConsultation.svg",
  },
  {
    name: "Tooth Filling",
    description:
      "Restores a decayed or damaged tooth using materials like composite resin, amalgam, or porcelain.",
    image_url: "toothFilling.svg",
  },
];

async function ensureServicesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      image_url VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function upsertDefaultServices() {
  await ensureServicesTable();
  for (const svc of DEFAULT_SERVICES) {
    const [rows] = await pool.query(
      "SELECT id FROM services WHERE name = ? LIMIT 1",
      [svc.name]
    );
    if (rows.length === 0) {
      await pool.query(
        "INSERT INTO services (name, description, image_url) VALUES (?, ?, ?)",
        [svc.name, svc.description, svc.image_url]
      );
    } else {
      await pool.query(
        "UPDATE services SET description = ?, image_url = ? WHERE id = ?",
        [svc.description, svc.image_url, rows[0].id]
      );
    }
  }
}

router.get("/", async (_req, res) => {
  try {
    await ensureServicesTable();
    const [rows] = await pool.query(
      "SELECT id, name, description, image_url, created_at FROM services ORDER BY id ASC"
    );
    res.json({ ok: true, data: rows });
  } catch (_err) {
    res.status(500).json({ ok: false, error: "Failed to fetch services" });
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required" });
  }

  let image_url = null;
  if (req.file) {
    image_url = `services/${req.file.filename}`;
  } else if (req.body.image_url) {
    image_url = req.body.image_url;
  }

  try {
    await ensureServicesTable();
    const [r] = await pool.query(
      "INSERT INTO services (name, description, image_url) VALUES (?, ?, ?)",
      [name.trim(), description || null, image_url]
    );
    const [rows] = await pool.query(
      "SELECT id, name, description, image_url, created_at FROM services WHERE id = ?",
      [r.insertId]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("POST /api/services error:", err);
    res.status(500).json({ ok: false, error: "Failed to create service" });
  }
});

router.post("/sync-defaults", async (_req, res) => {
  try {
    await upsertDefaultServices();
    res.json({ ok: true });
  } catch (_err) {
    res.status(500).json({ ok: false, error: "Failed to sync services" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    await ensureServicesTable();

    async function tryDeleteAppointments(sql) {
      try {
        await pool.query(sql, [id]);
      } catch (err) {
        if (err && err.code === "ER_BAD_FIELD_ERROR") return;
        throw err;
      }
    }

    await tryDeleteAppointments(
      "DELETE FROM appointments WHERE service_id = ?"
    );
    await tryDeleteAppointments(
      "DELETE FROM appointments WHERE procedure_id = ?"
    );
    await tryDeleteAppointments(
      "DELETE FROM appointments WHERE services_id = ?"
    );
    await tryDeleteAppointments(
      "DELETE FROM appointments WHERE serviceId = ?"
    );
    await tryDeleteAppointments(
      "DELETE FROM appointments WHERE procedureId = ?"
    );

    const [r] = await pool.query("DELETE FROM services WHERE id = ?", [id]);
    if (r.affectedRows === 0)
      return res.status(404).json({ ok: false, error: "Service not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/services/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete service" });
  }
});

router.upsertDefaultServices = upsertDefaultServices;
module.exports = router;

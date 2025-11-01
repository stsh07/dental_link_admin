// server/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ping, setupGracefulShutdown } = require("./db");

const app = express();

/* ---------- CORS (hardened) ---------- */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
// Allow comma-separated overrides in env, e.g. CORS_ORIGIN=http://foo:8080,http://bar:3001
const extra = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ORIGINS, ...extra]));

const corsConfig = {
  origin(origin, cb) {
    // Allow server-to-server/no-Origin cases (Postman, curl, same-origin)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition"],
};

app.use(cors(corsConfig));
// make sure every preflight receives CORS headers
app.options("*", cors(corsConfig));

/* ---------- Body parsing ---------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Static uploads ---------- */
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Routers ---------- */
const authRouter = require("./routes/auth");
const resetAdminRouter = require("./routes/reset-admin");
const appointmentsRouter = require("./routes/appointments");
const doctorsRouter = require("./routes/doctors");
const reviewsRouter = require("./routes/reviews");
const adminPatientsRouter = require("./routes/adminPatients"); // 👈 ADD THIS

app.use("/api/auth", authRouter);
app.use("/api/reset-admin", resetAdminRouter);

// 👇 mount BEFORE the generic /api router (not strictly required, but cleaner)
app.use("/api/admin/patients", adminPatientsRouter);

app.use("/api", appointmentsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api", reviewsRouter);

/* ---------- 404 ---------- */
app.use((req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND" }));

/* ---------- Error handler (keeps CORS headers) ---------- */
app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err?.message || err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

/* ---------- Start ---------- */
const PORT = Number(process.env.PORT || 4002);
app.listen(PORT, async () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log("CORS allowed origins:", ALLOWED_ORIGINS);
  try {
    await ping();
    console.log("[db] connection OK");
  } catch (e) {
    console.error("[db] ping failed:", e.message || e);
  }
  setupGracefulShutdown();
});

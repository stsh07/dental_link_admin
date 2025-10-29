// server/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ping, setupGracefulShutdown } = require("./db");

const app = express();

/* ---------- CORS ---------- */
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: [CORS_ORIGIN, "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Static uploads ---------- */
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Routers (mount BEFORE 404) ---------- */
const authRouter = require("./routes/auth");
const resetAdminRouter = require("./routes/reset-admin");

// ⬇️ these two are needed by your dashboard & appointments pages
const appointmentsRouter = require("./routes/appointments");
const adminRouter = require("./routes/admin");
const doctorsRouter = require("./routes/doctors");

app.use("/api/auth", authRouter);
app.use("/api/reset-admin", resetAdminRouter);

// Mount the appointments router at /api so it serves:
//   /api/admin/appointments
//   /api/admin/appointments/:id
//   /api/appointments/:id/status
app.use("/api", appointmentsRouter);

// Admin + doctors
app.use("/api/admin", adminRouter);
app.use("/api/doctors", doctorsRouter);

/* ---------- 404 ---------- */
app.use((req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND" }));

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

/* ---------- Start ---------- */
const PORT = Number(process.env.PORT || 4002);
app.listen(PORT, async () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
  try { await ping(); console.log("[db] connection OK"); }
  catch (e) { console.error("[db] ping failed:", e.message || e); }
  setupGracefulShutdown();
});

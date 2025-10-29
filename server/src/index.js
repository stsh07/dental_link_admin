// server/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

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

/* ---------- Small helper to safely import routers ---------- */
function loadRouter(modulePath) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(modulePath);
    // Prefer named `router`, then default, then the module itself
    const candidate = mod?.router || mod?.default || mod;

    // A valid Express router/middleware has a `handle` function
    if (candidate && typeof candidate === "function") return candidate;
    if (candidate && typeof candidate.handle === "function") return candidate;

    console.warn(`[router] Skipped mounting ${modulePath}: not an Express router export.`);
    return null;
  } catch (err) {
    console.error(`[router] Failed loading ${modulePath}:`, err.message);
    return null;
  }
}

/* ---------- Routes ---------- */
const authRouter = loadRouter("./routes/auth");
const doctorsRouter = loadRouter("./routes/doctors");
const appointmentsRouter = loadRouter("./routes/appointments");
const adminRouter = loadRouter("./routes/admin");
const resetAdminRouter = loadRouter("./routes/reset-admin");

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (authRouter) app.use("/api/auth", authRouter);
if (doctorsRouter) app.use("/api/doctors", doctorsRouter);
if (appointmentsRouter) app.use("/api/appointments", appointmentsRouter);
if (adminRouter) app.use("/api/admin", adminRouter);
if (resetAdminRouter) app.use("/api/reset-admin", resetAdminRouter);

/* ---------- 404 ---------- */
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "NOT_FOUND" });
});

/* ---------- Error handler ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

/* ---------- Start ---------- */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

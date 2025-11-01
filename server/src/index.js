// server/src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ping, setupGracefulShutdown } = require("./db");

const app = express();

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const extra = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ORIGINS, ...extra]));

const corsConfig = {
  origin(origin, cb) {
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
app.options("*", cors(corsConfig));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const authRouter = require("./routes/auth");
const resetAdminRouter = require("./routes/reset-admin");
const appointmentsRouter = require("./routes/appointments");
const doctorsRouter = require("./routes/doctors");
const reviewsRouter = require("./routes/reviews");
const adminPatientsRouter = require("./routes/adminPatients");
const changePasswordRouter = require("./routes/change-password");
const servicesRouter = require("./routes/services");

app.use("/api/auth", authRouter);
app.use("/api/reset-admin", resetAdminRouter);
app.use("/api/admin/patients", adminPatientsRouter);
app.use("/api", appointmentsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api", reviewsRouter);
app.use("/api/change-password", changePasswordRouter);
app.use("/api/services", servicesRouter);

app.use((req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND" }));

app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err?.message || err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

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

  if (typeof servicesRouter.upsertDefaultServices === "function") {
    try {
      await servicesRouter.upsertDefaultServices();
      console.log("[services] default services synced");
    } catch (e) {
      console.error("[services] sync failed:", e.message || e);
    }
  }

  setupGracefulShutdown();
});

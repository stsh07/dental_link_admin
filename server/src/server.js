require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const doctorsRoutes = require('./routes/doctors');

const app = express();
const PORT = Number(process.env.PORT || 4000);

// allow Next (3000) + Vite (5173)
const allowedOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173',
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// quick health + admin ping
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/admin/ping', (_req, res) => res.json({ ok: true }));

app.use('/api/doctors', doctorsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', appointmentRoutes);

// fallbacks
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (String(err.message || '').startsWith('CORS blocked:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

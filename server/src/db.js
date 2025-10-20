require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_PASS = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: DB_PASS,
  database: process.env.DB_NAME || 'dental_link',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  timezone: 'Z',
});

async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function ping() {
  const conn = await pool.getConnection();
  try { await conn.ping(); return true; }
  finally { conn.release(); }
}

function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    try { await pool.end(); console.log(`[db] pool closed (${signal})`); process.exit(0); }
    catch (e) { console.error('[db] pool end error:', e); process.exit(1); }
  };
  ['SIGINT','SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
}

module.exports = { pool, query, ping, setupGracefulShutdown };

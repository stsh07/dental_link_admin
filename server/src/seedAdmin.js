require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

(async () => {
  try {
    // Ensure table exists (adds role if missing)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','user') NOT NULL DEFAULT 'admin'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const email = 'admin@dental.com';
    const plain = '123456';
    const hash = await bcrypt.hash(plain, 10);

    await pool.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, "admin") ON DUPLICATE KEY UPDATE email=email',
      [email, hash]
    );

    console.log(`Seeded admin -> ${email} / ${plain}`);
    process.exit(0);
  } catch (e) {
    console.error('SEED_ERROR', e);
    process.exit(1);
  }
})();

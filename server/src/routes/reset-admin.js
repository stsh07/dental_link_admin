const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
  try {
    // ⬇️ adjust only if your MySQL creds are different
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,         // your phpMyAdmin shows 3307
      user: 'root',
      password: '',       // put your MySQL password if you have one
      database: 'dental_link'
    });

    const email = 'admin@gmail.com';
    const pass  = 'admin12345';

    const hash = await bcrypt.hash(pass, 10);

    // ensure the row is ADMIN and has a bcrypt hash
    await conn.execute(
      "UPDATE users SET firstName=?, lastName=?, email=?, passwordHash=?, role='ADMIN' WHERE email=? LIMIT 1",
      ['Admin', 'DentalLink', email, hash, email]
    );

    // show a quick sanity check
    const [rows] = await conn.execute(
      "SELECT email, role, LEFT(passwordHash,4) AS prefix, LENGTH(passwordHash) AS len FROM users WHERE email=?",
      [email]
    );
    console.log(rows[0]); 

    await conn.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

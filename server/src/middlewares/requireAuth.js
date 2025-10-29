const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/.exec(auth);
  if (!m) return res.status(401).json({ error: 'Missing Authorization header' });

  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET || 'dev_fallback_secret');
    // payload = { userId, email, role, iat, exp }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };

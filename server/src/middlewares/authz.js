const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';

// adds req.user = { userId, email, role }
function verifyJWT(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTH' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'UNAUTH' }); }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTH' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  };
}

module.exports = { verifyJWT, requireRole };

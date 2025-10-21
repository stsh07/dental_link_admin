const router = require('express').Router();

// sample admin-only endpoint
router.get('/dashboard', (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;

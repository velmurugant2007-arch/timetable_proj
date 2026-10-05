const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches req.user.
 */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, college: user.college };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = auth;

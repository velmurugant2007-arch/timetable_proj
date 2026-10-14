const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches req.user.
 */
async function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('id', decoded.id).maybeSingle();

    if (!user) {
      // Fallback to token payload if user record exists in session
      if (decoded.id && decoded.email) {
        req.user = { id: decoded.id, name: decoded.name, email: decoded.email };
        return next();
      }
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, college: user.college };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = auth;

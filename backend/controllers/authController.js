const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/db');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, college } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Required fields missing' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabase.from('users').insert([{
      id: uuidv4(), name, email, password: hashedPassword, college: college || 'PSNA CET'
    }]).select().single();
    if (error) throw error;

    const token = generateToken(data);
    res.status(201).json({ success: true, data: { token, user: { id: data.id, name: data.name, email: data.email, college: data.college } } });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    
    if (error || !user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, college: user.college } } });
  } catch (err) { next(err); }
};

exports.getMe = (req, res) => {
  res.json({ success: true, data: req.user });
};

const { supabase } = require('../config/db');

exports.getSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').update(req.body).eq('id', 1).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

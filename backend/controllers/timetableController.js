const { supabase } = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('timetables').select('*');
    if (error) throw error;
    
    // The previous API expected an object mapped by id, so we transform it:
    const map = {};
    if (data) {
      data.forEach(t => { map[t.id] = t; });
    }
    res.json({ success: true, data: map });
  } catch (err) { next(err); }
};

exports.save = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { grid } = req.body;
    
    // Upsert the timetable
    const { data, error } = await supabase.from('timetables').upsert([{ id, grid: grid || {} }]).select().single();
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.clear = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('timetables').delete().eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

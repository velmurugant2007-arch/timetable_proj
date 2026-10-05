const { supabase } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('years').select('*').order('name');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, sections } = req.body;
    const id = uuidv4();
    const { data, error } = await supabase.from('years').insert([{ id, name, sections: sections || [] }]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sections } = req.body;
    const { data, error } = await supabase.from('years').update({ name, sections }).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('years').delete().eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

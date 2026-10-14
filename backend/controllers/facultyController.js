const { supabase } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('faculty').select('*').order('name');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, designation, isMedicalLeave, remarks, acronym, image } = req.body;
    const id = uuidv4();
    const { data, error } = await supabase.from('faculty').insert([{
      id, name, designation, "isMedicalLeave": !!isMedicalLeave, remarks, acronym, image
    }]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.isMedicalLeave !== undefined) {
      updateData.isMedicalLeave = !!updateData.isMedicalLeave;
    }
    const { data, error } = await supabase.from('faculty').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('faculty').delete().eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRaw = exports.getAll;

exports.getSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: faculty } = await supabase.from('faculty').select('*').eq('id', id).maybeSingle();
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).maybeSingle();
    let schedule = null;
    if (dbMasterTT && dbMasterTT.faculty) {
      const match = dbMasterTT.faculty.find(f => f.id === id || (faculty && f.acronym === faculty.acronym));
      if (match) schedule = match.schedule;
    }
    res.json({ success: true, data: { faculty, schedule } });
  } catch (err) { next(err); }
};

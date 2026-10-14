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
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sections !== undefined) updateData.sections = sections;

    const { data, error } = await supabase.from('years').update(updateData).or(`id.eq.${id},name.eq.${id}`).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('years').delete().or(`id.eq.${id},name.eq.${id}`).select();
    if (error) throw error;
    res.json({ success: true, data: data?.[0] || { id } });
  } catch (err) { next(err); }
};

exports.addSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { section } = req.body;
    if (!section) return res.status(400).json({ success: false, error: 'Section is required' });

    const { data: year, error: findError } = await supabase
      .from('years')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    if (findError || !year) return res.status(404).json({ success: false, error: 'Year not found' });

    const current = Array.isArray(year.sections) ? year.sections : [];
    if (!current.includes(section)) {
      current.push(section);
    }
    const { data, error } = await supabase
      .from('years')
      .update({ sections: current })
      .eq('id', year.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { id, section } = req.params;
    const { newSection } = req.body;
    if (!newSection) return res.status(400).json({ success: false, error: 'New section name is required' });

    const { data: year, error: findError } = await supabase
      .from('years')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    if (findError || !year) return res.status(404).json({ success: false, error: 'Year not found' });

    const current = Array.isArray(year.sections) ? year.sections : [];
    const updated = current.map(s => s === section ? newSection : s);

    const { data, error } = await supabase
      .from('years')
      .update({ sections: updated })
      .eq('id', year.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const { id, section } = req.params;
    const { data: year, error: findError } = await supabase
      .from('years')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    if (findError || !year) return res.status(404).json({ success: false, error: 'Year not found' });

    const current = Array.isArray(year.sections) ? year.sections : [];
    const updated = current.filter(s => s !== section);

    const { data, error } = await supabase
      .from('years')
      .update({ sections: updated })
      .eq('id', year.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const { supabase } = require('../config/db');
const { parseExcelTimetable } = require('../services/excelParser');
const { parseDocxTimetable } = require('../services/docxParser');
const fs = require('fs');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('imported_timetables').select('*');
    if (error) throw error;
    const map = {};
    if (data) {
      data.forEach(t => { map[t.id] = t; });
    }
    res.json({ success: true, data: map });
  } catch (err) { next(err); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    
    const filePath = req.file.path;
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    
    // To properly resolve IDs, we need local references to subjects and faculty
    const { data: years } = await supabase.from('years').select('*');
    const { data: subjects } = await supabase.from('subjects').select('*');
    const { data: faculty } = await supabase.from('faculty').select('*');
    
    let parsedData = [];
    if (['xlsx', 'xls'].includes(fileExt)) {
      parsedData = await parseExcelTimetable(filePath, subjects, faculty);
    } else if (['docx', 'doc'].includes(fileExt)) {
      parsedData = await parseDocxTimetable(filePath, subjects, faculty);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, error: 'Unsupported file format. Please upload Excel or Word doc.' });
    }
    
    fs.unlinkSync(filePath);
    
    // Save all parsed timetables to Supabase
    for (const tt of parsedData) {
      const id = `${tt.year}__${tt.section}`;
      await supabase.from('imported_timetables').upsert([{ id, data: tt.grid }]);
    }
    
    // Fetch fresh data
    const { data: freshData } = await supabase.from('imported_timetables').select('*');
    const map = {};
    if (freshData) {
      freshData.forEach(t => { map[t.id] = t; });
    }
    
    res.json({ success: true, message: 'File imported successfully', data: map });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

exports.clearAll = async (req, res, next) => {
  try {
    const { error } = await supabase.from('imported_timetables').delete().neq('id', 'dummy');
    if (error) throw error;
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

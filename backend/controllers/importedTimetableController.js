const { supabase } = require('../config/db');
const { parseDocxFile } = require('../services/docxParser');
const fs = require('fs');

exports.getImportedTimetables = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('imported_timetables').select('*');
    if (error) throw error;
    const map = {};
    if (data) {
      data.forEach(t => {
        if (t.data && typeof t.data === 'object' && t.data.grid) {
          map[t.id] = { id: t.id, ...t.data };
        } else {
          const [yearName, section] = (t.id || '').split('__');
          map[t.id] = {
            id: t.id,
            yearName: yearName || 'Unknown Year',
            section: section || 'A',
            grid: t.data || {},
            lastGenerated: new Date().toISOString(),
          };
        }
      });
    }
    res.json({ success: true, data: map });
  } catch (err) { next(err); }
};

exports.uploadDocx = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  try {
    let totalSections = 0;
    for (const file of files) {
      try {
        const result = await parseDocxFile(file.path, file.originalname);
        if (result && Array.isArray(result.sections)) {
          for (const sec of result.sections) {
            const id = `${sec.yearName}__${sec.section}`;
            const entryData = {
              id,
              yearName: sec.yearName,
              section: sec.section,
              grid: sec.grid,
              subjects: sec.subjects || [],
              lastGenerated: new Date().toISOString()
            };
            await supabase.from('imported_timetables').upsert([{ id, data: entryData }]);
            totalSections++;
          }
        }
      } finally {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    const { data: freshData, error } = await supabase.from('imported_timetables').select('*');
    if (error) throw error;
    const map = {};
    if (freshData) {
      freshData.forEach(t => {
        if (t.data && typeof t.data === 'object' && t.data.grid) {
          map[t.id] = { id: t.id, ...t.data };
        } else {
          const [yearName, section] = (t.id || '').split('__');
          map[t.id] = {
            id: t.id,
            yearName: yearName || 'Unknown Year',
            section: section || 'A',
            grid: t.data || {},
            lastGenerated: new Date().toISOString(),
          };
        }
      });
    }

    res.json({
      success: true,
      data: {
        importedTimetables: map,
        message: `Successfully imported ${totalSections} section timetable(s).`
      }
    });
  } catch (err) {
    files.forEach(f => {
      if (f.path && fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path); } catch (e) {}
      }
    });
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

exports.initDefaultImportedData = async () => {
  // Safe initializer for server startup
  try {
    const { data, error } = await supabase.from('imported_timetables').select('id').limit(1);
    if (error) {
      console.warn('Could not query imported_timetables table:', error.message);
    }
  } catch (err) {
    console.warn('initDefaultImportedData skipped:', err.message);
  }
};

exports.getAll = exports.getImportedTimetables;
exports.uploadFile = exports.uploadDocx;

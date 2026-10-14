const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/db');
const { parseMasterStaffExcel, parseAcronymMappingExcel, mergeFacultyMasterTT } = require('../services/masterStaffTTParser');
const { parseIndividualTTDocx } = require('../services/docxParser');

/**
 * Upload Master Staff Timetable (.xlsx, .xls) or Individual Timetable (.docx, .doc)
 */
exports.uploadMasterStaffTT = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No timetable file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let parsedData;

    if (['.docx', '.doc'].includes(ext)) {
      parsedData = await parseIndividualTTDocx(req.file.path);
    } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      parsedData = parseMasterStaffExcel(req.file.path);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format. Please upload .xlsx, .xls, or .docx file.'
      });
    }

    if (!parsedData || !Array.isArray(parsedData.faculty) || parsedData.faculty.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract faculty schedules from the uploaded file. Please check the file structure.'
      });
    }

    // Check existing acronym mappings from database
    const { data: dbMappings } = await supabase.from('faculty_acronym_map').select('*');
    let enrichedData = parsedData;
    if (dbMappings && dbMappings.length > 0) {
      enrichedData = mergeFacultyMasterTT(parsedData, dbMappings);
    } else {
      enrichedData.faculty = (enrichedData.faculty || []).map((f, idx) => ({
        ...f,
        slNo: f.slNo || idx + 1,
        isMapped: !!(f.acronym && !f.acronym.includes('_')),
      }));
    }

    const updatedData = {
      id: 1,
      meta: enrichedData.meta || {},
      faculty: enrichedData.faculty || [],
      generated: new Date().toISOString()
    };

    await supabase.from('faculty_master_tt').upsert([updatedData]);

    res.json({
      success: true,
      message: `Master staff timetable imported successfully! (${updatedData.faculty.length} faculty schedules loaded)`,
      data: {
        ...updatedData,
        masterTT: updatedData,
        mappings: dbMappings || []
      }
    });
  } catch (err) {
    console.error('Error in uploadMasterStaffTT:', err);
    next(err);
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
  }
};

/**
 * Upload Acronym Mapping Excel file (.xlsx, .xls)
 */
exports.uploadAcronymMapping = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No mapping file uploaded.' });
    }

    const mappings = parseAcronymMappingExcel(req.file.path);
    if (!mappings || mappings.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid faculty acronym mappings found in the uploaded file.' });
    }

    // Save mappings to database
    await supabase.from('faculty_acronym_map').delete().neq('id', '__none__');
    const mappingsWithIds = mappings.map((m, idx) => ({
      id: m.id || `map_${Date.now()}_${idx}`,
      ...m
    }));
    await supabase.from('faculty_acronym_map').insert(mappingsWithIds);

    // If masterTT already exists in DB, merge it with the new mappings
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).maybeSingle();
    let updatedMasterTT = dbMasterTT;

    if (dbMasterTT && Array.isArray(dbMasterTT.faculty) && dbMasterTT.faculty.length > 0) {
      const merged = mergeFacultyMasterTT(dbMasterTT, mappings);
      updatedMasterTT = {
        id: 1,
        meta: merged.meta,
        faculty: merged.faculty,
        generated: new Date().toISOString()
      };
      await supabase.from('faculty_master_tt').upsert([updatedMasterTT]);
    }

    res.json({
      success: true,
      message: `Faculty acronym mappings imported successfully (${mappings.length} faculty mapped).`,
      data: {
        mappings: mappingsWithIds,
        masterTT: updatedMasterTT
      }
    });
  } catch (err) {
    console.error('Error in uploadAcronymMapping:', err);
    next(err);
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
  }
};

/**
 * Get individual faculty schedule
 */
exports.getIndividualSchedule = async (req, res, next) => {
  try {
    const { acronym } = req.params;
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).maybeSingle();
    if (!dbMasterTT || !Array.isArray(dbMasterTT.faculty)) {
      return res.status(404).json({ success: false, error: 'Master TT not generated.' });
    }

    const fac = dbMasterTT.faculty.find(f => 
      (f.acronym && f.acronym.toUpperCase() === acronym.toUpperCase()) || 
      (f.fullName && f.fullName.toLowerCase() === acronym.toLowerCase())
    );
    if (!fac) return res.status(404).json({ success: false, error: 'Faculty not found.' });
    
    res.json({ success: true, data: fac });
  } catch (err) { next(err); }
};

/**
 * Clear faculty master timetable and/or mappings
 */
exports.clearFacultyMasterTT = async (req, res, next) => {
  try {
    const { type } = req.query;

    if (type === 'mappings') {
      await supabase.from('faculty_acronym_map').delete().neq('id', '__none__');
      const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).maybeSingle();
      if (dbMasterTT && Array.isArray(dbMasterTT.faculty)) {
        const unmapped = dbMasterTT.faculty.map(f => ({ ...f, isMapped: false }));
        await supabase.from('faculty_master_tt').upsert([{ id: 1, ...dbMasterTT, faculty: unmapped }]);
      }
    } else if (type === 'timetable' || type === 'master') {
      await supabase.from('faculty_master_tt').upsert([{ id: 1, meta: {}, faculty: [], generated: null }]);
    } else {
      // type === 'all'
      await supabase.from('faculty_acronym_map').delete().neq('id', '__none__');
      await supabase.from('faculty_master_tt').upsert([{ id: 1, meta: {}, faculty: [], generated: null }]);
    }

    res.json({ success: true, message: 'Data cleared successfully' });
  } catch (err) { next(err); }
};

/**
 * Get Faculty Master Timetable & mappings
 */
exports.getFacultyMasterTT = async (req, res, next) => {
  try {
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).maybeSingle();
    const { data: dbMappings } = await supabase.from('faculty_acronym_map').select('*');

    const masterTTObj = dbMasterTT || { id: 1, meta: {}, faculty: [] };
    const mappingsList = dbMappings || [];

    res.json({
      success: true,
      data: {
        ...masterTTObj,
        masterTT: masterTTObj,
        mappings: mappingsList
      }
    });
  } catch (err) { next(err); }
};

/**
 * Generate Master Faculty Timetable from subjects/timetables
 */
exports.generateFacultyMasterTT = async (req, res, next) => {
  try {
    const { data: facultyList } = await supabase.from('faculty').select('*');
    const { data: subjectsList } = await supabase.from('subjects').select('*');
    const { data: timetables } = await supabase.from('timetables').select('*');
    const { data: imported } = await supabase.from('imported_timetables').select('*');
    const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

    if (!facultyList || facultyList.length === 0) {
      return res.status(400).json({ success: false, error: 'No faculty available.' });
    }

    const DAYS = (settings && settings.workingDays) || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const PERIODS = (settings && settings.periodsPerDay) || 7;

    const facultySchedules = {};
    facultyList.forEach(fac => {
      facultySchedules[fac.id] = {
        id: fac.id,
        fullName: fac.name,
        acronym: fac.acronym || fac.name.substring(0, 3).toUpperCase(),
        designation: fac.designation,
        isMedicalLeave: fac.isMedicalLeave,
        remarks: fac.remarks,
        schedule: {}
      };
      const fullDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      fullDays.forEach(day => {
        facultySchedules[fac.id].schedule[day] = {};
        for (let p = 1; p <= PERIODS; p++) {
          facultySchedules[fac.id].schedule[day][p] = null;
        }
      });
    });

    const processGrid = (ttId, grid, isImported) => {
      if (!grid) return;
      const parts = (ttId || '').split('__');
      if (parts.length < 2) return;
      const year = parts[0];
      const section = parts[1];

      for (const day of Object.keys(grid)) {
        if (!grid[day]) continue;
        for (const p of Object.keys(grid[day])) {
          const cell = grid[day][p];
          if (!cell || !cell.subjectId) continue;
          
          let subject = null;
          if (isImported) {
             subject = (subjectsList || []).find(s => s.code === cell.subjectId);
          } else {
             subject = (subjectsList || []).find(s => s.id === cell.subjectId);
          }
          
          if (subject && subject.facultyId && facultySchedules[subject.facultyId]) {
             const facId = subject.facultyId;
             const upperDay = day.toUpperCase();
             if (facultySchedules[facId].schedule[upperDay]) {
                facultySchedules[facId].schedule[upperDay][p] = {
                   year,
                   section,
                   subjectCode: subject.code,
                   raw: cell
                };
             }
          }
        }
      }
    };

    if (timetables) timetables.forEach(t => processGrid(t.id, t.grid, false));
    if (imported) imported.forEach(t => processGrid(t.id, t.data, true));

    const finalArray = Object.values(facultySchedules);
    finalArray.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

    const updatedData = {
      id: 1,
      meta: { totalFaculty: finalArray.length, periodsPerDay: PERIODS },
      faculty: finalArray,
      generated: new Date().toISOString()
    };

    await supabase.from('faculty_master_tt').upsert([updatedData]);

    res.json({
      success: true,
      message: 'Faculty Master Timetable generated successfully.',
      data: {
        ...updatedData,
        masterTT: updatedData,
        isGenerated: true
      }
    });
  } catch (err) { next(err); }
};

/**
 * Faculty acronym map CRUD
 */
exports.getFacultyAcronymMap = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('faculty_acronym_map').select('*');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.updateFacultyAcronymMap = async (req, res, next) => {
  try {
    const mapping = req.body;
    if (!Array.isArray(mapping)) return res.status(400).json({ success: false, error: 'Expected array' });

    await supabase.from('faculty_acronym_map').delete().neq('id', '__none__');
    if (mapping.length > 0) {
      await supabase.from('faculty_acronym_map').insert(mapping);
    }
    
    const { data } = await supabase.from('faculty_acronym_map').select('*');
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

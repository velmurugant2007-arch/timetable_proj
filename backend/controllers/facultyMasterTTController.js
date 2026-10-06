const { supabase } = require('../config/db');
const fs = require('fs');
const { parseMasterStaffTimetable, parseAcronymMapping } = require('../services/masterStaffTTParser');

exports.uploadMasterStaffTT = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
    const parsedData = parseMasterStaffTimetable(req.file.path);
    
    const updatedData = {
      meta: parsedData.meta,
      faculty: parsedData.faculty,
      generated: new Date().toISOString()
    };

    const { data, error } = await supabase.from('faculty_master_tt').update(updatedData).eq('id', 1).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
  finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
};

exports.uploadAcronymMapping = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No mapping file uploaded.' });
    const mapping = parseAcronymMapping(req.file.path);
    
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).single();
    if (!dbMasterTT) return res.status(404).json({ success: false, error: 'No master timetable found.' });

    let updatedCount = 0;
    const facultyArray = dbMasterTT.faculty || [];
    facultyArray.forEach(fac => {
      const matchKey = Object.keys(mapping).find(key => 
        fac.fullName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(fac.fullName.toLowerCase())
      );
      if (matchKey) {
        fac.acronym = mapping[matchKey];
        updatedCount++;
      }
    });

    const { data, error } = await supabase.from('faculty_master_tt').update({ faculty: facultyArray }).eq('id', 1).select().single();
    if (error) throw error;
    res.json({ success: true, message: `Updated acronyms for ${updatedCount} faculty members.`, data });
  } catch (err) { next(err); }
  finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
};

exports.getIndividualSchedule = async (req, res, next) => {
  try {
    const { acronym } = req.params;
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).single();
    if (!dbMasterTT || !dbMasterTT.faculty) return res.status(404).json({ success: false, error: 'Master TT not generated.' });

    const fac = dbMasterTT.faculty.find(f => f.acronym === acronym);
    if (!fac) return res.status(404).json({ success: false, error: 'Faculty not found.' });
    
    res.json({ success: true, data: fac });
  } catch (err) { next(err); }
};

exports.clearFacultyMasterTT = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('faculty_master_tt').update({ meta: {}, faculty: [] }).eq('id', 1).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getFacultyMasterTT = async (req, res, next) => {
  try {
    const { data: dbMasterTT, error } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).single();
    if (error) throw error;
    res.json({ success: true, data: dbMasterTT });
  } catch (err) { next(err); }
};

exports.generateFacultyMasterTT = async (req, res, next) => {
  try {
    // We fetch EVERYTHING to generate it
    const { data: facultyList } = await supabase.from('faculty').select('*');
    const { data: subjectsList } = await supabase.from('subjects').select('*');
    const { data: timetables } = await supabase.from('timetables').select('*');
    const { data: imported } = await supabase.from('imported_timetables').select('*');
    const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

    if (!facultyList || facultyList.length === 0) {
      return res.status(400).json({ success: false, error: 'No faculty available.' });
    }

    const DAYS = settings.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const PERIODS = settings.periodsPerDay || 7;

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
      const parts = ttId.split('__');
      if (parts.length < 2) return;
      const year = parts[0];
      const section = parts[1];

      for (const day of Object.keys(grid)) {
        for (const p of Object.keys(grid[day])) {
          const cell = grid[day][p];
          if (!cell || !cell.subjectId) continue;
          
          let subject = null;
          if (isImported) {
             subject = subjectsList.find(s => s.code === cell.subjectId);
          } else {
             subject = subjectsList.find(s => s.id === cell.subjectId);
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
    finalArray.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const updatedData = {
      meta: { totalFaculty: finalArray.length, periodsPerDay: PERIODS },
      faculty: finalArray,
      generated: new Date().toISOString()
    };

    const { data, error } = await supabase.from('faculty_master_tt').update(updatedData).eq('id', 1).select().single();
    if (error) throw error;

    res.json({ success: true, message: 'Faculty Master Timetable generated successfully.', data });
  } catch (err) { next(err); }
};

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

    // Delete existing
    await supabase.from('faculty_acronym_map').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert new
    if (mapping.length > 0) {
       await supabase.from('faculty_acronym_map').insert(mapping);
    }
    
    const { data } = await supabase.from('faculty_acronym_map').select('*');
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

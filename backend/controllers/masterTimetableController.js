const { supabase } = require('../config/db');
const { parseCurriculum, getSheetNames } = require('../services/curriculumParser');
const { buildFacultyOccupancy, buildYearLabOccupancy, generateSectionTimetable } = require('../services/schedulingEngine');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const sectionKey = (year, section) => `${year}__${section}`;

exports.getSheets = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
    const sheets = getSheetNames(req.file.path);
    res.json({ success: true, data: { sheets } });
  } catch (err) { next(err); }
  finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
};

exports.importAndGenerate = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
    
    const { semesterType, sheetName } = req.body;
    if (!sheetName) return res.status(400).json({ success: false, error: 'Missing sheetName.' });
    if (!semesterType || (semesterType !== 'ODD' && semesterType !== 'EVEN')) {
      return res.status(400).json({ success: false, error: 'Invalid semesterType.' });
    }

    const { courses, yearGroups } = parseCurriculum(req.file.path, sheetName);
    if (courses.length === 0) return res.status(400).json({ success: false, error: 'No valid courses found.' });

    // Fetch existing settings, years, faculty, timetables
    const { data: dbSettings } = await supabase.from('settings').select('*').eq('id', 1).single();
    const { data: dbYears } = await supabase.from('years').select('*');
    const { data: dbFaculty } = await supabase.from('faculty').select('*');
    const { data: dbTimetables } = await supabase.from('timetables').select('*');
    
    if (!dbYears || dbYears.length === 0) return res.status(400).json({ success: false, error: 'No years configured.' });

    const facultyMap = {};
    if (dbFaculty) dbFaculty.forEach(f => facultyMap[f.id] = f);

    const timetablesMap = {};
    if (dbTimetables) dbTimetables.forEach(t => timetablesMap[t.id] = t);

    const newSubjects = [];
    const yearSectionPairs = [];

    // Map curriculum to existing years
    dbYears.forEach((year, yearIdx) => {
      const coursesForYear = yearGroups[yearIdx] || [];
      if (coursesForYear.length === 0) return;

      const sections = year.sections || [];
      sections.forEach(section => {
        yearSectionPairs.push({ yearName: year.name, section });
        
        const isOdd = semesterType === 'ODD';
        const activeCourses = coursesForYear.filter(c => isOdd ? c.semester % 2 !== 0 : c.semester % 2 === 0);

        activeCourses.forEach(course => {
          newSubjects.push({
            id: uuidv4(),
            code: course.code,
            name: course.title,
            year: year.name,
            section,
            hours: course.hours,
            facultyId: 'unassigned',
            isLab: course.isLab,
            L: course.L,
            T: course.T,
            P: course.P,
            semester: course.semester
          });
        });
      });
    });

    // Delete old subjects and insert new ones
    await supabase.from('subjects').delete().neq('id', 'dummy');
    if (newSubjects.length > 0) {
      await supabase.from('subjects').insert(newSubjects);
    }

    // Generate timetables
    const generatedKeys = [];
    for (const { yearName, section } of yearSectionPairs) {
      const key = sectionKey(yearName, section);
      const sectionSubjects = newSubjects
        .filter(s => s.year === yearName && s.section === section)
        .map(s => ({ ...s, facultyName: facultyMap[s.facultyId]?.name || 'TBA' }));

      if (sectionSubjects.length === 0) continue;

      const occ = buildFacultyOccupancy(timetablesMap, key);
      const yearLabOcc = buildYearLabOccupancy(timetablesMap, yearName, key);
      const result = generateSectionTimetable(sectionSubjects, dbSettings || { workingDays: ['MON','TUE','WED','THU','FRI','SAT'], periodsPerDay: 7 }, occ, true, yearLabOcc);

      timetablesMap[key] = { id: key, grid: result.grid, meta: result.meta, year: yearName, section };
      generatedKeys.push(key);
    }

    // Clear old timetables and insert generated ones
    await supabase.from('timetables').delete().neq('id', 'dummy');
    const newTimetables = generatedKeys.map(k => timetablesMap[k]);
    if (newTimetables.length > 0) {
      await supabase.from('timetables').insert(newTimetables);
    }

    res.json({ success: true, data: { coursesImported: courses.length, keys: generatedKeys } });
  } catch (err) { next(err); }
  finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
};

exports.getMasterTimetable = async (req, res, next) => {
  try {
    const { data: dbYears } = await supabase.from('years').select('*');
    const { data: dbSubjects } = await supabase.from('subjects').select('*');
    const { data: timetablesData } = await supabase.from('timetables').select('*');
    const { data: importedData } = await supabase.from('imported_timetables').select('*');

    const timetables = {};
    if (timetablesData) timetablesData.forEach(t => timetables[t.id] = t);
    
    const importedTimetables = {};
    if (importedData) importedData.forEach(t => importedTimetables[t.id] = t);

    res.json({ success: true, data: { years: dbYears || [], subjects: dbSubjects || [], timetables, importedTimetables } });
  } catch (err) { next(err); }
};

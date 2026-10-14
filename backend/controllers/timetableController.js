const { supabase } = require('../config/db');
const { buildFacultyOccupancy, buildYearLabOccupancy, generateSectionTimetable } = require('../services/schedulingEngine');

const sectionKey = (year, section) => `${year}__${section}`;

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

exports.getOne = async (req, res, next) => {
  try {
    const key = req.params.key || req.params.id;
    const { data, error } = await supabase.from('timetables').select('*').eq('id', key).maybeSingle();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.generate = async (req, res, next) => {
  try {
    const { year, section, shuffleOrder } = req.body;
    if (!year || !section) {
      return res.status(400).json({ success: false, error: 'Year and section are required' });
    }
    const key = sectionKey(year, section);

    // Fetch subjects, faculty, timetables, settings
    const { data: dbSubjects, error: sErr } = await supabase.from('subjects').select('*');
    if (sErr) throw sErr;
    const { data: dbFaculty } = await supabase.from('faculty').select('*');
    const { data: dbTimetables } = await supabase.from('timetables').select('*');
    const { data: dbSettings } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

    const facultyMap = {};
    if (dbFaculty) dbFaculty.forEach(f => { facultyMap[f.id] = f; });

    const timetablesMap = {};
    if (dbTimetables) dbTimetables.forEach(t => { timetablesMap[t.id] = t; });

    const sectionSubjects = (dbSubjects || [])
      .filter(s => (s.year === year || s.yearId === year) && s.section === section)
      .map(s => ({ ...s, facultyName: facultyMap[s.facultyId]?.name || 'TBA' }));

    const config = dbSettings || { workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], periodsPerDay: 7 };
    const facultyOcc = buildFacultyOccupancy(timetablesMap, key);
    const yearLabOcc = buildYearLabOccupancy(timetablesMap, year, key);

    const result = generateSectionTimetable(sectionSubjects, config, facultyOcc, !!shuffleOrder, yearLabOcc);

    const timetableData = {
      id: key,
      key,
      year,
      section,
      grid: result.grid,
      conflicts: result.conflicts || [],
      totalHours: result.totalHours,
      totalSlots: result.totalSlots,
      subjectCount: result.subjectCount,
    };

    // Upsert into Supabase
    await supabase.from('timetables').upsert([{ id: key, grid: result.grid }]).select();

    res.json({ success: true, data: timetableData });
  } catch (err) { next(err); }
};

exports.save = async (req, res, next) => {
  try {
    const key = req.params.key || req.params.id;
    const { grid } = req.body || {};
    
    const updateData = { id: key };
    if (grid) updateData.grid = grid;

    const { data, error } = await supabase.from('timetables').upsert([updateData]).select().single();
    if (error) throw error;
    
    res.json({ success: true, data: { ...data, key, saved: true } });
  } catch (err) { next(err); }
};

exports.editCell = async (req, res, next) => {
  try {
    const key = req.params.key || req.params.id;
    const { day, period, subjectId } = req.body;

    const { data: tt, error } = await supabase.from('timetables').select('*').eq('id', key).maybeSingle();
    if (error || !tt) return res.status(404).json({ success: false, error: 'Timetable not found' });

    const grid = tt.grid || {};
    grid[day] = grid[day] || [];
    
    let cellValue = null;
    if (subjectId) {
      const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).maybeSingle();
      if (subject) {
        const { data: faculty } = await supabase.from('faculty').select('*').eq('id', subject.facultyId).maybeSingle();
        cellValue = {
          subjectId: subject.id,
          code: subject.code,
          name: subject.name,
          facultyId: subject.facultyId,
          facultyName: faculty?.name || '',
          isLab: !!subject.isLab,
        };
      } else {
        cellValue = { subjectId };
      }
    }

    const pIdx = Number(period) - 1;
    grid[day][pIdx] = cellValue;

    const { data: updated, error: uErr } = await supabase
      .from('timetables')
      .update({ grid })
      .eq('id', key)
      .select()
      .single();
    if (uErr) throw uErr;

    res.json({ success: true, data: { ...updated, key, grid } });
  } catch (err) { next(err); }
};

exports.clear = async (req, res, next) => {
  try {
    const key = req.params.key || req.params.id;
    const { data, error } = await supabase.from('timetables').delete().eq('id', key).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

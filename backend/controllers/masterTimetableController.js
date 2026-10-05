const { supabase } = require('../config/db');

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

    res.json({
      success: true,
      data: {
        years: dbYears || [],
        subjects: dbSubjects || [],
        timetables,
        importedTimetables
      }
    });
  } catch (err) { next(err); }
};

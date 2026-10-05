const { supabase } = require('../config/db');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { code, name, year, section, hours, facultyId, isLab } = req.body;
    if (!code || !name || !year || !section || !hours || !facultyId) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const id = `s${Date.now()}`;
    const subject = { id, code, name, year, section, hours: Number(hours), "facultyId": facultyId, "isLab": !!isLab };
    
    const { data, error } = await supabase.from('subjects').insert([subject]).select().single();
    if (error) throw error;
    
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.hours !== undefined) updateData.hours = Number(updateData.hours);
    if (updateData.isLab !== undefined) updateData.isLab = !!updateData.isLab;
    
    const { data, error } = await supabase.from('subjects').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('subjects').delete().eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.bulkImport = async (req, res, next) => {
  try {
    let rawSubjects = req.body;
    if (req.body && Array.isArray(req.body.subjects)) rawSubjects = req.body.subjects;
    if (!Array.isArray(rawSubjects)) return res.status(400).json({ success: false, error: 'Expected an array' });

    // Fetch existing data to resolve IDs
    const { data: dbFaculty } = await supabase.from('faculty').select('*');
    const { data: dbYears } = await supabase.from('years').select('*');
    
    let addedCount = 0;
    const newSubjects = [];
    const newFaculties = [];
    const newYears = [];
    const updatedYears = [];

    for (const row of rawSubjects) {
      const normalized = {};
      for (const [k, v] of Object.entries(row)) {
        if (k && v !== undefined && v !== null) {
          normalized[k.toString().trim().toLowerCase()] = v;
        }
      }

      const code = normalized['subject code'] || normalized['code'];
      const name = normalized['subject name'] || normalized['name'] || normalized['subject'];
      let hours = normalized['hours'] || normalized['hours / week'] || normalized['hours/week'] || 4;
      const yearName = normalized['year'];
      const sectionName = normalized['section'];
      const facultyName = normalized['faculty name'] || normalized['faculty'];
      const type = normalized['subject type'] || normalized['type'] || '';

      if (!code || !name || !yearName || !sectionName || !facultyName) continue;

      // Find or Create Faculty
      const searchName = facultyName.toString().trim().toLowerCase();
      let faculty = dbFaculty.find(f => f.name.toLowerCase() === searchName) || newFaculties.find(f => f.name.toLowerCase() === searchName);
      if (!faculty) {
        faculty = { id: uuidv4(), name: facultyName.toString().trim(), image: '' };
        newFaculties.push(faculty);
      }

      // Find or Create Year & Section
      const ySearch = yearName.toString().trim().toLowerCase();
      let yearObj = dbYears.find(y => y.name.toLowerCase() === ySearch || y.id === yearName.toString().trim()) || newYears.find(y => y.name.toLowerCase() === ySearch);
      
      let isYearNew = false;
      if (!yearObj) {
        yearObj = { id: uuidv4(), name: yearName.toString().trim(), sections: [] };
        newYears.push(yearObj);
        isYearNew = true;
      }
      
      const secStr = sectionName.toString().trim().toUpperCase();
      if (!yearObj.sections.includes(secStr)) {
        yearObj.sections.push(secStr);
        if (!isYearNew) {
           const existingUpdate = updatedYears.find(y => y.id === yearObj.id);
           if (existingUpdate) existingUpdate.sections = yearObj.sections;
           else updatedYears.push(yearObj);
        }
      }

      const isLab = type.toString().toLowerCase().includes('lab');

      newSubjects.push({
        id: `s${Date.now()}${Math.random().toString().slice(2, 6)}`,
        code: code.toString().trim().toUpperCase(),
        name: name.toString().trim(),
        year: yearObj.name,
        section: secStr,
        hours: Number(hours),
        "facultyId": faculty.id,
        "isLab": isLab
      });
      addedCount++;
    }

    // Perform DB Inserts
    if (newFaculties.length > 0) await supabase.from('faculty').insert(newFaculties);
    if (newYears.length > 0) await supabase.from('years').insert(newYears);
    for (const y of updatedYears) {
       await supabase.from('years').update({ sections: y.sections }).eq('id', y.id);
    }
    if (newSubjects.length > 0) await supabase.from('subjects').insert(newSubjects);

    res.json({ success: true, message: `Successfully added ${addedCount} subjects`, count: addedCount });
  } catch (err) { next(err); }
};

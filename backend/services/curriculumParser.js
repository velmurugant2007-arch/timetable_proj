/**
 * Curriculum Parser — reads the PSNACET Excel curriculum file
 * and returns structured course data with LTP breakdown.
 */
const XLSX = require('xlsx');

const ROMAN_TO_NUM = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };

function parseSemesterLabel(label) {
  const match = label.match(/Semester\s+([IVX]+)/i) || label.match(/^(I|II|III|IV|V|VI|VII|VIII)\s/i);
  if (match) {
    const roman = match[1].toUpperCase();
    return ROMAN_TO_NUM[roman];
  }
  return null;
}

/**
 * Semester number → Year index (0-based)
 */
function semesterToYearIndex(semNum) {
  return Math.floor((semNum - 1) / 2);
}

/**
 * Extract sheet names from the Excel file
 */
function getSheetNames(filePath) {
  const workbook = XLSX.readFile(filePath);
  return workbook.SheetNames;
}

/**
 * Parse the curriculum Excel file for a specific sheet.
 * @param {string} filePath - Absolute path to the .xlsx file
 * @param {string} targetSheetName - Name of the sheet to parse
 */
function parseCurriculum(filePath, targetSheetName) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = targetSheetName || workbook.SheetNames[0]; // Default to first sheet if not provided
  
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Sheet "${sheetName}" not found in the Excel file.`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });

  const courses = [];
  const slotGroups = [];
  
  let currentSemLabel = '';
  let currentSemNum = null;
  let currentType = ''; // 'THEORY' or 'PRACTICAL'
  let isMECSE = false; // Flag to track if we've hit the ME section

  let currentSlotGroup = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = String(row[0] || '').trim();
    const code = String(row[1] || '').trim();
    const title = String(row[2] || '').trim();
    const weekdayHrs = row[7];
    const satHrs = row[8];

    // Check for ME CSE section
    if (/^ME\s/i.test(col0) || col0.includes("Master in") || col0.includes("ME STRUCTURAL")) {
       isMECSE = true;
    }

    // Is it a semester marker?
    if (/^Semester\s/i.test(col0) || /^(I|II|III|IV|V|VI|VII|VIII)\s+Semester/i.test(col0)) {
      if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
      currentSlotGroup = null;

      currentSemLabel = col0;
      currentSemNum = parseSemesterLabel(col0);
      continue;
    }

    // Is it a type marker?
    if (/^(THEORY|PRACTICAL|PRACTICALS|Theory)$/i.test(col0)) {
      if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
      currentSlotGroup = null;

      currentType = col0.toUpperCase();
      continue;
    }

    // Skip headers and totals
    if (col0 === 'SEMESTER' || title === 'Total' || title === 'Total  ' || (!col0 && !code && !title)) {
       if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
       currentSlotGroup = null;
       continue;
    }

    // Skip if we don't know the semester yet
    if (!currentSemNum) continue;

    const hasWeekdayHrs = typeof weekdayHrs === 'number' && weekdayHrs > 0;
    const hasSatHrs = typeof satHrs === 'number' && satHrs > 0;
    const isLab = currentType.includes('PRACTICAL');

    // Calculate year index. If it's ME CSE, offset the year index so it doesn't clash with BE.
    // Assume BE is 4 years (indices 0-3). ME can be indices 4-5.
    const yearIndex = isMECSE ? semesterToYearIndex(currentSemNum) + 4 : semesterToYearIndex(currentSemNum);
    const yearName = isMECSE ? `ME ${currentSemNum <= 2 ? '1st' : '2nd'} Year` : null; // Custom name for ME

    if (hasWeekdayHrs) {
      // LEAD course or standalone course
      if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
      
      const courseObj = {
        semester: currentSemNum,
        yearIndex,
        yearName, // Pass custom name if it's ME
        code: code || `ELEC-${currentSemNum}-${i}`, // Fallback code
        title,
        weekdayHrs: weekdayHrs || 0,
        satHrs: hasSatHrs ? satHrs : 0,
        hours: (weekdayHrs || 0) + (hasSatHrs ? satHrs : 0),
        isLab,
        isSaturdayOnly: false,
        L: isLab ? 0 : weekdayHrs,
        T: 0,
        P: isLab ? weekdayHrs : 0,
      };

      currentSlotGroup = {
        semester: currentSemNum,
        yearIndex,
        yearName,
        isLab,
        weekdayHrs: weekdayHrs || 0,
        satHrs: hasSatHrs ? satHrs : 0,
        courses: [{ ...courseObj, isLead: true }]
      };
      
      // Also add to flat list
      courses.push(courseObj);

    } else if (!hasWeekdayHrs && !hasSatHrs && code && currentSlotGroup) {
      // PARALLEL ELECTIVE (no hours, has code, follows a lead)
      const courseObj = {
        semester: currentSemNum,
        yearIndex,
        yearName,
        code,
        title,
        weekdayHrs: currentSlotGroup.weekdayHrs,
        satHrs: currentSlotGroup.satHrs,
        hours: currentSlotGroup.weekdayHrs + currentSlotGroup.satHrs,
        isLab: currentSlotGroup.isLab,
        isSaturdayOnly: false,
        L: currentSlotGroup.isLab ? 0 : currentSlotGroup.weekdayHrs,
        T: 0,
        P: currentSlotGroup.isLab ? currentSlotGroup.weekdayHrs : 0,
      };
      
      currentSlotGroup.courses.push({ ...courseObj, isLead: false });
      courses.push(courseObj);

    } else if (!hasWeekdayHrs && hasSatHrs) {
      // SATURDAY-ONLY ACTIVITY (e.g., TUTOR WARD HOUR)
      if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
      currentSlotGroup = null;

      courses.push({
        semester: currentSemNum,
        yearIndex,
        yearName,
        code: code || `SAT-${currentSemNum}-${i}`,
        title,
        weekdayHrs: 0,
        satHrs: satHrs,
        hours: satHrs,
        isLab: false,
        isSaturdayOnly: true,
        L: 0, T: 0, P: 0
      });
    } else {
       // Reset group on unrecognized row
       if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);
       currentSlotGroup = null;
    }
  }
  
  if (currentSlotGroup && currentSlotGroup.courses.length > 1) slotGroups.push(currentSlotGroup);

  // --- Processing Slot Groups ---
  // A slot group should be represented as a single "combined" course in the main scheduling array
  // so the scheduling engine places them together.
  
  const finalCourses = [];
  const processedCodes = new Set();

  // First, add the combined groups
  slotGroups.forEach(group => {
    const combinedCode = group.courses.map(c => c.code).join('/');
    const combinedTitle = group.courses.map(c => c.title).join(' / ');
    
    // Add all individual codes to processed set so we don't add them again
    group.courses.forEach(c => processedCodes.add(c.code));

    finalCourses.push({
      semester: group.semester,
      yearIndex: group.yearIndex,
      yearName: group.yearName,
      code: combinedCode,
      title: combinedTitle,
      weekdayHrs: group.weekdayHrs,
      satHrs: group.satHrs,
      hours: group.weekdayHrs + group.satHrs,
      isLab: group.isLab,
      isSaturdayOnly: false,
      L: group.isLab ? 0 : group.weekdayHrs,
      T: 0,
      P: group.isLab ? group.weekdayHrs : 0,
      isGroup: true,
      groupCourses: group.courses
    });
  });

  // Now add all other courses that weren't part of a group
  courses.forEach(c => {
    if (!processedCodes.has(c.code)) {
      finalCourses.push(c);
    }
  });

  // Group by year index
  const yearGroups = {};
  finalCourses.forEach(c => {
    if (!yearGroups[c.yearIndex]) yearGroups[c.yearIndex] = [];
    yearGroups[c.yearIndex].push(c);
  });

  return { courses: finalCourses, yearGroups, slotGroups };
}

module.exports = { parseCurriculum, semesterToYearIndex, getSheetNames };

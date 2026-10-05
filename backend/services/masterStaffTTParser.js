const xlsx = require('xlsx');

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DEFAULT_PERIODS_PER_DAY = 7;

/**
 * Parses individual cell content from the master staff timetable.
 * Examples:
 * - "CS2411"
 * - "CP1491  II ME CSE"
 * - "CS2891  NU\ASS\KU  IV CSE A"
 * - "CS2611  MST/RS  III CSE A"
 * - "MEDICAL LEAVE"
 */
function parseCell(text, knownSubjects = []) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  if (cleaned.toUpperCase().includes('MEDICAL LEAVE') || cleaned.toUpperCase().includes('ON LEAVE')) {
    return {
      raw: text,
      isMedicalLeave: true,
      subjectCode: 'MEDICAL LEAVE',
      className: '',
      facultyList: [],
    };
  }

  // Regex to extract class info: e.g. "IV CSE A", "II ME CSE", "III CSE D", "I CSE C", "III ECE D"
  const classMatch = cleaned.match(/\b((?:I|II|III|IV)\s+(?:ME\s+)?(?:CSE|ECE|IT|AIDS|AIML|MECH|CIVIL|EEE)\s*[A-Z]?)\b/i);
  const className = classMatch ? classMatch[1].trim() : '';

  let withoutClass = cleaned;
  if (className) {
    withoutClass = withoutClass.replace(classMatch[0], '').trim();
  }

  // Separate subject code (e.g. CS2512) from the rest (e.g. KG/CS or MST/RS)
  let subjectCode = '';
  let remainder = '';

  // 1. Try to find a matching known subject from the database
  const sortedSubjects = [...knownSubjects]
    .filter(sub => sub && sub.code)
    .sort((a, b) => b.code.length - a.code.length);
    
  const matchedSubject = sortedSubjects.find(sub => 
    withoutClass.toUpperCase().startsWith(sub.code.toUpperCase())
  );

  if (matchedSubject) {
    subjectCode = matchedSubject.code.toUpperCase();
    remainder = withoutClass.substring(subjectCode.length).trim();
  } else {
    // 2. Fallback to smarter string splitting if not in DB
    // Look for slashes first (e.g. CS2582ASS/GM/APP)
    if (withoutClass.includes('/') || withoutClass.includes('\\')) {
      const parts = withoutClass.split(/[\/\\]+/);
      const firstPart = parts[0].trim(); // "CS2582ASS"
      
      // Find where digits end and letters begin
      // Match something that ends with 2-4 letters (the faculty initial) preceded by a digit
      const transitionMatch = firstPart.match(/^(.*?\d)([A-Za-z]{2,4})$/);
      if (transitionMatch) {
        subjectCode = transitionMatch[1].toUpperCase();
        const firstFaculty = transitionMatch[2].toUpperCase();
        const restFaculty = parts.slice(1).join('/');
        remainder = restFaculty ? `${firstFaculty}/${restFaculty}` : firstFaculty;
      } else {
        // Fallback if no digit-to-letter transition is found
        subjectCode = firstPart.toUpperCase();
        remainder = parts.slice(1).join('/');
      }
    } else {
      // No slashes. It might be a single mashed faculty like CS2582ASS or just a code like CS2C14
      const spaceSplit = withoutClass.split(/\s+/);
      if (spaceSplit.length === 1) {
        // Check if it ends with 2-4 letters preceded by a digit
        const transitionMatch = withoutClass.match(/^(.*?\d)([A-Za-z]{2,4})$/);
        if (transitionMatch && transitionMatch[1].length >= 4) {
          subjectCode = transitionMatch[1].toUpperCase();
          remainder = transitionMatch[2].toUpperCase();
        } else {
          subjectCode = withoutClass.toUpperCase();
        }
      } else {
        subjectCode = spaceSplit[0].toUpperCase();
        remainder = spaceSplit.slice(1).join(' ').trim();
      }
    }
  }

  // Faculty acronyms: separated by / or \ or space
  let facultyList = [];
  if (remainder) {
    remainder = remainder.replace(/^[\/\\]+/, '').trim();
    facultyList = remainder.split(/[\/\\]+/).map(s => s.trim()).filter(Boolean);
  }

  return {
    raw: cleaned,
    subjectCode,
    className,
    facultyList,
    isMedicalLeave: false,
  };
}

/**
 * Parses the Master Staff Timetable Excel file.
 * Expected format: 44 faculty rows, 6 days x 8 periods (cols 2-49).
 */
function parseMasterStaffExcel(filePathOrBuffer, knownSubjects = []) {
  const wb = typeof filePathOrBuffer === 'string'
    ? xlsx.readFile(filePathOrBuffer)
    : xlsx.read(filePathOrBuffer, { type: 'buffer' });

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error('No valid sheet found in master timetable workbook');
  }

  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const merges = ws['!merges'] || [];

  // Deep clone data grid
  const grid = rawData.map(row => [...row]);

  // Unroll merges: copy top-left value into each cell in the merge range
  merges.forEach(m => {
    const topVal = grid[m.s.r] && grid[m.s.r][m.s.c];
    if (topVal !== undefined && topVal !== '') {
      for (let r = m.s.r; r <= m.e.r; r++) {
        if (!grid[r]) grid[r] = [];
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (grid[r][c] === '' || grid[r][c] === undefined) {
            grid[r][c] = topVal;
          }
        }
      }
    }
  });

  // Extract metadata headers
  let college = '';
  let department = '';
  let semester = '';
  const signatures = [];

  // Row 0 or top row: College name
  if (grid[0] && grid[0][0]) {
    college = String(grid[0][0]).trim();
  }
  // Row 1: Department & Semester info
  if (grid[1] && grid[1][0]) {
    const row1Text = String(grid[1][0]).trim();
    department = row1Text;
    const semMatch = row1Text.match(/\b(20\d\d[-–]\d\d(?:\s+(?:ODD|EVEN))?\s+SEMESTER)\b/i);
    if (semMatch) {
      semester = semMatch[1];
    }
  }

  // Find day header row (usually contains 'MONDAY' or 'Sl.No')
  let dayHeaderRow = -1;
  let periodHeaderRow = -1;

  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r] || [];
    const joined = row.map(c => String(c).toUpperCase()).join(' ');
    if (joined.includes('MONDAY') || (joined.includes('SL.NO') && joined.includes('FACULTY'))) {
      dayHeaderRow = r;
      // The next row is typically the period number row (1 2 3 ... 8)
      if (grid[r + 1]) {
        periodHeaderRow = r + 1;
      }
      break;
    }
  }

  const dataStartRow = periodHeaderRow >= 0 ? periodHeaderRow + 1 : (dayHeaderRow >= 0 ? dayHeaderRow + 1 : 4);

  // Parse faculty rows
  const faculty = [];

  for (let r = dataStartRow; r < grid.length; r++) {
    const row = grid[r] || [];
    const slNoRaw = row[0];
    const acronymRaw = String(row[1] || '').trim();

    // Check if this is a signature or footer row
    const rowJoined = row.map(c => String(c).toLowerCase()).join(' ');
    if (rowJoined.includes('hod') || rowJoined.includes('principal') || rowJoined.includes('convener') || rowJoined.includes('dept tt')) {
      // Collect signatures
      row.forEach(c => {
        const val = String(c).trim();
        if (val && (val.toLowerCase().includes('tt') || val.toLowerCase().includes('hod') || val.toLowerCase().includes('principal') || val.toLowerCase().includes('convener'))) {
          signatures.push(val);
        }
      });
      continue;
    }

    // A valid faculty row must have an acronym in col 1 (or col 0 if no slNo)
    if (!acronymRaw && !slNoRaw) continue;

    const acronym = acronymRaw ? acronymRaw.toUpperCase() : String(slNoRaw).trim().toUpperCase();
    if (acronym.length > 10 || acronym.includes('PAGE') || acronym.includes('TOTAL')) {
      continue;
    }

    const schedule = {};
    DAYS.forEach(day => { schedule[day] = {}; });

    let totalHours = 0;
    let isMedicalLeave = false;
    let periodCount = 0;

    // Read columns 2 to 43 (6 days x 7 periods = 42 period cells)
    for (let c = 2; c < 44; c++) {
      const dayIdx = Math.floor((c - 2) / DEFAULT_PERIODS_PER_DAY);
      const period = ((c - 2) % DEFAULT_PERIODS_PER_DAY) + 1;
      const day = DAYS[dayIdx];

      if (!day) continue;

      const cellVal = row[c];
      const parsed = parseCell(cellVal, knownSubjects);

      if (parsed) {
        if (parsed.isMedicalLeave) {
          isMedicalLeave = true;
        } else {
          totalHours++;
        }
        schedule[day][period] = parsed;
        periodCount++;
      } else {
        schedule[day][period] = null;
      }
    }

    if (periodCount > 0 || isMedicalLeave || acronym) {
      faculty.push({
        slNo: slNoRaw || faculty.length + 1,
        acronym,
        fullName: '',
        designation: '',
        remarks: isMedicalLeave ? 'MEDICAL LEAVE' : '',
        totalHours,
        isMedicalLeave,
        schedule,
      });
    }
  }

  return {
    meta: {
      college: college || 'PSNA College of Engineering & Technology',
      department: department || 'Department of Computer Science and Engineering',
      semester: semester || 'Even Semester',
      days: DAYS,
      periodsPerDay: DEFAULT_PERIODS_PER_DAY,
      signatures: signatures.length > 0 ? signatures : ['Dept TT i/c', 'HOD', 'TT Convener', 'Principal'],
      importedAt: new Date().toISOString(),
      totalFaculty: faculty.length,
    },
    faculty,
  };
}

/**
 * Parses the Acronym Mapping Excel file (e.g. Name list updated.xlsx).
 * Expected columns: S.No (col 0), Faculty Name (col 1), Acronym (col 2), Designation (col 3), Remarks (col 4).
 */
function parseAcronymMappingExcel(filePathOrBuffer) {
  const wb = typeof filePathOrBuffer === 'string'
    ? xlsx.readFile(filePathOrBuffer)
    : xlsx.read(filePathOrBuffer, { type: 'buffer' });

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error('No valid sheet found in acronym mapping workbook');
  }

  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row
  let headerRowIndex = -1;
  let sNoCol = 0;
  let nameCol = 1;
  let acronymCol = 2;
  let desigCol = 3;
  let remarksCol = 4;

  for (let r = 0; r < Math.min(10, rawData.length); r++) {
    const row = rawData[r] || [];
    const lowerCells = row.map(c => String(c).toLowerCase().trim());

    if (lowerCells.some(c => c.includes('s.no') || c.includes('sl.no') || c.includes('serial'))) {
      headerRowIndex = r;
      // Inspect columns
      lowerCells.forEach((c, ci) => {
        if (c.includes('s.no') || c.includes('sl.no')) sNoCol = ci;
        else if (c.includes('name') || c.includes('faculty')) nameCol = ci;
        else if (c.includes('acronym') || c.includes('short') || c.includes('code')) acronymCol = ci;
        else if (c.includes('designation') || c.includes('desig') || c.includes('role')) desigCol = ci;
        else if (c.includes('remark') || c.includes('status') || c.includes('leave')) remarksCol = ci;
      });
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const mappings = [];

  for (let r = startRow; r < rawData.length; r++) {
    const row = rawData[r] || [];
    if (row.length === 0) continue;

    let sNo = row[sNoCol];
    let fullName = String(row[nameCol] || '').trim();
    let acronym = String(row[acronymCol] || '').trim().toUpperCase();
    let designation = String(row[desigCol] || '').trim();
    let remarks = String(row[remarksCol] || '').trim();

    // Heuristic fallback if acronym column was empty or shifted
    if (!acronym && row.length > 2) {
      // Find short uppercase string in row
      for (let ci = 0; ci < row.length; ci++) {
        const val = String(row[ci] || '').trim();
        if (/^[A-Z]{2,6}$/.test(val) && val !== 'CSE' && val !== 'HOD') {
          acronym = val;
          break;
        }
      }
    }

    // Skip title or banner rows
    if (!acronym && !fullName) continue;
    if (fullName.toLowerCase().includes('college') || fullName.toLowerCase().includes('department') || fullName.toLowerCase().includes('faculty name')) {
      continue;
    }

    const isMedicalLeave = remarks.toUpperCase().includes('LEAVE') || remarks.toUpperCase().includes('MEDICAL');

    mappings.push({
      sNo: sNo || mappings.length + 1,
      fullName: fullName || acronym,
      acronym,
      designation: designation || 'Faculty',
      remarks,
      isMedicalLeave,
    });
  }

  return mappings;
}

/**
 * Merges master timetable data with acronym mappings.
 */
function mergeFacultyMasterTT(masterTTData, acronymMappings = []) {
  if (!masterTTData || !masterTTData.faculty) {
    throw new Error('Invalid master timetable data');
  }

  // Create lookup maps by acronym and normalized name
  const acronymMap = new Map();
  const nameMap = new Map();
  
  (acronymMappings || []).forEach(m => {
    if (m.acronym) {
      acronymMap.set(m.acronym.trim().toUpperCase(), m);
    }
    if (m.fullName) {
      const normName = m.fullName.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (normName) {
        nameMap.set(normName, m);
      }
    }
  });

  let mappedCount = 0;
  let unmappedCount = 0;
  let leaveCount = 0;
  let totalHoursSum = 0;

  const enrichedFaculty = masterTTData.faculty.map((f, idx) => {
    let mapping = null;
    
    // 1. Try matching by exact acronym
    if (f.acronym) {
      mapping = acronymMap.get(f.acronym.trim().toUpperCase());
    }
    
    // 2. Try matching by normalized full name (useful for docx imports)
    if (!mapping && f.fullName) {
      const normName = f.fullName.replace(/[^a-zA-Z]/g, '').toLowerCase();
      mapping = nameMap.get(normName);
    }

    const isMapped = !!mapping;

    if (isMapped) mappedCount++;
    else unmappedCount++;

    const isLeave = f.isMedicalLeave || (mapping && mapping.isMedicalLeave);
    if (isLeave) leaveCount++;

    totalHoursSum += f.totalHours || 0;

    return {
      ...f,
      slNo: f.slNo || idx + 1,
      acronym: mapping ? mapping.acronym : f.acronym,
      fullName: mapping ? mapping.fullName : (f.fullName || f.acronym),
      designation: mapping ? mapping.designation : (f.designation || ''),
      remarks: (mapping && mapping.remarks) || (isLeave ? 'MEDICAL LEAVE' : ''),
      isMapped,
      isMedicalLeave: isLeave,
    };
  });

  return {
    meta: {
      ...masterTTData.meta,
      generatedAt: new Date().toISOString(),
      totalFaculty: enrichedFaculty.length,
      mappedCount,
      unmappedCount,
      leaveCount,
      totalHoursSum,
    },
    faculty: enrichedFaculty,
    mappingsSummary: {
      totalMappings: acronymMappings.length,
      mappedCount,
      unmappedCount,
    },
  };
}

module.exports = {
  DAYS,
  DEFAULT_PERIODS_PER_DAY,
  parseCell,
  parseMasterStaffExcel,
  parseAcronymMappingExcel,
  mergeFacultyMasterTT,
};

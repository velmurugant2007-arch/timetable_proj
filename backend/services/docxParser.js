const mammoth = require('mammoth');
const cheerio = require('cheerio');

const DAYS_MAP = {
  'MON': 'MONDAY',
  'TUE': 'TUESDAY',
  'WED': 'WEDNESDAY',
  'THU': 'THURSDAY',
  'FRI': 'FRIDAY',
  'SAT': 'SATURDAY',
};

function buildGrid($, tableEl) {
  const grid = [];
  $(tableEl).find('tr').each((rIdx, tr) => {
    grid[rIdx] = grid[rIdx] || [];
    let cIdx = 0;
    $(tr).find('td, th').each((_, td) => {
      while (grid[rIdx][cIdx] !== undefined) cIdx++;
      // Extract text with proper spacing between block elements (<p>, <br>)
      // Cheerio's .text() concatenates <p> children without spaces, which
      // destroys CLASS row entries like "CS2513-SubjA-III CSE" + "CS2381-SubjB-II CSE"
      let html = $(td).html() || '';
      html = html.replace(/<\/p>/gi, ' ');
      html = html.replace(/<br\s*\/?>/gi, ' ');
      const text = html.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
      const colspan = parseInt($(td).attr('colspan') || '1', 10);
      const rowspan = parseInt($(td).attr('rowspan') || '1', 10);
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          grid[rIdx + r] = grid[rIdx + r] || [];
          grid[rIdx + r][cIdx + c] = text;
        }
      }
    });
  });
  return grid;
}

async function parseIndividualTTDocx(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const $ = cheerio.load(result.value);

  const facultyList = [];
  let slNoCounter = 1;

  $('table').each((_, tableEl) => {
    // 1. Extract Metadata from preceding <p> tags
    let prev = $(tableEl).prev();
    let metaText = '';
    while (prev.length > 0 && prev[0].name === 'p') {
      metaText = prev.text() + ' ' + metaText;
      prev = prev.prev();
    }

    const nameMatch = metaText.match(/Name of Faculty:\s*(.*?)(?=\s*Dept:|$)/i);
    const deptMatch = metaText.match(/Dept:\s*(.*?)(?=\s*Designation:|$)/i);
    const desigMatch = metaText.match(/Designation:\s*(.*?)(?=\s*Subject:|$)/i);

    let fullName = nameMatch ? nameMatch[1].trim() : '';
    let designation = desigMatch ? desigMatch[1].trim() : '';

    if (!fullName) return; // Skip if it's not a valid faculty table

    // 2. Build Grid
    const grid = buildGrid($, tableEl);
    if (grid.length < 2) return;

    // 3. Find Period Columns
    const periodCols = [];
    const headerRow = grid[0];
    for (let c = 1; c < headerRow.length; c++) {
      if (headerRow[c] === headerRow[c - 1]) continue; // Skip colspans
      
      // Check if this column is a break
      let isBreak = false;
      for (let r = 1; r < grid.length; r++) {
        const cell = (grid[r][c] || '').toUpperCase();
        if (cell.includes('BREAK') && !cell.includes('CLASS')) {
          isBreak = true;
          break;
        }
      }
      
      if (!isBreak && headerRow[c] && !headerRow[c].toUpperCase().includes('TIME')) {
        periodCols.push(c);
      }
    }

    // 4. Parse Class Mapping — collect from ALL columns of the CLASS row
    const subjectClassMap = {};
    for (let r = 1; r < grid.length; r++) {
      const firstCell = (grid[r][0] || '').trim();
      if (firstCell.toUpperCase().startsWith('CLASS')) {
        console.log('[DOCX Parser] CLASS row grid[' + r + ']:', JSON.stringify(grid[r]));
        // Collect unique non-empty texts from ALL columns in this row
        const seen = new Set();
        let allTexts = [];
        
        for (let c = 0; c < (grid[r].length || 0); c++) {
          const cellText = (grid[r][c] || '').trim();
          if (cellText && !seen.has(cellText) && !cellText.toUpperCase().startsWith('CLASS')) {
            seen.add(cellText);
            allTexts.push(cellText);
          }
        }
        
        // Also check if Mammoth merged everything into column 0
        if (allTexts.length === 0 && firstCell.length > 5) {
          let merged = firstCell.substring(5).trim().replace(/^[:-]/, '').trim();
          if (merged) allTexts.push(merged);
        }
        
        const classText = allTexts.join(' ');
        console.log('[DOCX Parser] CLASS row text:', classText);
        
        // Collect ALL unique subject codes from the schedule grid cells
        // These are our "known codes" — they MUST be in the CLASS row text
        const gridCodes = new Set();
        for (let gr = 1; gr < grid.length; gr++) {
          const dayKey = (grid[gr][0] || '').toUpperCase().substring(0, 3);
          if (['MON','TUE','WED','THU','FRI','SAT'].includes(dayKey)) {
            for (let gc = 1; gc < (grid[gr].length || 0); gc++) {
              const cellVal = (grid[gr][gc] || '').trim();
              if (cellVal && !cellVal.toUpperCase().includes('BREAK')) {
                // Extract the first token (the code) and clean mashed faculty initials
                let code = cellVal.split(/\s+/)[0];
                if (code.includes('/') || code.includes('\\')) {
                  const parts = code.split(/[\/\\]+/);
                  const fp = parts[0];
                  const tm = fp.match(/^(.*?\d)([A-Za-z]{2,4})$/);
                  code = tm ? tm[1] : fp;
                } else {
                  const tm = code.match(/^(.*?\d)([A-Za-z]{2,4})$/);
                  if (tm && tm[1].length >= 4) code = tm[1];
                }
                gridCodes.add(code.toUpperCase());
              }
            }
          }
        }
        
        console.log('[DOCX Parser] Grid codes:', [...gridCodes]);
        
        // Find each grid code in the CLASS row text and extract associated info
        for (const code of gridCodes) {
          // Find this code in the text (case-insensitive)
          const codeIdx = classText.toUpperCase().indexOf(code);
          if (codeIdx === -1) {
            subjectClassMap[code] = '';
            continue;
          }
          
          // Check if followed by a dash
          const afterCode = classText.substring(codeIdx + code.length).trimStart();
          if (/^[-–—]/.test(afterCode)) {
            // Has a dash — extract text after dash until the next known grid code
            const dashPos = classText.indexOf(afterCode.charAt(0), codeIdx + code.length);
            const valueStart = dashPos + 1;
            
            // Find where the next known grid code starts
            let valueEnd = classText.length;
            for (const otherCode of gridCodes) {
              if (otherCode === code) continue;
              const otherIdx = classText.toUpperCase().indexOf(otherCode, valueStart);
              if (otherIdx !== -1 && otherIdx < valueEnd) {
                valueEnd = otherIdx;
              }
            }
            
            subjectClassMap[code] = classText.substring(valueStart, valueEnd).trim();
          } else {
            // No dash — bare code, no info
            subjectClassMap[code] = '';
          }
        }
        
        console.log('[DOCX Parser] subjectClassMap:', JSON.stringify(subjectClassMap));
      }
    }

    // 5. Extract Schedule
    const schedule = {
      MONDAY: {}, TUESDAY: {}, WEDNESDAY: {}, THURSDAY: {}, FRIDAY: {}, SATURDAY: {}
    };
    let totalHours = 0;

    for (let r = 1; r < grid.length; r++) {
      const dayKey = (grid[r][0] || '').toUpperCase().substring(0, 3);
      const fullDay = DAYS_MAP[dayKey];
      
      if (fullDay) {
        for (let i = 0; i < periodCols.length; i++) {
          const p = i + 1; // 1 to 7
          const c = periodCols[i];
          const cellText = (grid[r][c] || '').trim();
          
          if (cellText && !cellText.toUpperCase().includes('BREAK')) {
            // Find class name from map, or try to infer
            let subjCode = cellText.split(/\s+/)[0];
            let facultyList = [];
            
            // Clean mashed codes like CS2381ND/MV/BS
            if (subjCode.includes('/') || subjCode.includes('\\')) {
              const parts = subjCode.split(/[\/\\]+/);
              const firstPart = parts[0];
              const transitionMatch = firstPart.match(/^(.*?\d)([A-Za-z]{2,4})$/);
              if (transitionMatch) {
                subjCode = transitionMatch[1].toUpperCase();
                facultyList.push(transitionMatch[2].toUpperCase());
              } else {
                subjCode = firstPart.toUpperCase();
              }
              facultyList.push(...parts.slice(1).map(p => p.toUpperCase()));
            } else {
               const transitionMatch = subjCode.match(/^(.*?\d)([A-Za-z]{2,4})$/);
               if (transitionMatch && transitionMatch[1].length >= 4) {
                 subjCode = transitionMatch[1].toUpperCase();
                 facultyList.push(transitionMatch[2].toUpperCase());
               }
            }

            // Look up in subjectClassMap — exact match first, then prefix match
            let mappedText = subjectClassMap[subjCode] || '';
            if (!mappedText) {
              // Try prefix match: find a key that starts with subjCode or vice versa
              const mapKeys = Object.keys(subjectClassMap);
              const prefixKey = mapKeys.find(k => k.startsWith(subjCode) || subjCode.startsWith(k));
              if (prefixKey) mappedText = subjectClassMap[prefixKey];
            }
            let subjName = '';
            let finalClassName = '';
            
            if (mappedText) {
              // Look for class pattern at the end: "III CSE A", "IV CSE", "II ME CSE", etc.
              const classEndMatch = mappedText.match(/[-–—]\s*((?:I{1,3}V?|IV)\s+(?:ME\s+)?(?:CSE|ECE|IT|AIDS|AIML|MECH|CIVIL|EEE)\s*[A-Z]?(?:\s*,\s*(?:I{1,3}V?|IV)\s+(?:ME\s+)?(?:CSE|ECE|IT|AIDS|AIML|MECH|CIVIL|EEE)\s*[A-Z]?)*)\s*$/i);
              if (classEndMatch) {
                finalClassName = classEndMatch[1].trim();
                // Everything before the last dash preceding the class is the subject name
                const classIdx = mappedText.lastIndexOf(classEndMatch[0]);
                subjName = mappedText.substring(0, classIdx).trim();
                // Remove trailing dashes from subject name
                subjName = subjName.replace(/[-–—\s]+$/, '').trim();
              } else {
                // Fallback: split at first dash
                const dashMatch = mappedText.match(/^(.*?)[ \t]*[-–—]+[ \t]*(.*)$/);
                if (dashMatch) {
                  subjName = dashMatch[1].trim();
                  finalClassName = dashMatch[2].trim();
                } else {
                  subjName = mappedText;
                }
              }
            }

            schedule[fullDay][p] = {
              raw: cellText,
              subjectCode: subjCode,
              subjectName: subjName,
              className: finalClassName,
              facultyList: facultyList,
              isMedicalLeave: false
            };
            totalHours++;
          }
        }
      }
    }

    // Attempt to parse medical leave
    let isMedicalLeave = metaText.toUpperCase().includes('MEDICAL LEAVE');

    // Create unique temporary acronym if none exists
    const tempAcronym = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase() + '_' + slNoCounter;

    facultyList.push({
      slNo: slNoCounter++,
      acronym: tempAcronym, // We will map this back to real acronym using fullName
      fullName,
      designation,
      isMedicalLeave,
      schedule,
      totalHours
    });
  });

  return {
    meta: {
      college: 'PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL',
      department: 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING',
      semester: '2025-26 EVEN SEMESTER',
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      periodsPerDay: 7,
      signatures: ['Dept TT i/c', 'HOD', 'TT Convener', 'Principal']
    },
    faculty: facultyList
  };
}

function extractYearFromFilename(filename) {
  const upperName = filename.toUpperCase();
  if (upperName.includes('1ST YEAR') || upperName.includes('1 YEAR')) return '1st Year';
  if (upperName.includes('2ND YEAR') || upperName.includes('2 YEAR')) return '2nd Year';
  if (upperName.includes('3RD YEAR') || upperName.includes('3 YEAR')) return '3rd Year';
  if (upperName.includes('4TH YEAR') || upperName.includes('4 YEAR')) return '4th Year';
  if (upperName.includes('-ME-')) return 'ME 1st Year';
  return 'Unknown Year';
}

function parseTimetableGrid($, table) {
  const grid = {
    'MON': Array(7).fill(null),
    'TUE': Array(7).fill(null),
    'WED': Array(7).fill(null),
    'THU': Array(7).fill(null),
    'FRI': Array(7).fill(null),
    'SAT': Array(7).fill(null),
  };

  const dayMap = {
    'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT'
  };

  const rows = $(table).find('tr').toArray();
  const numRows = rows.length;
  
  // Calculate max columns
  let numCols = 0;
  for (let r = 0; r < numRows; r++) {
    let colsInRow = 0;
    $(rows[r]).find('td, th').each((i, c) => {
      colsInRow += parseInt($(c).attr('colspan') || '1', 10);
    });
    if (colsInRow > numCols) numCols = colsInRow;
  }

  // Create empty 2D matrix
  const matrix = Array.from({ length: numRows }, () => Array(numCols).fill(null));

  for (let r = 0; r < numRows; r++) {
    const cols = $(rows[r]).find('td, th').toArray();
    let cIndex = 0;
    
    for (let c = 0; c < cols.length; c++) {
      // Find next empty cell in row
      while (cIndex < numCols && matrix[r][cIndex] !== null) {
        cIndex++;
      }
      if (cIndex >= numCols) break;
      
      const col = $(cols[c]);
      const html = col.html() || '';
      const rawText = col.text().replace(/\s+/g, ' ').trim();
      const colspan = parseInt(col.attr('colspan') || '1', 10);
      const rowspan = parseInt(col.attr('rowspan') || '1', 10);
      
      let pCodes = [];
      const pTags = html.split(/<p/g).length - 1;
      if (pTags > 1) {
        const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
        let m;
        while ((m = pRegex.exec(html)) !== null) {
          const pText = m[1].replace(/<[^>]*>/g, '').trim();
          if (pText && !pText.includes('AM') && !pText.includes('PM') && !pText.toUpperCase().includes('BREAK')) {
            pCodes.push(pText.split(/\s+/)[0]); 
          }
        }
      }
      if (pCodes.length === 0 && rawText && !rawText.toUpperCase().includes('BREAK') && !rawText.includes('AM') && !rawText.includes('PM')) {
        pCodes = [rawText.split(' ')[0]];
      }
      
      const cellData = { rawText, pCodes, colspan, rowspan };
      
      // Fill matrix based on spans
      for (let rs = 0; rs < rowspan; rs++) {
        for (let cs = 0; cs < colspan; cs++) {
          if (r + rs < numRows && cIndex + cs < numCols) {
            matrix[r + rs][cIndex + cs] = cellData;
          }
        }
      }
      cIndex += colspan;
    }
  }

  // Extract from matrix day by day
  for (let r = 1; r < numRows; r++) {
    const dayCell = matrix[r][0];
    if (!dayCell) continue;
    
    const dayText = dayCell.rawText.toUpperCase();
    let dayKey = null;
    for (const key of Object.keys(dayMap)) {
      if (dayText.startsWith(key)) {
        dayKey = key;
        break;
      }
    }
    
    if (!dayKey) continue;
    
    const dayRowsCount = dayCell.rowspan;
    let currentPeriod = 0;
    
    // Scan physical columns
    for (let c = 1; c < numCols; c++) {
      const cell = matrix[r][c];
      if (!cell) continue;
      
      if (cell.rawText.toUpperCase().includes('BREAK')) {
        c += (cell.colspan - 1);
        continue;
      }
      
      if (currentPeriod >= 7) break;
      
      // Collect all codes in this physical column block across the day's rows
      const codesInCol = new Set();
      for (let dr = 0; dr < dayRowsCount; dr++) {
        if (r + dr < numRows) {
          const dCell = matrix[r + dr][c];
          if (dCell && dCell.pCodes) {
            dCell.pCodes.forEach(code => {
              if (code) codesInCol.add(code);
            });
          }
        }
      }
      
      const uniqueCodes = [...codesInCol];
      if (uniqueCodes.length > 0) {
        const isElective = uniqueCodes.length > 1;
        grid[dayKey][currentPeriod] = {
          code: uniqueCodes.join('/'),
          type: isElective ? 'ELECTIVE' : 'THEORY',
          isLab: false
        };
      }
      
      currentPeriod++;
    }
    
    r += (dayRowsCount - 1); // Skip the rest of the rows for this day
  }

  return grid;
}

function parseFacultyTable($, table) {
  const subjects = [];
  const rows = $(table).find('tr').toArray();
  
  if (rows.length === 0) return subjects;

  // Find column indices from headers (usually row 0)
  const headerCols = $(rows[0]).find('th, td').toArray();
  let codeIdx = 1, acronymIdx = 2, nameIdx = 3, facultyIdx = -1, deptIdx = -1, hoursWIdx = -1, hoursSIdx = -1;

  headerCols.forEach((col, idx) => {
    const text = $(col).text().toUpperCase().replace(/[^A-Z]/g, '');
    if (text.includes('FACULTY')) facultyIdx = idx;
    else if (text.includes('DEPT')) deptIdx = idx;
    // We don't dynamically map Hours because of colspan, so we fall back to relative offsets below if needed
  });

  // If there's a sub-header row (e.g. W | S), the data actually starts at row 2, and the columns might be shifted
  let dataStartRow = 1;
  const secondRowCols = rows.length > 1 ? $(rows[1]).find('th, td').toArray() : [];
  if (secondRowCols.length === 2 && $(secondRowCols[0]).text().trim().toUpperCase() === 'W') {
    dataStartRow = 2; // skip W | S row
  }

  for (let r = dataStartRow; r < rows.length; r++) {
    const cols = $(rows[r]).find('td').toArray();
    if (cols.length < 5) continue;
    
    const slNo = $(cols[0]).text().trim();
    if (!/^\d+$/.test(slNo)) continue;

    const code = $(cols[codeIdx]).text().trim();
    const acronym = $(cols[acronymIdx]).text().trim();
    const name = $(cols[nameIdx]).text().trim();
    
    // Check if W | S split is used
    let hoursW = '0', hoursS = '0', faculty = '', dept = '';
    
    if (dataStartRow === 2) {
      // W | S split implies W=4, S=5, Faculty=6, Dept=7
      hoursW = $(cols[4]) ? $(cols[4]).text().trim() : '0';
      hoursS = $(cols[5]) ? $(cols[5]).text().trim() : '0';
      faculty = $(cols[6]) ? $(cols[6]).text().trim() : '';
      dept = $(cols[7]) ? $(cols[7]).text().trim() : '';
    } else {
      // Standard format
      faculty = facultyIdx !== -1 && $(cols[facultyIdx]) ? $(cols[facultyIdx]).text().trim() : '';
      dept = deptIdx !== -1 && $(cols[deptIdx]) ? $(cols[deptIdx]).text().trim() : '';
      
      // Fallbacks
      if (!faculty && $(cols[5])) faculty = $(cols[5]).text().trim();
      
      if (!dept && faculty.length <= 3 && $(cols[5])) { // e.g. faculty name is short like 'MAT', it might be dept
        faculty = $(cols[5]).text().trim();
      }
    }

    if (code || acronym) {
      subjects.push({
        code: code || acronym, 
        name: name,
        facultyName: faculty,
        hoursW,
        hoursS,
        dept
      });
    }
  }

  return subjects;
}

async function parseDocxFile(filePath, filename) {
  let yearFromName = extractYearFromFilename(filename);
  
  const result = await mammoth.convertToHtml({path: filePath});
  const html = result.value;
  const $ = cheerio.load(html);

  const sectionsData = [];
  let currentSection = null;
  let currentYear = yearFromName;
  let currentCourse = 'B.E'; // Track course separately since it may be on a different paragraph

  // Collect all top-level elements — paragraphs & tables in order
  const allElements = [];
  $('body').children().each((i, el) => {
    allElements.push(el);
  });

  // Helper to detect section from a Year&Sec text
  function extractSection(text) {
    // Pattern with dash: "III - A", "IV-A"
    const match = text.match(/Year\s*&?\s*Sec\.?\s*:?\s*([IV]+)\s*[-–—]\s*(?:(?:CSE|ECE|IT|MECH|CIVIL|AIDS|AIML|EEE|ME)\s+)?([A-F])\b/i);
    if (match) return match[2].toUpperCase();
    // Pattern without dash but with section letter at end: "III CSE B", "III B"
    const match2 = text.match(/Year\s*&?\s*Sec\.?\s*:?\s*([IV]+)\s+(?:(?:CSE|ECE|IT|MECH|CIVIL|AIDS|AIML|EEE|ME)\s+)?([A-F])\s*(?:Semester|$)/i);
    if (match2) return match2[2].toUpperCase();
    // No section letter found — default to A
    return 'A';
  }

  // Helper to detect ME year from a Year&Sec text
  function extractMEYear(text) {
    const m = text.match(/Year\s*&?\s*Sec\.?\s*:?\s*([IV]+)/i);
    if (m) {
      const roman = m[1].toUpperCase();
      if (roman === 'II') return 'ME 2nd Year';
      if (roman === 'I') return 'ME 1st Year';
    }
    return null;
  }

  // Helper to classify a table
  function classifyTable(el) {
    const firstRowText = $(el).find('tr').first().text().replace(/\s+/g, '').toUpperCase();
    
    let isGridTable = firstRowText.includes('TIMEDAY') || firstRowText.includes('DAYTIME') || firstRowText.includes('DAYPERIOD');
    if (!isGridTable) {
      $(el).find('tr').each((idx, row) => {
        const firstCol = $(row).find('td, th').first().text().trim().toUpperCase();
        if (firstCol.startsWith('MON') || firstCol.startsWith('TUE') || firstCol.startsWith('WED')) {
          isGridTable = true;
        }
      });
    }

    let isFacultyTable = firstRowText.includes('SL.NO') || firstRowText.includes('SUB.CODE') || firstRowText.includes('SLNO') || firstRowText.includes('SUBCODE');
    if (!isFacultyTable && !isGridTable) {
      const headerText = $(el).find('tr').first().text().toUpperCase();
      if (headerText.includes('FACULTY') || headerText.includes('STAFF') || headerText.includes('SUBJECT')) {
        isFacultyTable = true;
      }
    }

    if (isGridTable) return 'grid';
    if (isFacultyTable) return 'faculty';
    return 'unknown';
  }

  for (let idx = 0; idx < allElements.length; idx++) {
    const el = allElements[idx];
    const tag = el.tagName?.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();

    if (tag === 'p') {
      // Track Course type (B.E vs M.E) — these are often on a separate paragraph
      if (/Course\s*:\s*M\.?E/i.test(text)) {
        currentCourse = 'M.E';
        console.log('[DOCX Parser] Course set to M.E');
      } else if (/Course\s*:\s*B\.?E/i.test(text)) {
        currentCourse = 'B.E';
        console.log('[DOCX Parser] Course set to B.E');
      }

      // Detect section from Year&Sec paragraph
      if (/Year\s*&?\s*Sec/i.test(text)) {
        console.log('[DOCX Parser] Year&Sec paragraph:', JSON.stringify(text));
        
        // Update year for ME based on tracked course
        if (currentCourse === 'M.E') {
          const meYear = extractMEYear(text);
          if (meYear) {
            currentYear = meYear;
            console.log('[DOCX Parser] ME year set to:', currentYear);
          }
        }

        currentSection = extractSection(text);
        console.log('[DOCX Parser] Section set to:', currentSection, '| Year:', currentYear);
      }
    }

    if (tag === 'table') {
      const tableType = classifyTable(el);
      
      if (tableType === 'grid') {
        // LOOKAHEAD: Check if there's a section marker between this grid table and the next table
        // This handles the case where the DOCX has: [Grid Table] [Year&Sec: III - B] [Faculty Table]
        let lookaheadSection = null;
        let lookaheadYear = currentYear;
        let lookaheadCourse = currentCourse;
        for (let j = idx + 1; j < allElements.length; j++) {
          const nextEl = allElements[j];
          const nextTag = nextEl.tagName?.toLowerCase();
          if (nextTag === 'table') break; // Stop at next table
          if (nextTag === 'p') {
            const nextText = $(nextEl).text().replace(/\s+/g, ' ').trim();
            if (/Course\s*:\s*M\.?E/i.test(nextText)) lookaheadCourse = 'M.E';
            else if (/Course\s*:\s*B\.?E/i.test(nextText)) lookaheadCourse = 'B.E';
            if (/Year\s*&?\s*Sec/i.test(nextText)) {
              lookaheadSection = extractSection(nextText);
              if (lookaheadCourse === 'M.E') {
                const meY = extractMEYear(nextText);
                if (meY) lookaheadYear = meY;
              }
              console.log('[DOCX Parser] LOOKAHEAD: found section', lookaheadSection, 'between grid and next table');
              break;
            }
          }
        }

        // Use lookahead section if current section would re-use the previous one
        const effectiveSection = lookaheadSection || currentSection;
        const effectiveYear = lookaheadSection ? lookaheadYear : currentYear;
        
        if (effectiveSection) {
          console.log('[DOCX Parser] Grid table assigned to', effectiveYear, 'Section', effectiveSection);
          const grid = parseTimetableGrid($, el);
          let sectionEntry = sectionsData.find(s => s.section === effectiveSection && s.yearName === effectiveYear);
          if (!sectionEntry) {
            sectionEntry = { yearName: effectiveYear, section: effectiveSection, grid: grid, subjects: [] };
            sectionsData.push(sectionEntry);
          } else {
            sectionEntry.grid = grid;
          }
          
          // If we used lookahead, update current state
          if (lookaheadSection) {
            currentSection = lookaheadSection;
            currentYear = lookaheadYear;
            currentCourse = lookaheadCourse;
          }
        }
      } else if (tableType === 'faculty' && currentSection) {
        console.log('[DOCX Parser] Faculty table assigned to', currentYear, 'Section', currentSection);
        const subjects = parseFacultyTable($, el);
        let sectionEntry = sectionsData.find(s => s.section === currentSection && s.yearName === currentYear);
        if (!sectionEntry) {
          sectionEntry = { yearName: currentYear, section: currentSection, grid: null, subjects: subjects };
          sectionsData.push(sectionEntry);
        } else {
          sectionEntry.subjects = subjects;
        }
      }
    }
  }

  console.log('[DOCX Parser] Final sections parsed:', sectionsData.map(s => `${s.yearName}/${s.section}`).join(', '));

  return {
    yearName: yearFromName,
    sections: sectionsData
  };
}

module.exports = {
  parseIndividualTTDocx,
  parseDocxFile,
  extractYearFromFilename
};

const mammoth = require('mammoth');
const cheerio = require('cheerio');

async function test() {
  const file4th = './uploads/docx-1790066121894-839230549.docx'; 
  const result = await mammoth.convertToHtml({ path: file4th });
  const $ = cheerio.load(result.value);
  const tables = $('table').toArray();
  const gridA = tables[0];
  const rows = $(gridA).find('tr').toArray();
  
  const numRows = rows.length;
  let numCols = 0;
  for (let r = 0; r < numRows; r++) {
    let colsInRow = 0;
    $(rows[r]).find('td, th').each((i, c) => {
      colsInRow += parseInt($(c).attr('colspan') || '1', 10);
    });
    if (colsInRow > numCols) numCols = colsInRow;
  }

  const matrix = Array.from({ length: numRows }, () => Array(numCols).fill(null));

  for (let r = 0; r < numRows; r++) {
    const cols = $(rows[r]).find('td, th').toArray();
    let cIndex = 0;
    
    for (let c = 0; c < cols.length; c++) {
      while (cIndex < numCols && matrix[r][cIndex] !== null) {
        cIndex++;
      }
      if (cIndex >= numCols) break;
      
      const col = $(cols[c]);
      const html = col.html() || '';
      const rawText = col.text().replace(/\s+/g, ' ').trim();
      const colspan = parseInt(col.attr('colspan') || '1', 10);
      const rowspan = parseInt(col.attr('rowspan') || '1', 10);
      
      // Extract specific codes from p tags if available (for PLACBS style)
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
      if (pCodes.length === 0 && rawText) {
        pCodes = [rawText.split(' ')[0]];
      }
      
      const cellData = { rawText, pCodes, colspan, rowspan, r, c: cIndex }; // store origin
      
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

  // Now process the matrix per day
  const dayMap = { 'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT' };
  const resultGrid = {};
  
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
    if (!resultGrid[dayKey]) resultGrid[dayKey] = Array(7).fill(null);
    
    // Group codes by physical column index across all rows that belong to this day
    const dayRowsCount = dayCell.rowspan;
    // Iterate over columns 1 to numCols
    let currentPeriod = 0;
    
    for (let c = 1; c < numCols; c++) {
      const cell = matrix[r][c];
      if (!cell) continue;
      
      if (cell.rawText.toUpperCase().includes('BREAK')) {
        // Skip over the width of the break
        c += (cell.colspan - 1);
        continue;
      }
      
      if (currentPeriod >= 7) break;
      
      // Collect all codes in this physical column for the day's rows
      const codesInCol = new Set();
      for (let dr = 0; dr < dayRowsCount; dr++) {
        const dCell = matrix[r + dr][c];
        if (dCell && dCell.pCodes) {
          dCell.pCodes.forEach(code => {
            if (code && !code.includes('AM') && !code.includes('PM')) {
              codesInCol.add(code);
            }
          });
        }
      }
      
      const uniqueCodes = [...codesInCol].filter(Boolean);
      if (uniqueCodes.length > 0) {
        resultGrid[dayKey][currentPeriod] = uniqueCodes.join('/');
      }
      
      // Skip the rest of this cell's colspan
      c += (cell.colspan - 1);
      currentPeriod++;
    }
    
    // Skip to next day
    r += (dayRowsCount - 1);
  }
  
  console.log(resultGrid);
}
test().catch(console.error);

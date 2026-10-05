const { parseDocxFile } = require('./services/docxParser');

async function test() {
  // Test 4th year file (has PLAC/BS electives)
  const r = await parseDocxFile('./uploads/docx-1790066121894-839230549.docx', '4th Year.docx');
  for (const sec of r.sections) {
    const electives = [];
    for (const [day, periods] of Object.entries(sec.grid)) {
      periods.forEach((cell, idx) => {
        if (cell && cell.code && cell.code.includes('/')) {
          electives.push(day + ' P' + (idx+1) + ': ' + cell.code);
        }
      });
    }
    if (electives.length > 0) {
      console.log(sec.section + ':', electives.join(', '));
    }
  }
  
  // Test 1st year file (has HS26CA02/UHV electives)
  const r2 = await parseDocxFile('./uploads/docx-1790066121819-135890445.docx', '1st Year.docx');
  for (const sec of r2.sections) {
    const electives = [];
    for (const [day, periods] of Object.entries(sec.grid)) {
      periods.forEach((cell, idx) => {
        if (cell && cell.code && cell.code.includes('/')) {
          electives.push(day + ' P' + (idx+1) + ': ' + cell.code);
        }
      });
    }
    if (electives.length > 0) {
      console.log(sec.section + ':', electives.join(', '));
    }
  }
}
test().catch(console.error);

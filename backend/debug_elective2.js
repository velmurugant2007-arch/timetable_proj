const { parseDocxFile } = require('./services/docxParser');

async function test() {
  const file3rd = './uploads/docx-1790013172916-251966811.docx'; // 3rd Year
  const file4th = './uploads/docx-1790066121894-839230549.docx'; // 4th Year

  console.log('--- 3RD YEAR ---');
  const r3 = await parseDocxFile(file3rd, '3rd Year.docx');
  for (const sec of r3.sections) {
    console.log(`Section ${sec.section}:`);
    for (const [day, periods] of Object.entries(sec.grid)) {
      periods.forEach((cell, idx) => {
        if (cell && cell.code && cell.code.includes('/')) {
          console.log(`  ${day} P${idx+1}: ${cell.code}`);
        }
      });
    }
  }

  console.log('\n--- 4TH YEAR ---');
  const r4 = await parseDocxFile(file4th, '4th Year.docx');
  for (const sec of r4.sections) {
    console.log(`Section ${sec.section}:`);
    for (const [day, periods] of Object.entries(sec.grid)) {
      periods.forEach((cell, idx) => {
        if (cell && cell.code && cell.code.includes('/')) {
          console.log(`  ${day} P${idx+1}: ${cell.code}`);
        }
      });
    }
  }
}
test().catch(console.error);

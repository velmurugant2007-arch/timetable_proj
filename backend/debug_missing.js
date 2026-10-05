const { parseDocxFile } = require('./services/docxParser');

async function test() {
  const file1st = './uploads/docx-1790066121819-135890445.docx'; 
  console.log('\n--- 1ST YEAR GRID ---');
  const r = await parseDocxFile(file1st, '1st Year.docx');
  for (const sec of r.sections) {
    if (sec.section === 'A' || sec.section === 'B') {
      console.log(`\nSection ${sec.section}:`);
      for (const day of ['MON', 'TUE']) {
        const row = sec.grid[day].map(c => c ? c.code : 'EMPTY');
        console.log(`  ${day}: ${row.join(' | ')}`);
      }
    }
  }
}
test().catch(console.error);

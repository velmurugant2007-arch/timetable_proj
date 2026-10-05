const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\E DRIVE\\projects\\timetable-proj\\PSNACET_CSE_R2022_Complete_Curriculum_Semesters_I_VIII (1).xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== SHEET NAMES ===');
console.log(workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n=== SHEET: "${sheetName}" ===`);
  console.log(`Total rows: ${data.length}`);
  console.log('--- First 15 rows ---');
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
  });
  if (data.length > 15) {
    console.log('--- Last 5 rows ---');
    data.slice(-5).forEach((row, i) => {
      console.log(`Row ${data.length - 5 + i}: ${JSON.stringify(row)}`);
    });
  }
});

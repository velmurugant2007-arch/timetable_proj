const mammoth = require('mammoth');
const cheerio = require('cheerio');

async function test() {
  const file1st = './uploads/docx-1790066121819-135890445.docx'; 
  const result = await mammoth.convertToHtml({ path: file1st });
  const $ = cheerio.load(result.value);
  const tables = $('table').toArray();
  const gridA = tables[0];
  const rows = $(gridA).find('tr').toArray();
  
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const cols = $(rows[r]).find('td, th').toArray();
    console.log(`\nRow ${r}:`);
    for (let c = 0; c < cols.length; c++) {
      const text = $(cols[c]).text().trim().replace(/\s+/g, ' ');
      const colspan = $(cols[c]).attr('colspan') || '1';
      console.log(`  Col ${c} (colspan=${colspan}): ${text}`);
    }
  }
}
test().catch(console.error);

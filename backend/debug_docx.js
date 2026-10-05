const mammoth = require('mammoth');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

async function debugFile(filePath, label) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`DEBUGGING: ${label} (${filePath})`);
  console.log(`${'='.repeat(80)}`);
  
  const result = await mammoth.convertToHtml({ path: filePath });
  const $ = cheerio.load(result.value);
  
  let elementIndex = 0;
  $('body').children().each((i, el) => {
    const tag = el.tagName?.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    
    if (tag === 'p' && text.length > 0) {
      // Log ALL paragraphs that could contain section/year/course info
      if (/year|sec|course|semester|dept|hall/i.test(text)) {
        console.log(`[P ${elementIndex}] "${text}"`);
      }
    }
    
    if (tag === 'table') {
      // Log the first row of each table for context
      const firstRowText = $(el).find('tr').first().text().replace(/\s+/g, ' ').trim().substring(0, 120);
      const rowCount = $(el).find('tr').length;
      console.log(`[TABLE ${elementIndex}] rows=${rowCount} first_row="${firstRowText}..."`);
    }
    
    elementIndex++;
  });
}

async function main() {
  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir).sort();
  const latestBatch = files.slice(-5);
  
  // Debug each file
  for (const f of latestBatch) {
    const stat = fs.statSync(path.join(uploadsDir, f));
    const sizeLabel = `${(stat.size / 1024 / 1024).toFixed(1)}MB`;
    await debugFile(path.join(uploadsDir, f), `${f} (${sizeLabel})`);
  }
}

main().catch(console.error);

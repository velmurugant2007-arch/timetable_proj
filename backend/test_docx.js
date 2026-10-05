const mammoth = require('mammoth');
const cheerio = require('cheerio');
mammoth.convertToHtml({path: 'C:\\E DRIVE\\projects\\timetable-proj\\2026-2027 ODD SEM TT\\LAB TT - 07.09.2026.docx'}).then(r => {
  const ch = cheerio.load(r.value);
  const table = ch('table').first();
  const text = [];
  table.find('tr').slice(0,3).each((i, tr) => {
    const row = [];
    ch(tr).find('th, td').each((j, td) => row.push(ch(td).text().trim()));
    text.push(row.join(' | '));
  });
  console.log(text);
});

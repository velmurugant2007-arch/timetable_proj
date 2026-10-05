const mammoth = require('mammoth');
const cheerio = require('cheerio');

async function parseDocx(filePath) {
    try {
        const result = await mammoth.convertToHtml({path: filePath});
        const $ = cheerio.load(result.value);
        
        // Find all tables
        const tables = $('table');
        console.log(`Found ${tables.length} tables.`);
        
        if (tables.length > 0) {
            console.log($('table').first().html().substring(0, 500));
        }

        // Let's also check if the "Name of Faculty" is inside the table or outside
        console.log("First 500 chars of HTML body:");
        console.log($('body').html().substring(0, 500));

    } catch (e) {
        console.error(e);
    }
}

parseDocx('C:\\E DRIVE\\projects\\timetable-proj\\2026-2027 ODD SEM TT\\INDIVIDUAL TT upd-07.09.26.docx');

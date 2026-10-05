import React from 'react';

export default function MasterTimetablePrint({ timetables, config, years, printRef, onEditElective }) {
  const { workingDays, periodsPerDay } = config;

  const fullDays = {
    'MON': 'MONDAY', 'TUE': 'TUESDAY', 'WED': 'WEDNESDAY', 
    'THU': 'THURSDAY', 'FRI': 'FRIDAY', 'SAT': 'SATURDAY'
  };

  const getDisplayYear = (name) => {
    if (!name) return '';
    const n = name.toUpperCase();
    if (n.includes('1ST YEAR') && !n.includes('ME')) return 'Year 1';
    if (n.includes('2ND YEAR') && !n.includes('ME')) return 'Year 2';
    if (n.includes('3RD YEAR') && !n.includes('ME')) return 'Year 3';
    if (n.includes('4TH YEAR') && !n.includes('ME')) return 'Year 4';
    if (n.includes('ME 1ST YEAR')) return 'M E - I';
    if (n.includes('ME 2ND YEAR')) return 'M E - II';
    if (n === 'ME') return 'M E';
    return name;
  };

  // Sort years in correct academic order
  function yearSortKey(name) {
    if (!name) return 999;
    const n = name.toUpperCase();
    if (n.includes('1ST YEAR') && !n.includes('ME')) return 1;
    if (n.includes('2ND YEAR') && !n.includes('ME')) return 2;
    if (n.includes('3RD YEAR') && !n.includes('ME')) return 3;
    if (n.includes('4TH YEAR') && !n.includes('ME')) return 4;
    if (n.includes('ME 1ST') || n.includes('ME-I')) return 5;
    if (n.includes('ME 2ND') || n.includes('ME-II')) return 6;
    return 99;
  }

  // Discover all years from both the years array and timetable keys
  const yearMap = new Map();
  years.forEach(y => {
    const name = y.name || y.id;
    yearMap.set(name, { ...y, name });
  });
  // Also discover years from timetable keys not in the years array
  Object.keys(timetables).forEach(key => {
    const parts = key.split('__');
    if (parts[0] && !yearMap.has(parts[0])) {
      yearMap.set(parts[0], { name: parts[0], sections: [] });
    }
  });

  const sortedYears = [...yearMap.values()].sort((a, b) => yearSortKey(a.name) - yearSortKey(b.name));
  
  // Pre-calculate sections for each year to balance the split by actual row count
  const yearsWithSections = sortedYears.map(year => {
    const yearName = year.name || year.id;
    const yearSections = new Set(year.sections || []);
    Object.keys(timetables).forEach(key => {
      const parts = key.split('__');
      if (parts[0] === yearName && parts[1]) {
        yearSections.add(parts[1]);
      }
    });
    return { ...year, allSections: [...yearSections].sort() };
  }).filter(y => y.allSections.length > 0);

  // Find the midpoint based on total sections (rows)
  const totalSections = yearsWithSections.reduce((acc, y) => acc + y.allSections.length, 0);
  const halfSections = Math.ceil(totalSections / 2);
  
  let splitIndex = 0;
  let runningSum = 0;
  for (let i = 0; i < yearsWithSections.length; i++) {
    runningSum += yearsWithSections[i].allSections.length;
    if (runningSum >= halfSections) {
      splitIndex = i + 1;
      break;
    }
  }
  
  // Safeguards for edge cases
  if (splitIndex === 0 && yearsWithSections.length > 1) splitIndex = 1;
  if (splitIndex >= yearsWithSections.length && yearsWithSections.length > 1) splitIndex = yearsWithSections.length - 1;

  const firstHalfYears = yearsWithSections.slice(0, splitIndex);
  const secondHalfYears = yearsWithSections.slice(splitIndex);

  const renderTable = (yearsSubset, isLastPage, isScreenView = false) => (
    <div className={`bg-white ${isScreenView ? '' : 'print-wrapper'} ${(!isLastPage && !isScreenView) ? 'print:break-after-page' : ''}`}>
      <div className="w-full table-container print:mb-[40px]">
        {/* Entire layout is inside a single table to ensure Excel parses rowSpans and colSpans perfectly */}
        <table className={`w-full border-collapse border border-black text-center text-[12px] font-bold h-auto print:text-[14px] ${isScreenView ? 'screen-only-table' : ''}`}>
        <thead>
          {/* Row 1: Main Title */}
          <tr>
            <th colSpan={2 + (workingDays.length * periodsPerDay)} className="border border-black p-2 text-center text-lg uppercase tracking-wider bg-white print:text-xl">
              PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL
            </th>
          </tr>
          
          {/* Row 2: Logos and Subtitle */}
          <tr>
            {/* Note: In Excel, images in HTML tables might not embed perfectly depending on version, but the layout will be correct. We span the first day for the left logo. */}
            <th colSpan={2 + periodsPerDay} className="border border-black p-2 h-24 bg-white relative print:h-32">
               <div className="absolute inset-0 flex items-center justify-center p-2">
                 <img src="/images/psnalog.png" alt="PSNA Logo" className="max-h-full max-w-full object-contain" />
               </div>
            </th>
            
            <th colSpan={(workingDays.length - 2) * periodsPerDay} className="border border-black p-2 bg-white text-center">
              <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#993300] mb-1 print:text-[18px]">
                PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY (An Autonomous Institution, Affiliated to Anna University, Chennai)
              </h2>
              <h3 className="text-[15px] font-extrabold uppercase tracking-widest text-black print:text-[19px]">
                DEPARTMENT OF CSE MASTER CLASS TIME TABLE - ODD / EVEN SEMESTER
              </h3>
            </th>

            <th colSpan={periodsPerDay} className="border border-black p-2 h-24 bg-white relative print:h-32">
               <div className="absolute inset-0 flex items-center justify-center p-2 flex-col text-gray-400">
                  <span className="text-xs">Logos</span>
                  <span className="text-xs">(IQAC / Founder)</span>
               </div>
            </th>
          </tr>

          {/* Row 3: MONDAY, TUESDAY... */}
          <tr>
            <th className="border border-black p-1 relative w-[3%] print:w-[4%]" rowSpan={2} data-mso-rotate="90">
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto text-[11px] tracking-widest print:text-[14px]">CLASS</div>
            </th>
            <th className="border border-black p-1 relative w-[2.5%] print:w-[3%]" rowSpan={2} data-mso-rotate="90">
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto text-[11px] tracking-widest print:text-[14px]">SEC</div>
            </th>
            {workingDays.map((day) => (
              <th key={day} colSpan={periodsPerDay} className="border border-black p-1 uppercase text-[12px] tracking-wider print:text-[15px]">
                {fullDays[day.substring(0, 3).toUpperCase()] || day}
              </th>
            ))}
          </tr>
          
          {/* Row 4: 1 2 3 4 5 6 7 8... */}
          <tr>
            {workingDays.map((day) => (
              Array.from({ length: periodsPerDay }).map((_, pIdx) => (
                <th key={`${day}-${pIdx}`} className="border border-black p-1 text-[10px] print:text-[13px]">
                  {pIdx + 1}
                </th>
              ))
            ))}
          </tr>
        </thead>
        <tbody>
          {yearsSubset.map((year) => {
            const yearName = year.name || year.id;
            const allSections = year.allSections;
            const displayYear = getDisplayYear(yearName);
            
            return allSections.map((sec, secIdx) => {
              const key = `${yearName}__${sec}`;
              const tt = timetables[key];

              return (
                <tr key={key}>
                  {secIdx === 0 && (
                    <td className="border border-black p-1 font-extrabold text-[13px] whitespace-nowrap print:text-[16px]" rowSpan={allSections.length}>
                      {displayYear}
                    </td>
                  )}
                  <td className="border border-black p-1 font-bold text-[13px] print:text-[16px]">{sec}</td>
                  
                  {/* Render cells for each day and period */}
                  {workingDays.map((day) => {
                    const dayGrid = tt?.grid?.[day] || [];
                    let skipCount = 0;
                    
                    return Array.from({ length: periodsPerDay }).map((_, pIdx) => {
                      if (skipCount > 0) {
                        skipCount--;
                        return null;
                      }

                      const cell = dayGrid[pIdx];
                      const isElective = cell?.code?.includes('/');
                      
                      // Calculate colSpan by looking ahead for identical codes
                      let colSpan = 1;
                      if (cell && cell.code) {
                        for (let i = pIdx + 1; i < periodsPerDay; i++) {
                          const nextCell = dayGrid[i];
                          if (nextCell && nextCell.code === cell.code) {
                            colSpan++;
                          } else {
                            break;
                          }
                        }
                      }
                      
                      if (colSpan > 1) {
                        skipCount = colSpan - 1;
                      }
                      
                      return (
                        <td 
                          key={`${day}-${pIdx}`} 
                          colSpan={colSpan}
                          className={`border border-black p-0.5 overflow-hidden h-[40px] print:h-[65px] ${isElective ? 'cursor-pointer hover:bg-blue-50 text-blue-700' : ''}`} 
                          onClick={() => {
                            if (isElective && onEditElective) {
                              onEditElective(cell);
                            }
                          }}
                          title={isElective ? "Click to edit elective course details" : ""}
                          data-mso-rotate="90"
                        >
                          {cell ? (
                            <div className="flex flex-col items-center justify-center w-full h-full p-0">
                              <div 
                                className={`mx-auto text-[11px] print:text-[14px] font-extrabold tracking-wider whitespace-nowrap ${isElective ? 'underline decoration-dotted decoration-blue-400' : ''}`}
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block' }}
                              >
                                {cell.code.split('/').map((part, idx, arr) => (
                                  <React.Fragment key={idx}>
                                    {part}
                                    {idx < arr.length - 1 && (
                                      <React.Fragment>
                                        /<br style={{ msoDataPlacement: 'same-cell' }} />
                                      </React.Fragment>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
      </div>

      {/* Signatures Section for Print - Anchored to bottom of flex container */}
      <table className="hidden print:table w-full text-[17px] font-bold border-none mt-6 pb-4" style={{ pageBreakInside: 'avoid' }}>
        <tbody>
          <tr>
            <td className="border-none text-center pb-1 pt-6">Dept TT i/c</td>
            <td className="border-none text-center pb-1 pt-6">HOD/</td>
            <td className="border-none text-center pb-1 pt-6">TT Convener</td>
            <td className="border-none text-center pb-1 pt-6">Principal</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div ref={printRef} className="print-container overflow-x-auto bg-white p-4 font-sans text-black">
      <style type="text/css" media="print">
        {`
          @page { 
            size: A3 landscape; 
            margin: 4mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-wrapper {
            width: 100% !important;
            min-width: 100% !important;
            zoom: 0.78; /* Adjusted zoom to fit cleanly on A3 */
            padding-bottom: 5mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .table-container {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          table {
            table-layout: fixed;
            width: 100%;
            margin: 0 auto;
          }
          .print\\:break-after-page {
            page-break-after: always;
            break-after: page;
          }
        `}
      </style>
      
      {/* Screen View (Single Full Table) */}
      <div className="print:hidden">
        {renderTable(yearsWithSections, true, true)}
      </div>

      {/* Print View (Split Tables) */}
      <div className="hidden print:block">
        {firstHalfYears.length > 0 && renderTable(firstHalfYears, secondHalfYears.length === 0, false)}
        {secondHalfYears.length > 0 && renderTable(secondHalfYears, true, false)}
      </div>
      
    </div>
  );
}

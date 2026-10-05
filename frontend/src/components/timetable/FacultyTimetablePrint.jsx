import React from 'react';
import { COLLEGE_TIMINGS } from '@/lib/constants';

export default function FacultyTimetablePrint({ faculty, schedule, config, printRef }) {
  const { workingDays } = config;

  // Extract unique subjects and aggregate their classes (year/section)
  const subjectMap = new Map(); // code -> { code, subject, classes: Set<'year sec'> }
  
  if (schedule) {
    Object.values(schedule).forEach(dayPeriods => {
      dayPeriods.forEach(cell => {
        if (cell && cell.code) {
          const code = cell.code;
          if (!subjectMap.has(code)) {
            subjectMap.set(code, {
              code,
              subject: (cell.subject && cell.subject !== code) ? cell.subject : '',
              classes: new Set(),
            });
          }
          const entry = subjectMap.get(code);
          // Update name if we got a real one
          if (!entry.subject && cell.subject && cell.subject !== code) {
            entry.subject = cell.subject;
          }
          // Track which year/section this code appears for
          const classLabel = cell.className || 
            [cell.year, cell.section ? `Sec ${cell.section}` : ''].filter(Boolean).join(' ');
          if (classLabel) entry.classes.add(classLabel);
        }
      });
    });
  }

  const uniqueSubjects = [...subjectMap.values()];

  const subjectCodesList = uniqueSubjects
    .map(s => {
      const name = s.subject ? ` - ${s.subject}` : '';
      return `${s.code}${name}`;
    })
    .join(', ');

  return (
    <div ref={printRef} className="print-container overflow-x-auto bg-white p-4 font-sans text-sm text-black">
      <style type="text/css" media="print">
        {`
          @page { margin: 5mm; }
        `}
      </style>
      <div className="min-w-[800px] print:min-w-0 print:w-full border border-black p-4 mx-auto bg-white">
        
        {/* Title */}
        <div className="mb-3 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wider">INDIVIDUAL FACULTY TIMETABLE</h2>
        </div>

        {/* Header Section */}
        <div className="mb-4 grid grid-cols-2 gap-4 border-b border-black pb-3 text-[13px] font-bold">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <span>Name of Faculty:</span>
              <span className="font-bold text-black border-b border-transparent">{faculty?.name || '—'}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Subject:</span>
              <input 
                type="text" 
                value={subjectCodesList || '—'} 
                readOnly
                className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" 
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-4">
              <div className="flex gap-2 items-center">
                <span>Dept:</span>
                <input 
                  type="text" 
                  value={faculty?.dept || "CSE"} 
                  readOnly
                  className="w-16 border-b border-dashed border-slate-400 bg-transparent outline-none text-center font-bold" 
                />
              </div>
              <div className="flex gap-2 items-center">
                <span>Designation:</span>
                <input 
                  type="text" 
                  value={faculty?.designation || "Professor"} 
                  readOnly
                  className="w-32 border-b border-dashed border-slate-400 bg-transparent outline-none text-center font-bold" 
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span>Ac. Year:</span>
              <input 
                type="text" 
                value="2026-27 ODD" 
                readOnly
                className="w-32 border-b border-dashed border-slate-400 bg-transparent outline-none text-center font-bold" 
              />
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <table className="w-full border-collapse border border-black text-center text-[12px] font-semibold">
          <thead>
            <tr>
              <th className="border border-black p-2 align-top relative w-20">
                <div className="absolute top-1 left-2 text-[10px]">Time</div>
                <div className="absolute bottom-1 right-2 text-[10px]">Day</div>
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="100%" y2="100%" stroke="black" strokeWidth="1" />
                </svg>
              </th>
              {COLLEGE_TIMINGS.map((t, i) => (
                <th key={i} className="border border-black p-1">
                  {t.isBreak ? (
                    <div className="flex flex-col items-center justify-center text-[10px] tracking-widest leading-tight">
                      <span>{t.time.split(' - ')[0]}</span>
                      <span>{t.time.split(' - ')[1]}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[11px] leading-tight">
                      <span>{t.time.split(' - ')[0]}</span>
                      <span>{t.time.split(' - ')[1]}</span>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workingDays.map((day, rIdx) => (
              <tr key={day}>
                <td className="border border-black p-2 font-bold">{day}</td>
                {COLLEGE_TIMINGS.map((t, cIdx) => {
                  if (t.isBreak) {
                    if (rIdx === 0) {
                      return (
                        <td key={cIdx} rowSpan={workingDays.length} className="border border-black p-1">
                          <div className="flex h-full items-center justify-center">
                            <span data-mso-rotate="90" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-sm font-bold tracking-[0.2em]">{t.label}</span>
                          </div>
                        </td>
                      );
                    }
                    return null;
                  }

                  const periodIdx = COLLEGE_TIMINGS.slice(0, cIdx).filter(x => !x.isBreak).length;
                  const cell = schedule?.[day]?.[periodIdx];

                  return (
                    <td key={cIdx} className="border border-black p-1 min-w-[70px]">
                      {cell ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold">{cell.code || cell.subjectCode}</span>
                          {(cell.year || cell.section || cell.className) && (
                            <span className="text-[10px] text-slate-600 font-normal">
                              {cell.className ? cell.className : `${cell.year ? `${cell.year} ` : ''}${cell.section ? `Sec ${cell.section}` : ''}`}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Class Table */}
        <div className="mt-0">
          <table className="w-full border-collapse border border-black text-[12px] font-semibold border-t-0">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-20 text-center uppercase font-bold bg-slate-50">CLASS</td>
                <td className="border border-black p-2 text-left">
                  <div className="flex flex-col gap-1">
                    {uniqueSubjects.map((sub, idx) => (
                      <div key={idx} className="flex gap-2 flex-wrap">
                        <span className="font-bold">{sub.code}</span>
                        <span>–</span>
                        <span>{sub.subject}</span>
                        <span>–</span>
                        <span className="text-indigo-900 font-semibold">
                          {[...sub.classes].join(', ')}
                        </span>
                      </div>
                    ))}
                    {uniqueSubjects.length === 0 && <span className="italic text-slate-400">No classes assigned</span>}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures */}
        <div className="mt-12 flex justify-between px-4 text-xs font-bold text-slate-700">
          <div>Dept. TT I/C</div>
          <div>HOD</div>
          <div>TT Convener</div>
          <div>PRINCIPAL</div>
        </div>

      </div>
    </div>
  );
}


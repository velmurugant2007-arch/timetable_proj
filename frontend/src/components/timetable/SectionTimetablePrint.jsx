import React, { useState } from 'react';
import { COLLEGE_TIMINGS } from '@/lib/constants';

export default function SectionTimetablePrint({ timetable, config, printRef, editable, onEditCell }) {
  const { workingDays } = config;
  
  // Calculate total hours per subject code/name from grid
  const totalHoursMap = new Map();

  if (timetable.grid) {
    Object.values(timetable.grid).forEach(dayPeriods => {
      dayPeriods.forEach(cell => {
        if (cell) {
          const codeKey = (cell.code || cell.displayCode || '').trim().toUpperCase();
          const nameKey = (cell.name || cell.code || '').trim().toLowerCase();
          
          totalHoursMap.set(nameKey, (totalHoursMap.get(nameKey) || 0) + 1);
          totalHoursMap.set(codeKey, (totalHoursMap.get(codeKey) || 0) + 1);
        }
      });
    });
  }

  let displaySubjects = [];

  if (timetable.subjects && timetable.subjects.length > 0) {
    displaySubjects = timetable.subjects.map((s, idx) => {
      const codeKey = (s.rawCode || s.code || '').trim().toUpperCase();
      const nameKey = (s.name || '').trim().toLowerCase();
      const countedHours = totalHoursMap.get(codeKey) || totalHoursMap.get(nameKey);
      
      return {
        slNo: s.slNo || (idx + 1),
        code: s.rawCode || s.code,
        acronym: s.acronym || s.code?.substring(0, 4),
        name: s.name || s.code,
        hoursW: s.hoursW !== undefined && s.hoursW !== '' ? s.hoursW : (countedHours ?? s.hours ?? '-'),
        hoursS: s.hoursS !== undefined && s.hoursS !== '' ? s.hoursS : '-',
        facultyName: s.facultyName || '-',
        dept: s.dept || timetable.dept || 'CSE'
      };
    });
  } else {
    // Fallback: Group subjects from grid cells
    const subjectsMap = new Map();

    if (timetable.grid) {
      Object.values(timetable.grid).forEach(dayPeriods => {
        dayPeriods.forEach(cell => {
          if (cell) {
            const subjectName = cell.name ? cell.name.trim() : cell.code.trim();
            const key = subjectName.toLowerCase();

            if (!subjectsMap.has(key)) {
              subjectsMap.set(key, {
                ...cell,
                name: subjectName,
                facultyNames: new Set([cell.facultyName || '-'])
              });
            } else {
              subjectsMap.get(key).facultyNames.add(cell.facultyName || '-');
            }
          }
        });
      });
    }

    displaySubjects = Array.from(subjectsMap.values()).map((sub, idx) => ({
      slNo: idx + 1,
      code: sub.rawCode || sub.code,
      acronym: sub.acronym || sub.code?.substring(0, 4),
      name: sub.name,
      hoursW: sub.hoursW || totalHoursMap.get(sub.name.trim().toLowerCase()) || sub.hours || '-',
      hoursS: sub.hoursS || '-',
      facultyName: Array.from(sub.facultyNames).join(', '),
      dept: sub.dept || timetable.dept || 'CSE'
    }));
  }

  return (
    <div ref={printRef} className="print-container overflow-x-auto bg-white p-4 font-sans text-sm text-black">
      <style type="text/css" media="print">
        {`
          @page { margin: 5mm; }
        `}
      </style>
      <div className="min-w-[800px] print:min-w-0 print:w-full border border-black p-2 mx-auto">
        {/* Header Section */}
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wider">CLASS TIMETABLE</h2>
        </div>
        
        <div className="mb-4 grid grid-cols-3 gap-4 text-[13px] font-bold uppercase">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <span>Dept.:</span>
              <input type="text" defaultValue={timetable.dept || "CSE"} className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" />
            </div>
            <div className="flex gap-2">
              <span>Year & Sec.:</span>
              <span className="border-b border-transparent font-bold">{timetable.year} - {timetable.section}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <span>Academic Year:</span>
              <input type="text" defaultValue={timetable.academicYear || "2026-2027 ODD"} className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" />
            </div>
            <div className="flex gap-2">
              <span>Semester:</span>
              <input type="text" defaultValue={timetable.semester || "VII"} className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <span>Course:</span>
              <input type="text" defaultValue={timetable.course || "B.E"} className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" />
            </div>
            <div className="flex gap-2">
              <span>Hall No.:</span>
              <input type="text" defaultValue={timetable.hallNo || "CS208"} className="border-b border-dashed border-slate-400 bg-transparent outline-none flex-1 font-bold" />
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

                  // Find which period index this is (ignoring breaks)
                  const periodIdx = COLLEGE_TIMINGS.slice(0, cIdx).filter(x => !x.isBreak).length;
                  const cell = timetable.grid[day]?.[periodIdx];

                  return (
                    <td 
                      key={cIdx} 
                      className={`border border-black p-1 min-w-[70px] ${editable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
                      onClick={() => {
                        if (editable && onEditCell) {
                          onEditCell(day, periodIdx);
                        }
                      }}
                    >
                      {cell ? (
                        <div className="flex flex-col items-center justify-center">
                          <span>{cell.displayCode || cell.code}</span>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Subject Table */}
        <div className="mt-6">
          <table className="w-full border-collapse border border-black text-center text-[11px]">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="border border-black p-1 w-8">Sl.<br/>No</th>
                <th className="border border-black p-1">Sub.<br/>Code</th>
                <th className="border border-black p-1 w-16">Sub.<br/>Acronym</th>
                <th className="border border-black p-1 text-left">Sub. Name</th>
                <th className="border border-black p-1" colSpan={2}>Hours<br/><div className="flex justify-between px-2 border-t border-black mt-1"><span>W</span><span>S</span></div></th>
                <th className="border border-black p-1 text-left">Faculty Name</th>
                <th className="border border-black p-1">Dept.</th>
              </tr>
            </thead>
            <tbody>
              {displaySubjects.map((sub, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1">{sub.slNo || (idx + 1)}</td>
                  <td className="border border-black p-1 font-bold">{sub.code}</td>
                  <td className="border border-black p-1 font-bold">
                    <input type="text" defaultValue={sub.acronym || sub.code?.substring(0,4)} className="w-full text-center bg-transparent outline-none border-b border-dashed border-transparent focus:border-slate-400 font-bold" />
                  </td>
                  <td className="border border-black p-1 text-left">{sub.name}</td>
                  <td className="border border-black p-1 border-r-0 w-6">{sub.hoursW}</td>
                  <td className="border border-black p-1 border-l-0 w-6">{sub.hoursS}</td>
                  <td className="border border-black p-1 text-left font-medium">{sub.facultyName}</td>
                  <td className="border border-black p-1">
                    <input type="text" defaultValue={sub.dept || "CSE"} className="w-8 text-center bg-transparent outline-none border-b border-dashed border-transparent focus:border-slate-400 font-medium" />
                  </td>
                </tr>
              ))}
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

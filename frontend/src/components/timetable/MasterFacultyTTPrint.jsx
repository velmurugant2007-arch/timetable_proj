'use client';

import React from 'react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function MasterFacultyTTPrint({ data, printRef }) {
  if (!data || !data.faculty || data.faculty.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        No Faculty Master Timetable data available to display.
      </div>
    );
  }

  const { meta, faculty } = data;
  const days = meta?.days || DAYS;
  const periodsPerDay = meta?.periodsPerDay || 7;
  const periodNums = Array.from({ length: periodsPerDay }, (_, i) => i + 1);
  const totalPeriods = days.length * periodsPerDay;
  const periodColWidth = (80 / totalPeriods).toFixed(3);

  const collegeName = meta?.college || 'PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL';
  const deptTitle = meta?.department || 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING';
  const semester = meta?.semester || '';
  const signatures = meta?.signatures || ['Dept TT i/c', 'HOD', 'TT Convener', 'Principal'];

  // Split faculty list in half for the 2-page print layout (referenced from MasterTimetablePrint)
  const halfFaculty = Math.ceil(faculty.length / 2);
  const firstHalfFaculty = faculty.slice(0, halfFaculty);
  const secondHalfFaculty = faculty.slice(halfFaculty);

  const totalCols = 2 + totalPeriods + 1;

  const renderTable = (facultySubset, isLastPage, isScreenView = false) => (
    <div className={`bg-white ${isScreenView ? '' : 'print-wrapper'} ${(!isLastPage && !isScreenView) ? 'print:break-after-page' : ''}`}>
      <div className="w-full table-container print:mb-2">
        <table 
          className={`w-full border-collapse border border-black text-center text-[10px] font-semibold print:text-[11px] ${
            isScreenView ? 'screen-only-table' : 'print-only-table'
          }`}
          style={{ tableLayout: 'fixed', width: '100%' }}
        >
          {/* Explicit colgroup to force exact proportional column widths and prevent horizontal overflow */}
          <colgroup>
            <col style={{ width: '2.5%' }} />
            <col style={{ width: '13.5%' }} />
            {days.map((day) =>
              periodNums.map((p) => (
                <col key={`${day}-${p}`} style={{ width: `${periodColWidth}%` }} />
              ))
            )}
            <col style={{ width: '4%' }} />
          </colgroup>

          <thead>
            {/* Header Row 1: College Name */}
            <tr>
              <th
                colSpan={totalCols}
                className="border border-black p-1.5 text-center text-sm font-bold uppercase tracking-wider bg-slate-50 text-slate-900 print:text-[14px]"
              >
                {collegeName}
              </th>
            </tr>

            {/* Header Row 2: Department & Semester */}
            <tr>
              <th
                colSpan={totalCols}
                className="border border-black p-1 text-center text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-800 print:text-[12px]"
              >
                {deptTitle} – MASTER FACULTY TIME TABLE {semester ? `(${semester})` : ''} {!isScreenView && (isLastPage ? '(Page 2)' : '(Page 1)')}
              </th>
            </tr>

            {/* Header Row 3: Day Names */}
            <tr className="bg-slate-200 text-black">
              <th rowSpan={2} className="border border-black p-0.5 text-center font-bold text-[10px] print:text-[11px]">
                Sl.No
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-0.5 text-left font-bold text-[10px] print:text-[11px]">
                FACULTY MEMBER
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  colSpan={periodsPerDay}
                  className="border border-black px-0.5 py-1 text-center font-bold uppercase tracking-wider text-[10px] print:text-[11px]"
                >
                  {day}
                </th>
              ))}
              <th rowSpan={2} className="border border-black p-0.5 text-center font-bold bg-amber-50 text-[10px] print:text-[11px]">
                TOTAL HRS
              </th>
            </tr>

            {/* Header Row 4: Period Numbers */}
            <tr className="bg-slate-100 text-black">
              {days.map((day) =>
                periodNums.map((p) => (
                  <th
                    key={`${day}-p${p}`}
                    className="border border-black p-0.5 text-center font-bold text-[9px] print:text-[10px]"
                  >
                    {p}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {facultySubset.map((fac, idx) => {
              const isLeave = fac.isMedicalLeave;
              const displayName = fac.fullName || fac.acronym;
              const hasDesig = fac.designation && fac.designation !== 'Faculty';
              
              // Sl No preservation
              const slNo = fac.slNo || (isScreenView ? idx + 1 : (faculty.indexOf(fac) + 1));

              return (
                <tr
                  key={fac.acronym || slNo}
                  className={`hover:bg-blue-50/50 transition-colors ${
                    isLeave ? 'bg-slate-100/80 text-slate-500' : (idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white')
                  }`}
                >
                  {/* Sl No */}
                  <td className="border border-black p-0.5 text-center font-bold text-slate-700 text-[10px] print:text-[11px]">
                    {slNo}
                  </td>

                  {/* Faculty Info */}
                  <td className="border border-black px-1.5 py-0.5 text-left font-bold leading-tight overflow-hidden">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-[10px] print:text-[11px] truncate max-w-full">
                        {displayName}
                      </span>
                      <span className="text-[8.5px] print:text-[9.5px] font-mono font-bold px-1 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">
                        {fac.acronym}
                      </span>
                    </div>
                    {hasDesig && (
                      <div className="text-[8px] print:text-[8.5px] font-medium text-slate-500 truncate max-w-full">
                        {fac.designation}
                      </div>
                    )}
                    {fac.remarks && !isLeave && (
                      <div className="text-[7.5px] print:text-[8px] italic text-amber-700 truncate max-w-full">
                        {fac.remarks}
                      </div>
                    )}
                  </td>

                  {/* Period cells or Medical Leave banner */}
                  {isLeave ? (
                    <td
                      colSpan={totalPeriods}
                      className="border border-black p-1 text-center font-bold tracking-widest text-red-600 bg-red-50/60 uppercase text-[10px] print:text-[11px]"
                    >
                      ★ {fac.remarks || 'MEDICAL LEAVE'} ★
                    </td>
                  ) : (
                    days.map((day) =>
                      periodNums.map((p) => {
                        const cell = fac.schedule?.[day]?.[p];
                        if (!cell) {
                          return (
                            <td
                              key={`${fac.acronym}-${day}-${p}`}
                              className="border border-black p-0.5 text-center text-slate-300 font-mono text-[8.5px] print:text-[9.5px] h-[32px] print:h-[38px]"
                            >
                              —
                            </td>
                          );
                        }

                        // Determine cell tone
                        const isLab = cell.className || (cell.facultyList && cell.facultyList.length > 1);

                        return (
                          <td
                            key={`${fac.acronym}-${day}-${p}`}
                            className={`border border-black p-[1px] print:p-[0.5px] text-center leading-tight h-[32px] print:h-[38px] overflow-hidden ${
                              isLab ? 'bg-indigo-50/70 font-semibold' : 'bg-emerald-50/50'
                            }`}
                            title={`${cell.raw || cell.subjectCode}${cell.className ? ' (' + cell.className + ')' : ''}`}
                          >
                            <div className="font-extrabold text-[8.5px] print:text-[9.5px] text-slate-900 leading-tight truncate">
                              {cell.subjectCode}
                            </div>
                            {cell.className && (
                              <div className="text-[7.5px] print:text-[8px] font-semibold text-indigo-700 leading-tight truncate">
                                {cell.className}
                              </div>
                            )}
                            {cell.facultyList && cell.facultyList.length > 1 && (
                              <div className="text-[7px] print:text-[7.5px] text-slate-500 font-mono leading-none truncate">
                                {cell.facultyList.join('/')}
                              </div>
                            )}
                          </td>
                        );
                      })
                    )
                  )}

                  {/* Total Hours */}
                  <td className="border border-black p-0.5 text-center font-extrabold text-[10px] print:text-[11.5px] bg-amber-50/60 text-slate-900">
                    {isLeave ? 0 : fac.totalHours || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signatures Section for Print - Anchored to bottom of flex container (referenced from MasterTimetablePrint) */}
      <table className="hidden print:table w-full text-[13px] font-bold border-none mt-4 pb-2" style={{ pageBreakInside: 'avoid' }}>
        <tbody>
          <tr>
            {signatures.map((sig, i) => (
              <td key={i} className="border-none text-center pb-1 pt-4">
                <div className="w-28 border-b border-black mb-1.5 mx-auto"></div>
                {sig}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div ref={printRef} className="print-faculty-master bg-white p-4 font-sans text-black overflow-x-auto print:overflow-visible">
      <style type="text/css" media="print">
        {`
          @page {
            size: A3 landscape;
            margin: 4mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-faculty-master {
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .print-wrapper {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            zoom: 0.78; /* Clean zoom calibrated to fit all 45 columns horizontally without clipping */
            padding-bottom: 4mm;
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
            table-layout: fixed !important;
            width: 100% !important;
            margin: 0 auto;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #000 !important;
          }
          .print\\:break-after-page {
            page-break-after: always;
            break-after: page;
          }
        `}
      </style>

      {/* Screen View (Single Full Table with horizontal scroll if needed) */}
      <div className="print:hidden overflow-x-auto">
        <div className="min-w-[1200px]">
          {renderTable(faculty, true, true)}
        </div>
      </div>

      {/* Print View (2-Page Split Layout directly modeled after MasterTimetablePrint) */}
      <div className="hidden print:block w-full">
        {firstHalfFaculty.length > 0 && renderTable(firstHalfFaculty, secondHalfFaculty.length === 0, false)}
        {secondHalfFaculty.length > 0 && renderTable(secondHalfFaculty, true, false)}
      </div>
    </div>
  );
}

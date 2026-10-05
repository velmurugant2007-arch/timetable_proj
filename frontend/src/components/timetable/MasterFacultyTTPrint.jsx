'use client';

import React from 'react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

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
  const periodsPerDay = 7;
  const periodNums = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  const collegeName = meta?.college || 'PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL';
  const deptTitle = meta?.department || 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING - MASTER FACULTY TIME TABLE';
  const semester = meta?.semester || '';
  const signatures = meta?.signatures || ['Dept TT i/c', 'HOD', 'TT Convener', 'Principal'];

  // Split faculty list in half for the 2-page print layout
  const halfFaculty = Math.ceil(faculty.length / 2);
  const firstHalfFaculty = faculty.slice(0, halfFaculty);
  const secondHalfFaculty = faculty.slice(halfFaculty);

  const renderTable = (facultySubset, isLastPage, isScreenView = false) => (
    <div className={`bg-white ${isScreenView ? '' : 'print-wrapper'} ${(!isLastPage && !isScreenView) ? 'print:break-after-page' : ''}`}>
      <div className="table-wrapper min-w-[1400px] border border-black p-2 bg-white print:p-0 print:border-none print:mb-[20px]">
        <table className={`w-full border-collapse border border-black text-center text-[10px] font-semibold print:text-[13px] ${isScreenView ? 'screen-only-table' : 'print-only-table'}`}>
          <thead>
            {/* Header Row 1: College Name */}
            <tr>
              <th
                colSpan={2 + (days.length * periodsPerDay) + 1}
                className="border border-black p-2 text-center text-base font-bold uppercase tracking-wider bg-slate-50 text-slate-900 print:text-lg"
              >
                {collegeName}
              </th>
            </tr>

            {/* Header Row 2: Department & Semester */}
            <tr>
              <th
                colSpan={2 + (days.length * periodsPerDay) + 1}
                className="border border-black p-1.5 text-center text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-800 print:text-[15px]"
              >
                {deptTitle} {semester ? `– ${semester}` : ''}
              </th>
            </tr>

            {/* Header Row 3: Day Names */}
            <tr className="bg-slate-200 text-black">
              <th rowSpan={2} className="border border-black px-2 py-1 w-10 text-center font-bold print:text-[13px]">
                Sl.No
              </th>
              <th rowSpan={2} className="border border-black px-3 py-1 min-w-[180px] text-left font-bold print:text-[13px]">
                FACULTY MEMBER
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  colSpan={periodsPerDay}
                  className="border border-black px-1 py-1 text-center font-bold uppercase tracking-wider text-[11px] print:text-[13px]"
                >
                  {day}
                </th>
              ))}
              <th rowSpan={2} className="border border-black px-2 py-1 w-14 text-center font-bold bg-amber-50 print:text-[13px]">
                TOTAL HRS
              </th>
            </tr>

            {/* Header Row 4: Period Numbers */}
            <tr className="bg-slate-100 text-black">
              {days.map((day) =>
                periodNums.map((p) => (
                  <th
                    key={`${day}-p${p}`}
                    className="border border-black px-1 py-0.5 w-9 text-center font-bold text-[10px] print:text-[12px]"
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
              
              // Sl No needs to map correctly for the second half table
              const slNo = fac.slNo || (isScreenView ? idx + 1 : (faculty.indexOf(fac) + 1));

              return (
                <tr
                  key={fac.acronym || slNo}
                  className={`hover:bg-blue-50/50 transition-colors ${
                    isLeave ? 'bg-slate-100/80 text-slate-500' : (idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white')
                  }`}
                >
                  {/* Sl No */}
                  <td className="border border-black p-1 text-center font-bold text-slate-700">
                    {slNo}
                  </td>

                  {/* Faculty Info */}
                  <td className="border border-black p-1 text-left font-bold leading-tight">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 print:text-[14px]">{displayName}</span>
                      <span className="text-[9px] print:text-[11px] font-mono font-bold px-1 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">
                        {fac.acronym}
                      </span>
                    </div>
                    {hasDesig && (
                      <div className="text-[9px] print:text-[11px] font-medium text-slate-500 truncate max-w-[200px]">
                        {fac.designation}
                      </div>
                    )}
                    {fac.remarks && !isLeave && (
                      <div className="text-[8px] print:text-[10px] italic text-amber-700">{fac.remarks}</div>
                    )}
                  </td>

                  {/* Period cells or Leave banner */}
                  {isLeave ? (
                    <td
                      colSpan={days.length * periodsPerDay}
                      className="border border-black p-2 text-center font-bold tracking-widest text-red-600 bg-red-50/60 uppercase print:text-[13px]"
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
                              className="border border-black p-0.5 text-center text-slate-300 font-mono text-[9px] print:text-[12px] h-[35px] print:h-[45px]"
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
                            className={`border border-black p-0.5 text-center leading-tight h-[35px] print:h-[45px] ${
                              isLab ? 'bg-indigo-50/70 font-semibold' : 'bg-emerald-50/50'
                            }`}
                            title={`${cell.raw || cell.subjectCode}${cell.className ? ' (' + cell.className + ')' : ''}`}
                          >
                            <div className="font-bold text-[9.5px] print:text-[12px] text-slate-900 truncate">
                              {cell.subjectCode}
                            </div>
                            {cell.className && (
                              <div className="text-[8px] print:text-[10px] font-semibold text-indigo-700 truncate">
                                {cell.className}
                              </div>
                            )}
                            {cell.facultyList && cell.facultyList.length > 1 && (
                              <div className="text-[7.5px] print:text-[9.5px] text-slate-500 font-mono truncate">
                                {cell.facultyList.join('/')}
                              </div>
                            )}
                          </td>
                        );
                      })
                    )
                  )}

                  {/* Total Hours */}
                  <td className="border border-black p-1 text-center font-extrabold text-[11px] print:text-[13px] bg-amber-50/60 text-slate-900">
                    {isLeave ? 0 : fac.totalHours || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Signatures (only on last page or screen view) */}
          {isLastPage && (
            <tfoot>
              <tr className="bg-slate-50">
                <td
                  colSpan={2 + (days.length * periodsPerDay) + 1}
                  className="border border-black p-6"
                >
                  <div className="flex justify-between items-end px-12 pt-6 pb-2 text-[11px] print:text-[14px] font-bold uppercase tracking-wider text-slate-800">
                    {signatures.map((sig, i) => (
                      <div key={i} className="text-center">
                        <div className="w-32 border-b border-black mb-2 mx-auto"></div>
                        <div>{sig}</div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  return (
    <div ref={printRef} className="print-faculty-master bg-white p-4 font-sans text-black overflow-x-auto print:overflow-visible">
      <style type="text/css" media="print">
        {`
          @page {
            size: A3 landscape;
            margin: 5mm;
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
            zoom: 0.70; /* Significantly adjusted zoom to fit A3 width nicely */
            width: max-content !important;
            max-width: none !important;
            margin: 0 auto;
          }
          .table-wrapper {
            width: max-content !important;
            max-width: none !important;
            margin: 0 auto;
          }
          table {
            border-collapse: collapse !important;
            width: max-content !important;
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

      {/* Screen View (Single Full Table) */}
      <div className="print:hidden">
        {renderTable(faculty, true, true)}
      </div>

      {/* Print View (Split Tables) */}
      <div className="hidden print:block w-full">
        {firstHalfFaculty.length > 0 && renderTable(firstHalfFaculty, secondHalfFaculty.length === 0, false)}
        {secondHalfFaculty.length > 0 && renderTable(secondHalfFaculty, true, false)}
      </div>
    </div>
  );
}

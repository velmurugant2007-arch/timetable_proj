'use client';

import React from 'react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function IndividualFacultyMasterPrint({ faculty, meta, printRef }) {
  if (!faculty) return null;

  const days = meta?.days || DAYS;
  const periods = PERIODS;
  const collegeName = meta?.college || 'PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL';
  const deptTitle = meta?.department || 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING';
  const semester = meta?.semester || '2025-26 EVEN SEMESTER';
  const signatures = meta?.signatures || ['Dept TT i/c', 'HOD', 'TT Convener', 'Principal'];

  // Collect unique subjects & classes taught by this faculty
  const assignedList = [];
  const seenKeys = new Set();

  if (faculty.schedule) {
    days.forEach((day) => {
      periods.forEach((p) => {
        const cell = faculty.schedule?.[day]?.[p];
        if (cell && !cell.isMedicalLeave && cell.subjectCode) {
          const key = `${cell.subjectCode}__${cell.className || ''}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            assignedList.push(cell);
          }
        }
      });
    });
  }

  const isLeave = faculty.isMedicalLeave;

  return (
    <div ref={printRef} className="print-container bg-white p-4 font-sans text-sm text-black">
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}
      </style>

      <div className="border border-black p-5 mx-auto bg-white max-w-[850px]">
        {/* College Header */}
        <div className="mb-2 text-center">
          <h1 className="text-base font-bold uppercase tracking-wider text-black">
            {collegeName}
          </h1>
          <h2 className="text-xs font-semibold uppercase text-slate-700">
            {deptTitle}
          </h2>
          <h3 className="text-sm font-extrabold uppercase tracking-wide mt-2 border-y border-black py-1 bg-slate-50">
            INDIVIDUAL FACULTY TIME TABLE {semester ? `(${semester})` : ''}
          </h3>
        </div>

        {/* Faculty Details Header */}
        <div className="my-3 grid grid-cols-2 gap-3 text-xs border border-black p-3 bg-slate-50/50">
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <span className="font-bold w-32">Faculty Name:</span>
              <span className="font-extrabold text-slate-900">{faculty.fullName || faculty.acronym}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-32">Acronym / Code:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {faculty.acronym}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-32">Department:</span>
              <span>CSE</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2">
              <span className="font-bold w-32">Designation:</span>
              <span>{faculty.designation || 'Faculty'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-32">Total Work Hours:</span>
              <span className="font-extrabold text-emerald-700">{isLeave ? 0 : faculty.totalHours || 0} Hours / Week</span>
            </div>
            {faculty.remarks && (
              <div className="flex gap-2">
                <span className="font-bold w-32">Status / Remarks:</span>
                <span className={`font-semibold ${isLeave ? 'text-red-600' : 'text-slate-700'}`}>
                  {faculty.remarks}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Grid */}
        {isLeave ? (
          <div className="p-8 text-center border border-black my-4 bg-red-50 text-red-700 font-bold uppercase tracking-widest text-base">
            ★ ON MEDICAL LEAVE ★
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-center text-xs font-semibold my-3">
            <thead>
              <tr className="bg-slate-100 text-black">
                <th className="border border-black p-2 w-24 font-bold uppercase">DAY</th>
                {periods.map((p) => (
                  <th key={p} className="border border-black p-1.5 font-bold">
                    P{p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50">
                  <td className="border border-black p-2 font-bold bg-slate-50 text-left text-[11px]">
                    {day}
                  </td>
                  {periods.map((p) => {
                    const cell = faculty.schedule?.[day]?.[p];
                    if (!cell) {
                      return (
                        <td
                          key={`${day}-${p}`}
                          className="border border-black p-1 text-slate-300 font-mono text-[11px]"
                        >
                          —
                        </td>
                      );
                    }
                    const isCoTaught = cell.facultyList && cell.facultyList.length > 1;
                    return (
                      <td
                        key={`${day}-${p}`}
                        className={`border border-black p-1 leading-tight ${
                          cell.className ? 'bg-indigo-50/70' : 'bg-emerald-50/50'
                        }`}
                      >
                        <div className="font-bold text-[11px] text-slate-900">
                          {cell.subjectCode}
                        </div>
                        {cell.className && (
                          <div className="text-[9.5px] font-semibold text-indigo-700">
                            {cell.className}
                          </div>
                        )}
                        {isCoTaught && (
                          <div className="text-[8px] text-slate-500 font-mono">
                            {cell.facultyList.join('/')}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Assigned Subjects Summary */}
        <div className="mt-4 border border-black p-2 text-xs bg-slate-50/40">
          <div className="font-bold uppercase tracking-wide mb-1 border-b border-black pb-1">
            Assigned Courses & Classes
          </div>
          {assignedList.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {assignedList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">{item.subjectCode}</span>
                  {item.className && (
                    <span className="text-indigo-800 font-medium">({item.className})</span>
                  )}
                  {item.facultyList && item.facultyList.length > 1 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      [with {item.facultyList.filter((a) => a !== faculty.acronym).join(', ')}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="italic text-slate-400">
              {isLeave ? 'No active classes assigned (Medical Leave)' : 'No classes assigned'}
            </div>
          )}
        </div>

        {/* Footer Signatures */}
        <div className="mt-12 flex justify-between px-4 text-xs font-bold text-slate-800 uppercase tracking-wider">
          {signatures.map((sig, i) => (
            <div key={i} className="text-center">
              <div className="w-24 border-b border-black mb-1 mx-auto"></div>
              <div>{sig}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

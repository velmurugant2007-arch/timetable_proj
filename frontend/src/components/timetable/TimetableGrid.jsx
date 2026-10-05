'use client';
import { Clock, AlertTriangle } from 'lucide-react';
import { PERIOD_LABELS, CELL_TONE, colorFor } from '@/lib/constants';

/** TimetableGrid — prototype lines 606-684 */
export default function TimetableGrid({ timetable, config, colorMap, editable, onEditCell, printRef }) {
  const { workingDays, periodsPerDay, breakAfter } = config;
  const rows = [];
  for (let p = 0; p < periodsPerDay; p++) {
    rows.push(p);
    if (p === breakAfter - 1) rows.push('BREAK');
  }

  return (
    <div ref={printRef} className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-mono-custom text-xs font-semibold uppercase tracking-wide text-slate-400">
              Time
            </th>
            {workingDays.map((d) => (
              <th key={d} className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center font-display text-xs font-bold uppercase tracking-wide text-slate-600">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) =>
            r === 'BREAK' ? (
              <tr key={'break-' + ri}>
                <td colSpan={workingDays.length + 1} className="border-b border-slate-200 bg-slate-100/80 px-3 py-2 text-center">
                  <span className="font-mono-custom text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    12:00 – 1:00 · Lunch Break
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={'p-' + r}>
                <td className="border-b border-r border-slate-200 bg-slate-50/60 px-3 py-3 align-top font-mono-custom text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-300" />
                    {PERIOD_LABELS[r] || `P${r + 1}`}
                  </div>
                </td>
                {workingDays.map((day, di) => {
                  const cell = timetable.grid[day]?.[r];
                  const tone = cell ? CELL_TONE[colorFor(cell.subjectId, colorMap)] : 'bg-white border-slate-100 text-slate-300';
                  const delay = Math.min((r * workingDays.length + di) * 12, 260);
                  return (
                    <td key={day + r} className="border-b border-slate-200 p-1.5 align-top">
                      <button
                        disabled={!editable}
                        onClick={() => onEditCell && onEditCell(day, r)}
                        style={{ animationDelay: `${delay}ms` }}
                        className={`cell-reflow flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition duration-150 ${tone} ${
                          editable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''
                        } ${cell?.conflict ? 'ring-2 ring-rose-400' : ''}`}
                      >
                        {cell ? (
                          <>
                            <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
                              {cell.conflict && <AlertTriangle size={12} className="shrink-0 text-rose-500" />}
                              {cell.code}
                            </span>
                            <span className="text-[11px] leading-tight opacity-80">{cell.name}</span>
                            <span className="mt-0.5 text-[11px] font-medium leading-tight opacity-70">{cell.facultyName}</span>
                          </>
                        ) : (
                          <span className="text-[11px] italic">Free</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

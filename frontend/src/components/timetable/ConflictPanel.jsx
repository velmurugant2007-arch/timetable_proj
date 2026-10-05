'use client';
import { ShieldCheck, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { PERIOD_LABELS } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import SecondaryButton from '@/components/ui/SecondaryButton';

/** ConflictPanel — prototype lines 542-584 */
export default function ConflictPanel({ conflicts, hoursOk, onResolve, resolving }) {
  const clean = !conflicts || conflicts.length === 0;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-700">
          <ShieldCheck size={16} className="text-indigo-500" /> Conflict Detection
        </h3>
        {clean ? <Badge tone="emerald">All clear</Badge> : <Badge tone="rose">{conflicts.length} issue{conflicts.length > 1 ? 's' : ''}</Badge>}
      </div>

      <ul className="space-y-2 text-sm">
        <li className={`flex items-center gap-2 ${clean ? 'text-emerald-700' : 'text-rose-700'}`}>
          {clean ? <Check size={15} /> : <AlertTriangle size={15} />}
          {clean ? 'No faculty conflicts' : 'Faculty conflict detected'}
        </li>
        <li className="flex items-center gap-2 text-emerald-700">
          <Check size={15} /> No section conflicts
        </li>
        <li className={`flex items-center gap-2 ${hoursOk === false ? 'text-amber-700' : 'text-emerald-700'}`}>
          {hoursOk === false ? <AlertTriangle size={15} /> : <Check size={15} />}
          {hoursOk === false ? 'Some subject hours could not be fully allocated' : 'All required subject hours allocated'}
        </li>
      </ul>

      {!clean && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {conflicts.slice(0, 4).map((c, i) => (
            <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <span className="font-semibold">{c.facultyName}</span> is already teaching elsewhere on{' '}
              <span className="font-semibold">{c.day}</span> at{' '}
              <span className="font-semibold">{PERIOD_LABELS[c.period] || `Period ${c.period + 1}`}</span>{' '}
              — conflicts with <span className="font-semibold">{c.subjectCode}</span>.
            </div>
          ))}
          <SecondaryButton icon={RefreshCw} onClick={onResolve} disabled={resolving} className="w-full !border-rose-200 !text-rose-700 hover:!bg-rose-50">
            {resolving ? 'Resolving…' : 'Resolve Automatically'}
          </SecondaryButton>
        </div>
      )}
    </Card>
  );
}

'use client';
import { Sparkles, CircleCheck } from 'lucide-react';
import { GEN_STEPS } from '@/lib/constants';

/** GenerationOverlay — prototype lines 698-729 */
export default function GenerationOverlay({ step }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl animate-[popIn_.2s_ease]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <Sparkles size={26} className="animate-pulse text-indigo-500" />
        </div>
        <p className="text-center font-display text-base font-bold text-slate-800">Generating Timetable</p>
        <div className="mt-5 space-y-3">
          {GEN_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              {i < step ? (
                <CircleCheck size={16} className="shrink-0 text-emerald-500" />
              ) : i === step ? (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />
              )}
              <span className={i <= step ? 'font-medium text-slate-700' : 'text-slate-400'}>{s}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
            style={{ width: `${(Math.min(step, GEN_STEPS.length) / GEN_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

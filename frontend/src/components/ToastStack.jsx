'use client';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/** ToastStack — prototype lines 287-310 */
export default function ToastStack() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg animate-[slideUp_.2s_ease] ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : t.type === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-indigo-200 bg-indigo-50 text-indigo-800'
          }`}
        >
          {t.type === 'success' ? <CircleCheck size={17} className="mt-0.5 shrink-0" /> : <TriangleAlert size={17} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium leading-snug">{t.msg}</span>
          <button onClick={() => removeToast(t.id)} className="ml-auto text-current opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

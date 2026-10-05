import { Menu } from 'lucide-react';

/** TopBar — prototype lines 522-536 */
export default function TopBar({ title, subtitle }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

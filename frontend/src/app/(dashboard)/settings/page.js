'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Select from '@/components/ui/Select';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { settingsApi } from '@/lib/api';
import { ALL_DAYS } from '@/lib/constants';

/** Settings — prototype SettingsScreen lines 1888-1967 */
export default function SettingsPage() {
  const { config, setConfig, addToast, setStaleKeys, timetables } = useApp();
  const [local, setLocal] = useState(config);

  const toggleDay = (d) => {
    setLocal((c) => ({
      ...c,
      workingDays: c.workingDays.includes(d) ? c.workingDays.filter((x) => x !== d) : [...c.workingDays, d].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)),
    }));
  };

  async function save() {
    try {
      await settingsApi.update(local);
      setConfig(local);
      setStaleKeys(new Set(Object.keys(timetables)));
      addToast('Settings saved. Existing timetables marked for regeneration.', 'success');
    } catch (err) {
      addToast('Failed to save settings', 'warning');
    }
  }

  return (
    <div className="page-enter">
      <TopBar title="Settings" subtitle="Global scheduling defaults" />
      <div className="max-w-xl divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="rise-in flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-slate-700">Working Days</p>
            <p className="text-xs text-slate-400">Which days the engine may schedule classes on</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((d) => {
              const on = local.workingDays.includes(d);
              return (
                <button key={d} onClick={() => toggleDay(d)} className={`relative h-7 w-7 rounded-full text-[10px] font-bold transition-all duration-200 ${
                  on ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}>{d.slice(0, 2)}</button>
              );
            })}
          </div>
        </div>
        <div className="rise-in flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{ animationDelay: '60ms' }}>
          <div>
            <p className="text-sm font-semibold text-slate-700">Periods per Day</p>
            <p className="text-xs text-slate-400">Teaching periods, excluding the lunch break</p>
          </div>
          <div className="max-w-[160px]">
            <Select value={String(local.periodsPerDay)} onChange={(v) => setLocal((c) => ({ ...c, periodsPerDay: Number(v) }))} options={[4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} periods` }))} />
          </div>
        </div>
        <div className="rise-in flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{ animationDelay: '120ms' }}>
          <div>
            <p className="text-sm font-semibold text-slate-700">Break After Period</p>
            <p className="text-xs text-slate-400">Where the lunch break is inserted</p>
          </div>
          <div className="max-w-[160px]">
            <Select value={String(local.breakAfter)} onChange={(v) => setLocal((c) => ({ ...c, breakAfter: Number(v) }))} options={Array.from({ length: local.periodsPerDay }, (_, i) => i + 1).map((n) => ({ value: String(n), label: `After period ${n}` }))} />
          </div>
        </div>
        <div className="flex justify-end px-6 py-5">
          <PrimaryButton icon={Check} onClick={save}>Save Settings</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

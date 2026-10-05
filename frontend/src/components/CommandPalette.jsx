'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { CalendarDays, BookOpen, UserCheck } from 'lucide-react';
import { NAV, sectionKey } from '@/lib/constants';
import { useApp } from '@/context/AppContext';

/** CommandPalette — prototype lines 348-444, adapted for Next.js routing */
export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();
  const { allSectionOptions, timetables, faculty, subjects, setActiveKey, setGenYear, setGenSection, setSelectedFacultyId } = useApp();

  useEffect(() => {
    if (open) {
      setQ('');
      setHi(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(() => {
    const list = [];
    NAV.forEach((n) =>
      list.push({ id: 'nav-' + n.key, group: 'Go to', label: n.label, icon: n.icon, kind: 'nav', href: n.href })
    );
    allSectionOptions.forEach(({ year, section }) => {
      const key = sectionKey(year, section);
      const has = !!timetables[key];
      list.push({
        id: 'sec-' + key, group: 'Sections', label: `${year} · Section ${section}`,
        icon: CalendarDays, hint: has ? 'View timetable' : 'Generate',
        kind: 'section', year, section,
      });
    });
    faculty.forEach((f) =>
      list.push({ id: 'fac-' + f.id, group: 'Faculty', label: f.name, icon: UserCheck, hint: 'View schedule', kind: 'faculty', facultyId: f.id })
    );
    subjects.forEach((s) =>
      list.push({ id: 'sub-' + s.id, group: 'Subjects', label: `${s.code} · ${s.name}`, icon: BookOpen, hint: `${s.year} ${s.section}`, kind: 'subject', data: s })
    );
    return list;
  }, [allSectionOptions, timetables, faculty, subjects]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) => it.label.toLowerCase().includes(term) || it.group.toLowerCase().includes(term)
    );
  }, [q, items]);

  useEffect(() => setHi(0), [q]);

  if (!open) return null;

  function handleRun(it) {
    if (it.kind === 'nav') router.push(it.href);
    else if (it.kind === 'section') {
      setGenYear(it.year);
      setGenSection(it.section);
      const key = sectionKey(it.year, it.section);
      if (timetables[key]) {
        setActiveKey(key);
        router.push('/timetables');
      } else {
        router.push('/generate');
      }
    } else if (it.kind === 'faculty') {
      setSelectedFacultyId(it.facultyId);
      router.push('/faculty-schedule');
    } else if (it.kind === 'subject') {
      router.push('/subjects');
    }
    onClose();
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hi]) handleRun(filtered[hi]); }
    else if (e.key === 'Escape') { onClose(); }
  }

  let lastGroup = null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm animate-[fadeIn_.12s_ease]" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[popIn_.16s_cubic-bezier(.16,1,.3,1)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Jump to a section, subject, faculty, or screen…"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No matches.</p>}
          {filtered.map((it, i) => {
            const showGroup = it.group !== lastGroup;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <div key={it.id}>
                {showGroup && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:pt-1">{it.group}</p>
                )}
                <button
                  onMouseEnter={() => setHi(i)}
                  onClick={() => handleRun(it)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                    i === hi ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                  }`}
                >
                  <Icon size={15} className={i === hi ? 'text-indigo-500' : 'text-slate-400'} />
                  <span className="font-medium">{it.label}</span>
                  {it.hint && <span className="ml-auto text-xs text-slate-400">{it.hint}</span>}
                  {i === hi && <CornerDownLeft size={13} className="text-indigo-400" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

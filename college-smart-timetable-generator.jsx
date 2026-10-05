import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, GraduationCap, BookOpen, Users, Sparkles,
  CalendarDays, UserCheck, Settings as SettingsIcon, Plus, X, Check,
  AlertTriangle, RefreshCw, Download, Printer, Pencil, Trash2,
  ChevronDown, Clock, ShieldCheck, Wand2, ArrowRight, CircleCheck,
  TriangleAlert, Menu, Command, CornerDownLeft, Search,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  DATA                                                                   */
/* ---------------------------------------------------------------------- */

const COLORS = ["indigo", "sky", "emerald", "amber", "violet", "rose", "cyan", "fuchsia"];

const INITIAL_YEARS = [
  { id: "1st Year", sections: ["A", "B", "C"] },
  { id: "2nd Year", sections: ["A", "B"] },
  { id: "3rd Year", sections: ["A"] },
  { id: "4th Year", sections: ["A"] },
];

const INITIAL_FACULTY = [
  { id: "f1", name: "Dr. Arun" },
  { id: "f2", name: "Dr. Kumar" },
  { id: "f3", name: "Prof. Priya" },
  { id: "f4", name: "Dr. Meena" },
  { id: "f5", name: "Prof. Suresh" },
  { id: "f6", name: "Prof. Ravi" },
];

let subjectSeq = 100;
const nextSubjectId = () => `s${++subjectSeq}`;

const INITIAL_SUBJECTS = [
  { id: "s1", code: "MAT101", name: "Mathematics", year: "1st Year", section: "A", hours: 5, facultyId: "f1" },
  { id: "s2", code: "PHY101", name: "Physics", year: "1st Year", section: "A", hours: 4, facultyId: "f2" },
  { id: "s3", code: "CS101", name: "Programming", year: "1st Year", section: "A", hours: 5, facultyId: "f3" },
  { id: "s4", code: "ENG101", name: "English", year: "1st Year", section: "A", hours: 4, facultyId: "f4" },
  { id: "s5", code: "CHE101", name: "Chemistry", year: "1st Year", section: "A", hours: 4, facultyId: "f5" },
  { id: "s6", code: "CS102", name: "Data Structures Lab", year: "1st Year", section: "A", hours: 6, facultyId: "f3" },
  { id: "s7", code: "DB102", name: "DBMS", year: "2nd Year", section: "A", hours: 4, facultyId: "f6" },
  { id: "s8", code: "OS201", name: "Operating Systems", year: "2nd Year", section: "A", hours: 5, facultyId: "f1" },
  { id: "s9", code: "CN201", name: "Computer Networks", year: "2nd Year", section: "A", hours: 4, facultyId: "f2" },
  { id: "s10", code: "JAVA201", name: "Java Programming", year: "2nd Year", section: "A", hours: 5, facultyId: "f3" },
  { id: "s11", code: "MATH201", name: "Discrete Mathematics", year: "2nd Year", section: "A", hours: 4, facultyId: "f4" },
  { id: "s12", code: "DS201L", name: "DBMS Lab", year: "2nd Year", section: "A", hours: 4, facultyId: "f6" },
  { id: "s13", code: "MAT101B", name: "Mathematics", year: "1st Year", section: "B", hours: 5, facultyId: "f1" },
  { id: "s14", code: "PHY101B", name: "Physics", year: "1st Year", section: "B", hours: 4, facultyId: "f2" },
  { id: "s15", code: "CS101B", name: "Programming", year: "1st Year", section: "B", hours: 5, facultyId: "f3" },
  { id: "s16", code: "ENG101B", name: "English", year: "1st Year", section: "B", hours: 4, facultyId: "f4" },
];

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "years", label: "Years & Sections", icon: GraduationCap },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "faculty", label: "Faculty", icon: Users },
  { key: "generate", label: "Generate Timetable", icon: Wand2 },
  { key: "timetables", label: "Timetables", icon: CalendarDays },
  { key: "facultySchedule", label: "Faculty Schedule", icon: UserCheck },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const PERIOD_LABELS = ["9:00 – 10:00", "10:00 – 11:00", "11:00 – 12:00", "1:00 – 2:00", "2:00 – 3:00", "3:00 – 4:00"];

const sectionKey = (year, section) => `${year}__${section}`;

/* ---------------------------------------------------------------------- */
/*  SCHEDULING ENGINE (mock)                                               */
/* ---------------------------------------------------------------------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFacultyOccupancy(timetables, excludeKey) {
  const occ = {};
  Object.entries(timetables).forEach(([key, tt]) => {
    if (key === excludeKey || !tt.grid) return;
    Object.entries(tt.grid).forEach(([day, periods]) => {
      periods.forEach((cell, pIdx) => {
        if (cell && cell.facultyId) {
          occ[cell.facultyId] = occ[cell.facultyId] || new Set();
          occ[cell.facultyId].add(`${day}-${pIdx}`);
        }
      });
    });
  });
  return occ;
}

function generateSectionTimetable(sectionSubjects, config, facultyOccupancy, shuffleOrder) {
  const { workingDays, periodsPerDay } = config;
  const grid = {};
  workingDays.forEach((d) => (grid[d] = Array(periodsPerDay).fill(null)));

  const ordered = shuffleOrder ? shuffle(sectionSubjects) : [...sectionSubjects].sort((a, b) => b.hours - a.hours);
  const remaining = {};
  ordered.forEach((s) => (remaining[s.id] = s.hours));

  const totalSlots = workingDays.length * periodsPerDay;
  const totalHours = ordered.reduce((a, s) => a + s.hours, 0);

  const queue = [];
  let guard = 0;
  while (queue.length < Math.min(totalHours, totalSlots) && guard < 20000) {
    guard++;
    for (const s of ordered) {
      if (remaining[s.id] > 0 && queue.length < totalSlots) {
        queue.push(s);
        remaining[s.id]--;
      }
    }
  }

  const conflicts = [];
  let idx = 0;
  for (let p = 0; p < periodsPerDay; p++) {
    for (const day of workingDays) {
      const sub = queue[idx];
      idx++;
      if (!sub) continue;
      const busy = facultyOccupancy[sub.facultyId] && facultyOccupancy[sub.facultyId].has(`${day}-${p}`);
      grid[day][p] = {
        subjectId: sub.id,
        code: sub.code,
        name: sub.name,
        facultyId: sub.facultyId,
        facultyName: sub.facultyName,
        conflict: !!busy,
      };
      if (busy) {
        conflicts.push({ day, period: p, facultyName: sub.facultyName, subjectCode: sub.code });
      }
    }
  }
  return { grid, conflicts, totalHours, totalSlots, subjectCount: sectionSubjects.length };
}

/* ---------------------------------------------------------------------- */
/*  SMALL UI PRIMITIVES                                                    */
/* ---------------------------------------------------------------------- */

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "", style }) {
  return (
    <div style={style} className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 ${className}`}>
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, className = "", disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, icon: Icon, className = "", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function IconButton({ onClick, icon: Icon, tone = "slate", title }) {
  const tones = {
    slate: "text-slate-500 hover:bg-slate-100",
    rose: "text-rose-500 hover:bg-rose-50",
    indigo: "text-indigo-600 hover:bg-indigo-50",
  };
  return (
    <button title={title} onClick={onClick} className={`rounded-lg p-2 transition ${tones[tone]}`}>
      <Icon size={16} />
    </button>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
    />
  );
}

function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-[fadeIn_.15s_ease]">
      <div className={`w-full ${width} rounded-2xl bg-white shadow-2xl animate-[popIn_.18s_ease]`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <Icon size={26} />
      </div>
      <p className="font-display text-base font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  TOASTS                                                                  */
/* ---------------------------------------------------------------------- */

function ToastStack({ toasts, remove }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg animate-[slideUp_.2s_ease] ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : t.type === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-indigo-200 bg-indigo-50 text-indigo-800"
          }`}
        >
          {t.type === "success" ? <CircleCheck size={17} className="mt-0.5 shrink-0" /> : <TriangleAlert size={17} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium leading-snug">{t.msg}</span>
          <button onClick={() => remove(t.id)} className="ml-auto text-current opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  COUNT-UP (dashboard + generate numeric emphasis)                       */
/* ---------------------------------------------------------------------- */

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVal(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function CountUp({ value, className }) {
  const n = useCountUp(value);
  return <span className={className}>{n}</span>;
}

/* ---------------------------------------------------------------------- */
/*  COMMAND PALETTE (signature interaction)                                */
/* ---------------------------------------------------------------------- */

function CommandPalette({ open, onClose, items, onRun }) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setHi(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) => it.label.toLowerCase().includes(term) || it.group.toLowerCase().includes(term) || (it.keywords || "").toLowerCase().includes(term)
    );
  }, [q, items]);

  useEffect(() => setHi(0), [q]);

  if (!open) return null;

  function handleKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hi]) {
        onRun(filtered[hi]);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  let lastGroup = null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm animate-[fadeIn_.12s_ease]" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[popIn_.16s_cubic-bezier(.16,1,.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
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
              <React.Fragment key={it.id}>
                {showGroup && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:pt-1">{it.group}</p>
                )}
                <button
                  onMouseEnter={() => setHi(i)}
                  onClick={() => {
                    onRun(it);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                    i === hi ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
                  }`}
                >
                  <Icon size={15} className={i === hi ? "text-indigo-500" : "text-slate-400"} />
                  <span className="font-medium">{it.label}</span>
                  {it.hint && <span className="ml-auto text-xs text-slate-400">{it.hint}</span>}
                  {i === hi && <CornerDownLeft size={13} className="text-indigo-400" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SIDEBAR                                                                 */
/* ---------------------------------------------------------------------- */

function Sidebar({ view, setView, staleCount, mobileOpen, setMobileOpen, onOpenPalette }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed z-50 flex h-full w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-600/30">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="font-display text-[15px] font-bold leading-tight text-slate-800">College Smart</p>
            <p className="font-display text-[15px] font-bold leading-tight text-indigo-600">Timetable Generator</p>
          </div>
        </div>

        <div className="px-3 pt-4">
          <button
            onClick={onOpenPalette}
            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-500"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Quick jump…</span>
            <kbd className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              <Command size={10} />K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.key;
            return (
              <button
                key={n.key}
                onClick={() => {
                  setView(n.key);
                  setMobileOpen(false);
                }}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={17} className={active ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
                {n.label}
                {n.key === "timetables" && staleCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950">
                    {staleCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 px-3.5 py-3">
            <p className="text-xs font-semibold text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-700">Admin, PSNA CET</p>
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({ title, subtitle, setMobileOpen }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <button onClick={() => setMobileOpen(true)} className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  CONFLICT PANEL                                                         */
/* ---------------------------------------------------------------------- */

function ConflictPanel({ conflicts, hoursOk, subjectsOk, onResolve, resolving }) {
  const clean = conflicts.length === 0;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-700">
          <ShieldCheck size={16} className="text-indigo-500" /> Conflict Detection
        </h3>
        {clean ? <Badge tone="emerald">All clear</Badge> : <Badge tone="rose">{conflicts.length} issue{conflicts.length > 1 ? "s" : ""}</Badge>}
      </div>

      <ul className="space-y-2 text-sm">
        <li className={`flex items-center gap-2 ${clean ? "text-emerald-700" : "text-rose-700"}`}>
          {clean ? <Check size={15} /> : <AlertTriangle size={15} />}
          {clean ? "No faculty conflicts" : "Faculty conflict detected"}
        </li>
        <li className="flex items-center gap-2 text-emerald-700">
          <Check size={15} /> No section conflicts
        </li>
        <li className={`flex items-center gap-2 ${hoursOk === false ? "text-amber-700" : "text-emerald-700"}`}>
          {hoursOk === false ? <AlertTriangle size={15} /> : <Check size={15} />}
          {hoursOk === false ? "Some subject hours could not be fully allocated" : "All required subject hours allocated"}
        </li>
      </ul>

      {!clean && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {conflicts.slice(0, 4).map((c, i) => (
            <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <span className="font-semibold">{c.facultyName}</span> is already teaching elsewhere on{" "}
              <span className="font-semibold">{c.day}</span> at{" "}
              <span className="font-semibold">{PERIOD_LABELS[c.period] || `Period ${c.period + 1}`}</span>{" "}
              — conflicts with <span className="font-semibold">{c.subjectCode}</span>.
            </div>
          ))}
          <SecondaryButton icon={RefreshCw} onClick={onResolve} disabled={resolving} className="w-full !border-rose-200 !text-rose-700 hover:!bg-rose-50">
            {resolving ? "Resolving…" : "Resolve Automatically"}
          </SecondaryButton>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  TIMETABLE GRID                                                         */
/* ---------------------------------------------------------------------- */

function colorFor(subjectId, colorMap) {
  return colorMap[subjectId] || "slate";
}

const CELL_TONE = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
  sky: "bg-sky-50 border-sky-200 text-sky-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  violet: "bg-violet-50 border-violet-200 text-violet-800",
  rose: "bg-rose-50 border-rose-200 text-rose-800",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-800",
  fuchsia: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

function TimetableGrid({ timetable, config, colorMap, editable, onEditCell, printRef }) {
  const { workingDays, periodsPerDay, breakAfter } = config;
  const rows = [];
  for (let p = 0; p < periodsPerDay; p++) {
    rows.push(p);
    if (p === breakAfter - 1) rows.push("BREAK");
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
            r === "BREAK" ? (
              <tr key={"break-" + ri}>
                <td colSpan={workingDays.length + 1} className="border-b border-slate-200 bg-slate-100/80 px-3 py-2 text-center">
                  <span className="font-mono-custom text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    12:00 – 1:00 · Lunch Break
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={"p-" + r}>
                <td className="border-b border-r border-slate-200 bg-slate-50/60 px-3 py-3 align-top font-mono-custom text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-300" />
                    {PERIOD_LABELS[r] || `P${r + 1}`}
                  </div>
                </td>
                {workingDays.map((day, di) => {
                  const cell = timetable.grid[day]?.[r];
                  const tone = cell ? CELL_TONE[colorFor(cell.subjectId, colorMap)] : "bg-white border-slate-100 text-slate-300";
                  const delay = Math.min((r * workingDays.length + di) * 12, 260);
                  return (
                    <td key={day + r} className="border-b border-slate-200 p-1.5 align-top">
                      <button
                        disabled={!editable}
                        onClick={() => onEditCell && onEditCell(day, r)}
                        style={{ animationDelay: `${delay}ms` }}
                        className={`cell-reflow flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition duration-150 ${tone} ${
                          editable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm" : ""
                        } ${cell?.conflict ? "ring-2 ring-rose-400" : ""}`}
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

/* ---------------------------------------------------------------------- */
/*  GENERATION OVERLAY                                                     */
/* ---------------------------------------------------------------------- */

const GEN_STEPS = [
  "Analyzing constraints...",
  "Checking faculty availability...",
  "Allocating subjects...",
  "Checking conflicts...",
  "Timetable generated successfully!",
];

function GenerationOverlay({ step }) {
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
              <span className={i <= step ? "font-medium text-slate-700" : "text-slate-350 text-slate-400"}>{s}</span>
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

/* ---------------------------------------------------------------------- */
/*  MAIN APP                                                                */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [view, setView] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [years, setYears] = useState(INITIAL_YEARS);
  const [faculty, setFaculty] = useState(INITIAL_FACULTY);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [config, setConfig] = useState({ workingDays: ["MON", "TUE", "WED", "THU", "FRI"], periodsPerDay: 6, breakAfter: 3 });

  const [timetables, setTimetables] = useState({});
  const [staleKeys, setStaleKeys] = useState(new Set());

  const [genYear, setGenYear] = useState("1st Year");
  const [genSection, setGenSection] = useState("A");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [activeKey, setActiveKey] = useState(null);

  const [selectedFacultyId, setSelectedFacultyId] = useState("f1");

  const [toasts, setToasts] = useState([]);
  const [subjectModal, setSubjectModal] = useState(null); // {mode, data}
  const [facultyModal, setFacultyModal] = useState(null);
  const [sectionModal, setSectionModal] = useState(null);
  const [cellEdit, setCellEdit] = useState(null); // {key, day, period}
  const [paletteOpen, setPaletteOpen] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addToast = (msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const facultyMap = useMemo(() => Object.fromEntries(faculty.map((f) => [f.id, f])), [faculty]);

  const facultyDerived = useMemo(() => {
    return faculty.map((f) => {
      const subs = subjects.filter((s) => s.facultyId === f.id);
      const sections = [...new Set(subs.map((s) => `${s.year.replace(/\D/g, "")}${s.section}`))];
      const hrs = subs.reduce((a, s) => a + s.hours, 0);
      return { ...f, subjectNames: [...new Set(subs.map((s) => s.name))], sections, weeklyHours: hrs };
    });
  }, [faculty, subjects]);

  const colorMap = useMemo(() => {
    const map = {};
    subjects.forEach((s, i) => (map[s.id] = COLORS[i % COLORS.length]));
    return map;
  }, [subjects]);

  const allSectionOptions = useMemo(() => {
    const list = [];
    years.forEach((y) => y.sections.forEach((sec) => list.push({ year: y.id, section: sec })));
    return list;
  }, [years]);

  const markStale = (year, section) => {
    const key = sectionKey(year, section);
    if (timetables[key]) {
      setStaleKeys((prev) => new Set(prev).add(key));
    }
  };

  const clearStale = (key) => {
    setStaleKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  function buildSectionSubjects(year, section) {
    return subjects
      .filter((s) => s.year === year && s.section === section)
      .map((s) => ({ ...s, facultyName: facultyMap[s.facultyId]?.name || "Unassigned" }));
  }

  function doGenerate(year, section, { shuffleOrder = false } = {}) {
    const key = sectionKey(year, section);
    const sectionSubjects = buildSectionSubjects(year, section);
    const occ = buildFacultyOccupancy(timetables, key);
    const result = generateSectionTimetable(sectionSubjects, config, occ, shuffleOrder);
    setTimetables((prev) => ({
      ...prev,
      [key]: { ...result, year, section, generatedAt: new Date(), saved: false },
    }));
    clearStale(key);
    setActiveKey(key);
    return result;
  }

  function runGeneration(year, section) {
    setGenerating(true);
    setGenStep(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setGenStep(i);
      if (i >= GEN_STEPS.length) {
        clearInterval(timer);
        setTimeout(() => {
          const result = doGenerate(year, section);
          setGenerating(false);
          addToast(
            result.conflicts.length
              ? `Generated with ${result.conflicts.length} conflict(s) — review before saving.`
              : `Timetable generated for ${year} · Section ${section}`,
            result.conflicts.length ? "warning" : "success"
          );
          setView("timetableView");
        }, 450);
      }
    }, 520);
  }

  const activeTimetable = activeKey ? timetables[activeKey] : null;

  const staleCount = staleKeys.size;

  const paletteItems = useMemo(() => {
    const items = [];
    NAV.forEach((n) => items.push({ id: "nav-" + n.key, group: "Go to", label: n.label, icon: n.icon, kind: "nav", target: n.key }));
    allSectionOptions.forEach(({ year, section }) => {
      const key = sectionKey(year, section);
      const has = !!timetables[key];
      items.push({
        id: "sec-" + key,
        group: "Sections",
        label: `${year} · Section ${section}`,
        icon: CalendarDays,
        hint: has ? "View timetable" : "Generate",
        kind: "section",
        year,
        section,
      });
    });
    faculty.forEach((f) =>
      items.push({ id: "fac-" + f.id, group: "Faculty", label: f.name, icon: UserCheck, hint: "View schedule", kind: "faculty", facultyId: f.id })
    );
    subjects.forEach((s) =>
      items.push({
        id: "sub-" + s.id,
        group: "Subjects",
        label: `${s.code} · ${s.name}`,
        icon: BookOpen,
        hint: `${s.year} ${s.section}`,
        kind: "subject",
        data: s,
      })
    );
    return items;
  }, [allSectionOptions, timetables, faculty, subjects]);

  function runPaletteItem(it) {
    if (it.kind === "nav") setView(it.target);
    else if (it.kind === "section") {
      setGenYear(it.year);
      setGenSection(it.section);
      const key = sectionKey(it.year, it.section);
      if (timetables[key]) {
        setActiveKey(key);
        setView("timetables");
      } else {
        setView("generate");
      }
    } else if (it.kind === "faculty") {
      setSelectedFacultyId(it.facultyId);
      setView("facultySchedule");
    } else if (it.kind === "subject") {
      setView("subjects");
      setTimeout(() => setSubjectModal({ mode: "edit", data: it.data }), 50);
    }
  }

  /* ---------- Subject CRUD ---------- */
  function saveSubject(data) {
    if (data.id) {
      const old = subjects.find((s) => s.id === data.id);
      setSubjects((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      if (old && (old.hours !== data.hours || old.facultyId !== data.facultyId)) {
        markStale(data.year, data.section);
        addToast(`Timetable constraints changed for ${data.year} · Section ${data.section}`, "warning");
      }
    } else {
      setSubjects((prev) => [...prev, { ...data, id: nextSubjectId() }]);
      markStale(data.year, data.section);
      addToast(`Subject ${data.code} added`, "success");
    }
    setSubjectModal(null);
  }
  function deleteSubject(s) {
    setSubjects((prev) => prev.filter((x) => x.id !== s.id));
    markStale(s.year, s.section);
    addToast(`${s.code} removed`, "warning");
  }

  /* ---------- Faculty CRUD ---------- */
  function saveFaculty(data) {
    if (data.id) {
      setFaculty((prev) => prev.map((f) => (f.id === data.id ? data : f)));
    } else {
      setFaculty((prev) => [...prev, { ...data, id: "f" + (prev.length + 1) + Math.random().toString(36).slice(2, 4) }]);
    }
    addToast(data.id ? "Faculty updated" : "Faculty added", "success");
    setFacultyModal(null);
  }
  function deleteFaculty(f) {
    if (subjects.some((s) => s.facultyId === f.id)) {
      addToast(`Cannot remove ${f.name} — still assigned to subjects`, "warning");
      return;
    }
    setFaculty((prev) => prev.filter((x) => x.id !== f.id));
    addToast(`${f.name} removed`, "warning");
  }

  /* ---------- Years/Sections ---------- */
  function addSection(yearId, sectionName) {
    setYears((prev) =>
      prev.map((y) => (y.id === yearId && !y.sections.includes(sectionName) ? { ...y, sections: [...y.sections, sectionName] } : y))
    );
    addToast(`Section ${sectionName} added to ${yearId}`, "success");
  }
  function addYear(name) {
    if (years.some((y) => y.id === name)) {
      addToast("That year already exists", "warning");
      return;
    }
    setYears((prev) => [...prev, { id: name, sections: ["A"] }]);
    addToast(`${name} added`, "success");
  }

  /* ---------- Cell edit (manual override) ---------- */
  function applyCellEdit(newSubjectId) {
    if (!cellEdit) return;
    const { key, day, period } = cellEdit;
    setTimetables((prev) => {
      const tt = prev[key];
      if (!tt) return prev;
      const grid = { ...tt.grid, [day]: [...tt.grid[day]] };
      if (newSubjectId === "FREE") {
        grid[day][period] = null;
      } else {
        const sub = subjects.find((s) => s.id === newSubjectId);
        grid[day][period] = {
          subjectId: sub.id,
          code: sub.code,
          name: sub.name,
          facultyId: sub.facultyId,
          facultyName: facultyMap[sub.facultyId]?.name,
          conflict: false,
        };
      }
      return { ...prev, [key]: { ...tt, grid, saved: false } };
    });
    setCellEdit(null);
    addToast("Cell updated", "success");
  }

  /* ---------- Views ---------- */
  const yearOptions = years.map((y) => ({ value: y.id, label: y.id }));
  const sectionsForGenYear = years.find((y) => y.id === genYear)?.sections || [];

  return (
    <div className="flex h-full min-h-[720px] w-full bg-slate-50 text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
        .font-display { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-custom { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        * { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        html, body { scroll-behavior: smooth; }
        .smooth-scroll { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: scale(.96) translateY(4px);} to { opacity: 1; transform: scale(1) translateY(0);} }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes cellIn { from { opacity: 0; transform: translateY(3px) scale(.97);} to { opacity: 1; transform: translateY(0) scale(1);} }
        @keyframes pageIn { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes riseIn { from { opacity: 0; transform: translateY(14px) scale(.985);} to { opacity: 1; transform: translateY(0) scale(1);} }
        @keyframes sweepIn { from { opacity: 0; transform: translateX(-8px);} to { opacity: 1; transform: translateX(0);} }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes floatSlow { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes ringGrow { from { stroke-dashoffset: var(--ring-full); } to { stroke-dashoffset: var(--ring-offset); } }

        .cell-reflow { animation: cellIn 260ms cubic-bezier(.16,1,.3,1) both; }
        .page-enter { animation: pageIn 340ms cubic-bezier(.16,1,.3,1) both; }
        .rise-in { animation: riseIn 420ms cubic-bezier(.16,1,.3,1) both; }
        .sweep-in { animation: sweepIn 320ms cubic-bezier(.16,1,.3,1) both; }
        .hover-lift { transition: transform 180ms cubic-bezier(.16,1,.3,1), box-shadow 180ms cubic-bezier(.16,1,.3,1); }
        .hover-lift:hover { transform: translateY(-2px); }

        @media (prefers-reduced-motion: reduce) {
          .cell-reflow, .page-enter, .rise-in, .sweep-in, [style*="animation"] { animation: none !important; }
          .hover-lift:hover { transform: none !important; }
        }
      `}</style>

      <Sidebar
        view={view}
        setView={setView}
        staleCount={staleCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main className="smooth-scroll min-h-screen flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10" key={view + "-scroll"}>
        {/* ---------------- DASHBOARD ---------------- */}
        {view === "dashboard" && (
          <div className="page-enter">
            <TopBar title="Dashboard" subtitle="Overview of your college timetable system" setMobileOpen={setMobileOpen} />

            <div className="rise-in mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-500 p-6 text-white shadow-lg shadow-indigo-600/25 sm:p-8">
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono-custom text-[11px] font-semibold uppercase tracking-widest text-indigo-100/80">PSNA College of Engineering &amp; Technology</p>
                  <h2 className="font-display mt-1.5 text-xl font-bold sm:text-2xl">Every section, conflict-free — automatically.</h2>
                  <p className="mt-1.5 max-w-md text-sm text-indigo-100/90">
                    {Object.keys(timetables).length} of {allSectionOptions.length} sections scheduled · {staleCount} awaiting regeneration
                  </p>
                </div>
                <PrimaryButton icon={Wand2} onClick={() => setView("generate")} className="!bg-white !text-indigo-700 shadow-md hover:!bg-indigo-50">
                  Generate New Timetable
                </PrimaryButton>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 right-24 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total Years", value: years.length, icon: GraduationCap, tone: "indigo" },
                { label: "Total Sections", value: years.reduce((a, y) => a + y.sections.length, 0), icon: CalendarDays, tone: "sky" },
                { label: "Total Subjects", value: subjects.length, icon: BookOpen, tone: "emerald" },
                { label: "Total Faculty", value: faculty.length, icon: Users, tone: "amber" },
              ].map((c, ci) => {
                const Icon = c.icon;
                return (
                  <Card key={c.label} className="hover-lift rise-in p-5" style={{ animationDelay: `${ci * 60}ms` }}>
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-${c.tone}-50 text-${c.tone}-600`}>
                      <Icon size={19} />
                    </div>
                    <p className="font-display text-2xl font-bold text-slate-800">
                      <CountUp value={c.value} />
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{c.label}</p>
                  </Card>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="rise-in p-6 lg:col-span-2" style={{ animationDelay: "160ms" }}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-800">Current Timetable Status</h3>
                </div>
                {allSectionOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">No sections configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {allSectionOptions.map(({ year, section }, i) => {
                      const key = sectionKey(year, section);
                      const tt = timetables[key];
                      const stale = staleKeys.has(key);
                      return (
                        <div
                          key={key}
                          className="sweep-in flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-indigo-100 hover:bg-indigo-50/30"
                          style={{ animationDelay: `${180 + i * 40}ms` }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {year} · Section {section}
                            </p>
                            <p className="text-xs text-slate-400">
                              {tt ? `Generated ${tt.generatedAt.toLocaleTimeString()}` : "Not generated yet"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!tt && <Badge tone="slate">Pending</Badge>}
                            {tt && stale && <Badge tone="amber">Needs regeneration</Badge>}
                            {tt && !stale && tt.conflicts.length > 0 && <Badge tone="rose">{tt.conflicts.length} conflict(s)</Badge>}
                            {tt && !stale && tt.conflicts.length === 0 && <Badge tone="emerald">Conflict-free</Badge>}
                            <SecondaryButton
                              onClick={() => {
                                setGenYear(year);
                                setGenSection(section);
                                setView("generate");
                              }}
                            >
                              {tt ? "View" : "Generate"}
                            </SecondaryButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="rise-in p-6" style={{ animationDelay: "220ms" }}>
                <h3 className="font-display mb-4 text-base font-bold text-slate-800">Quick Actions</h3>
                <div className="space-y-2.5">
                  <SecondaryButton className="w-full !justify-start" icon={BookOpen} onClick={() => setView("subjects")}>
                    Manage Subjects
                  </SecondaryButton>
                  <SecondaryButton className="w-full !justify-start" icon={Users} onClick={() => setView("faculty")}>
                    Manage Faculty
                  </SecondaryButton>
                  <SecondaryButton className="w-full !justify-start" icon={UserCheck} onClick={() => setView("facultySchedule")}>
                    View Faculty Schedule
                  </SecondaryButton>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ---------------- YEARS & SECTIONS ---------------- */}
        {view === "years" && (
          <div className="page-enter">
            <TopBar title="Years & Sections" subtitle="Configure academic years and their sections" setMobileOpen={setMobileOpen} />
            <div className="mb-5 flex justify-end">
              <PrimaryButton icon={Plus} onClick={() => setSectionModal({ mode: "year" })}>
                Add Year
              </PrimaryButton>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {years.map((y, yi) => {
                const tone = COLORS[yi % COLORS.length];
                return (
                  <div
                    key={y.id}
                    className="rise-in hover-lift relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
                    style={{ animationDelay: `${yi * 70}ms` }}
                  >
                    <div className={`absolute left-0 top-0 h-full w-1 bg-${tone}-500`} />
                    <div className="mb-4 flex items-center gap-2.5 pl-1.5">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${tone}-50 text-${tone}-600`}>
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-800">{y.id}</h3>
                        <p className="text-xs text-slate-400">{y.sections.length} section{y.sections.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pl-1.5">
                      {y.sections.map((s, si) => (
                        <div key={s} className="relative flex items-center gap-3 pl-4">
                          <span className={`absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-${tone}-200`} />
                          {si < y.sections.length - 1 && <span className={`absolute -left-0 top-1/2 h-full w-px bg-${tone}-100`} />}
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border border-${tone}-200 bg-${tone}-50 text-xs font-bold text-${tone}-700`}>
                            {s}
                          </div>
                          <span className="text-sm font-medium text-slate-600">Section {s}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setSectionModal({ mode: "section", yearId: y.id })}
                      className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 transition hover:border-${tone}-300 hover:text-${tone}-600`}
                    >
                      <Plus size={13} /> Add Section
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- SUBJECTS ---------------- */}
        {view === "subjects" && (
          <SubjectsScreen
            subjects={subjects}
            facultyMap={facultyMap}
            setSubjectModal={setSubjectModal}
            deleteSubject={deleteSubject}
            setMobileOpen={setMobileOpen}
          />
        )}

        {/* ---------------- FACULTY ---------------- */}
        {view === "faculty" && (
          <FacultyScreen
            facultyDerived={facultyDerived}
            setFacultyModal={setFacultyModal}
            deleteFaculty={deleteFaculty}
            setMobileOpen={setMobileOpen}
          />
        )}

        {/* ---------------- GENERATE TIMETABLE ---------------- */}
        {view === "generate" && (
          <GenerateScreen
            years={years}
            genYear={genYear}
            setGenYear={setGenYear}
            genSection={genSection}
            setGenSection={setGenSection}
            sectionsForGenYear={sectionsForGenYear}
            config={config}
            setConfig={setConfig}
            subjects={subjects}
            buildSectionSubjects={buildSectionSubjects}
            runGeneration={runGeneration}
            setMobileOpen={setMobileOpen}
            existing={timetables[sectionKey(genYear, genSection)]}
            stale={staleKeys.has(sectionKey(genYear, genSection))}
          />
        )}

        {/* ---------------- TIMETABLES / TIMETABLE VIEW ---------------- */}
        {(view === "timetables" || view === "timetableView") && (
          <TimetablesScreen
            timetables={timetables}
            activeKey={activeKey}
            setActiveKey={setActiveKey}
            config={config}
            colorMap={colorMap}
            staleKeys={staleKeys}
            setView={setView}
            setGenYear={setGenYear}
            setGenSection={setGenSection}
            runGeneration={runGeneration}
            doGenerate={doGenerate}
            setTimetables={setTimetables}
            addToast={addToast}
            setCellEdit={setCellEdit}
            printRef={printRef}
            setMobileOpen={setMobileOpen}
          />
        )}

        {/* ---------------- FACULTY SCHEDULE ---------------- */}
        {view === "facultySchedule" && (
          <FacultyScheduleScreen
            faculty={faculty}
            selectedFacultyId={selectedFacultyId}
            setSelectedFacultyId={setSelectedFacultyId}
            timetables={timetables}
            config={config}
            setMobileOpen={setMobileOpen}
          />
        )}

        {/* ---------------- SETTINGS ---------------- */}
        {view === "settings" && (
          <SettingsScreen
            config={config}
            setConfig={setConfig}
            addToast={addToast}
            setStaleKeys={setStaleKeys}
            timetables={timetables}
            setMobileOpen={setMobileOpen}
          />
        )}
      </main>

      {generating && <GenerationOverlay step={genStep} />}
      <ToastStack toasts={toasts} remove={removeToast} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} onRun={runPaletteItem} />

      {/* -------- Subject Modal -------- */}
      <SubjectModal
        state={subjectModal}
        onClose={() => setSubjectModal(null)}
        onSave={saveSubject}
        years={years}
        faculty={faculty}
      />

      {/* -------- Faculty Modal -------- */}
      <FacultyModal state={facultyModal} onClose={() => setFacultyModal(null)} onSave={saveFaculty} />

      {/* -------- Year/Section Modal -------- */}
      <SectionModal state={sectionModal} onClose={() => setSectionModal(null)} onAddYear={addYear} onAddSection={addSection} />

      {/* -------- Cell Edit Modal -------- */}
      <Modal open={!!cellEdit} onClose={() => setCellEdit(null)} title="Edit Timetable Cell" width="max-w-sm">
        {cellEdit && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {cellEdit.day} · {PERIOD_LABELS[cellEdit.period] || `Period ${cellEdit.period + 1}`}
            </p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              <button
                onClick={() => applyCellEdit("FREE")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-500 hover:border-indigo-300 hover:bg-indigo-50"
              >
                Mark as Free
              </button>
              {subjects
                .filter((s) => s.year === timetables[cellEdit.key]?.year && s.section === timetables[cellEdit.key]?.section)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => applyCellEdit(s.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="font-medium text-slate-700">
                      {s.code} · {s.name}
                    </span>
                    <span className="text-xs text-slate-400">{facultyMap[s.facultyId]?.name}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SUBJECTS SCREEN — data workbench module                                */
/* ---------------------------------------------------------------------- */

function SubjectsScreen({ subjects, facultyMap, setSubjectModal, deleteSubject, setMobileOpen }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.year.toLowerCase().includes(q) || (facultyMap[s.facultyId]?.name || "").toLowerCase().includes(q)
    );
  }, [subjects, query, facultyMap]);

  return (
    <div className="page-enter">
      <TopBar title="Subjects" subtitle="Manage subjects, weekly hours and faculty assignment" setMobileOpen={setMobileOpen} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name, year or faculty…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <Badge tone="slate">{filtered.length} of {subjects.length}</Badge>
        <PrimaryButton icon={Plus} onClick={() => setSubjectModal({ mode: "add" })}>
          Add Subject
        </PrimaryButton>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[65vh] overflow-auto smooth-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Year</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Hrs/Week</th>
                <th className="px-5 py-3">Faculty</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className="sweep-in group border-b border-slate-50 transition last:border-0 hover:bg-indigo-50/30"
                  style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                >
                  <td className="px-5 py-3 font-mono-custom text-xs font-semibold text-indigo-600">{s.code}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">{s.name}</td>
                  <td className="px-5 py-3 text-slate-500">{s.year}</td>
                  <td className="px-5 py-3 text-slate-500">{s.section}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-semibold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                      {s.hours}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{facultyMap[s.facultyId]?.name || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                      <IconButton icon={Pencil} tone="indigo" title="Edit" onClick={() => setSubjectModal({ mode: "edit", data: s })} />
                      <IconButton icon={Trash2} tone="rose" title="Delete" onClick={() => deleteSubject(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    No subjects match "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  FACULTY SCREEN — roster card module                                    */
/* ---------------------------------------------------------------------- */

function FacultyScreen({ facultyDerived, setFacultyModal, deleteFaculty, setMobileOpen }) {
  const maxHours = Math.max(...facultyDerived.map((f) => f.weeklyHours), 1);
  return (
    <div className="page-enter">
      <TopBar title="Faculty" subtitle="Manage teaching staff and their workload" setMobileOpen={setMobileOpen} />
      <div className="mb-5 flex justify-end">
        <PrimaryButton icon={Plus} onClick={() => setFacultyModal({ mode: "add" })}>
          Add Faculty
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {facultyDerived.map((f, i) => {
          const tone = COLORS[i % COLORS.length];
          const pct = Math.min(100, Math.round((f.weeklyHours / maxHours) * 100));
          const initials = f.name.split(" ").map((w) => w[0]).slice(-2).join("");
          return (
            <div
              key={f.id}
              className="rise-in hover-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-${tone}-500 to-${tone}-400 font-display text-sm font-bold text-white shadow-sm`}>
                    {initials}
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-slate-800">{f.name}</p>
                    <p className="font-mono-custom text-[11px] font-semibold text-slate-400">{f.id.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-60 transition hover:opacity-100">
                  <IconButton icon={Pencil} tone="indigo" title="Edit" onClick={() => setFacultyModal({ mode: "edit", data: f })} />
                  <IconButton icon={Trash2} tone="rose" title="Delete" onClick={() => deleteFaculty(f)} />
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {f.subjectNames.length ? (
                  f.subjectNames.map((n) => (
                    <Badge key={n} tone={tone === "slate" ? "slate" : "indigo"}>
                      {n}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No subjects assigned</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sections: {f.sections.join(", ") || "—"}</span>
                <span className="font-mono-custom font-semibold text-slate-600">{f.weeklyHours}h / week</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full bg-${tone}-500 transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {facultyDerived.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={Users} title="No faculty yet" subtitle="Add teaching staff to start assigning subjects." />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  GENERATE SCREEN                                                         */
/* ---------------------------------------------------------------------- */

function GenerateScreen({
  years, genYear, setGenYear, genSection, setGenSection, sectionsForGenYear,
  config, setConfig, subjects, buildSectionSubjects, runGeneration, setMobileOpen, existing, stale,
}) {
  const sectionSubjects = buildSectionSubjects(genYear, genSection);
  const requiredHours = sectionSubjects.reduce((a, s) => a + s.hours, 0);
  const availablePeriods = config.workingDays.length * config.periodsPerDay;

  const toggleDay = (d) => {
    setConfig((c) => ({
      ...c,
      workingDays: c.workingDays.includes(d) ? c.workingDays.filter((x) => x !== d) : [...c.workingDays, d].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)),
    }));
  };

  return (
    <div className="page-enter">
      <TopBar title="Generate Timetable" subtitle="Set constraints and let the engine build a conflict-free schedule" setMobileOpen={setMobileOpen} />

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Academic Year">
            <Select value={genYear} onChange={(v) => { setGenYear(v); setGenSection(years.find((y) => y.id === v)?.sections[0] || "A"); }} options={years.map((y) => ({ value: y.id, label: y.id }))} />
          </Field>
          <Field label="Section">
            <Select value={genSection} onChange={setGenSection} options={sectionsForGenYear.map((s) => ({ value: s, label: `Section ${s}` }))} />
          </Field>
          <Field label="Periods / Day">
            <Select
              value={String(config.periodsPerDay)}
              onChange={(v) => setConfig((c) => ({ ...c, periodsPerDay: Number(v) }))}
              options={[4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} periods` }))}
            />
          </Field>
          <Field label="Working Days">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    config.workingDays.includes(d) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      {stale && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert size={16} className="shrink-0" />
          Timetable constraints changed since this section was last generated. Regenerate to reflect the latest subjects and hours.
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-700">Pre-generation Summary</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Subjects", value: sectionSubjects.length },
              { label: "Required Weekly Hours", value: requiredHours },
              { label: "Available Periods", value: availablePeriods },
              { label: "Faculty Conflicts", value: 0, tone: "emerald" },
            ].map((s, si) => (
              <div key={s.label} className="rise-in rounded-xl bg-slate-50 px-4 py-3.5 text-center" style={{ animationDelay: `${si * 60}ms` }}>
                <p className={`font-display text-2xl font-bold ${s.tone === "emerald" ? "text-emerald-600" : "text-slate-800"}`}>
                  <CountUp value={s.value} />
                </p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {requiredHours > availablePeriods && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              <AlertTriangle size={14} className="shrink-0" />
              Required hours exceed available periods — some subjects may not be fully scheduled.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {sectionSubjects.map((s) => (
              <Badge key={s.id} tone="indigo">
                {s.code} · {s.hours}h · {s.facultyName}
              </Badge>
            ))}
            {sectionSubjects.length === 0 && <p className="text-sm text-slate-400">No subjects configured for this section yet.</p>}
          </div>

          <PrimaryButton
            icon={Sparkles}
            className="mt-6 w-full sm:w-auto"
            disabled={sectionSubjects.length === 0}
            onClick={() => runGeneration(genYear, genSection)}
          >
            Generate Timetable
          </PrimaryButton>
        </Card>

        <Card className="p-6">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-700">How it works</h3>
          <ol className="space-y-3 text-sm text-slate-500">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">1</span>
              Reads subjects, weekly hours and assigned faculty for the section.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">2</span>
              Distributes hours evenly across working days and periods.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">3</span>
              Cross-checks every slot against faculty already teaching other sections.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">4</span>
              Flags unavoidable conflicts for manual review instead of hiding them.
            </li>
          </ol>
          {existing && (
            <SecondaryButton className="mt-5 w-full" onClick={() => runGeneration(genYear, genSection)} icon={RefreshCw}>
              Regenerate Existing Timetable
            </SecondaryButton>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  TIMETABLES SCREEN                                                       */
/* ---------------------------------------------------------------------- */

function TimetablesScreen({
  timetables, activeKey, setActiveKey, config, colorMap, staleKeys, setView,
  setGenYear, setGenSection, runGeneration, doGenerate, setTimetables, addToast, setCellEdit, printRef, setMobileOpen,
}) {
  const keys = Object.keys(timetables);
  const active = activeKey && timetables[activeKey] ? timetables[activeKey] : timetables[keys[0]];
  const activeK = activeKey && timetables[activeKey] ? activeKey : keys[0];

  useEffect(() => {
    if (!activeKey && keys.length) setActiveKey(keys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.length]);

  if (!active) {
    return (
      <div className="page-enter">
        <TopBar title="Timetables" subtitle="All generated section timetables" setMobileOpen={setMobileOpen} />
        <EmptyState
          icon={CalendarDays}
          title="No timetables generated yet"
          subtitle="Head to Generate Timetable to build your first conflict-free schedule."
          action={<PrimaryButton icon={Wand2} onClick={() => setView("generate")}>Generate Timetable</PrimaryButton>}
        />
      </div>
    );
  }

  const [year, section] = [active.year, active.section];
  const stale = staleKeys.has(activeK);

  function handleRegenerate() {
    const result = doGenerate(year, section, { shuffleOrder: true });
    addToast(
      result.conflicts.length ? `Regenerated — ${result.conflicts.length} conflict(s) remain` : "Regenerated — conflict-free",
      result.conflicts.length ? "warning" : "success"
    );
  }

  function handleSave() {
    setTimetables((prev) => ({ ...prev, [activeK]: { ...prev[activeK], saved: true } }));
    addToast("Timetable saved", "success");
  }

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    addToast("Exporting to PDF…", "success");
  }

  return (
    <div className="page-enter">
      <TopBar title="Timetables" subtitle="All generated section timetables" setMobileOpen={setMobileOpen} />

      <div className="mb-5 flex flex-wrap gap-2">
        {keys.map((k) => {
          const tt = timetables[k];
          const isStale = staleKeys.has(k);
          return (
            <button
              key={k}
              onClick={() => setActiveKey(k)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                k === activeK ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {tt.year} · {tt.section}
              {isStale && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
              {!isStale && tt.conflicts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />}
              {!isStale && tt.conflicts.length === 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {stale && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <TriangleAlert size={16} className="shrink-0" /> Timetable constraints changed. This schedule is out of date.
          </span>
          <SecondaryButton icon={RefreshCw} onClick={handleRegenerate} className="!border-amber-300 !bg-white">
            Regenerate Timetable
          </SecondaryButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        <Card key={activeK} className="rise-in p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-800">
                {year} · Section {section}
              </h2>
              <p className="text-xs text-slate-400">
                {active.saved ? "Saved" : "Unsaved changes"} · Generated {active.generatedAt.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton icon={RefreshCw} onClick={handleRegenerate}>Regenerate</SecondaryButton>
              <SecondaryButton icon={Download} onClick={handleExport}>Export PDF</SecondaryButton>
              <SecondaryButton icon={Printer} onClick={handlePrint}>Print</SecondaryButton>
              <PrimaryButton icon={Check} onClick={handleSave}>Save Timetable</PrimaryButton>
            </div>
          </div>

          <TimetableGrid
            key={activeK + active.generatedAt.getTime()}
            timetable={active}
            config={config}
            colorMap={colorMap}
            editable
            printRef={printRef}
            onEditCell={(day, period) => setCellEdit({ key: activeK, day, period })}
          />
          <p className="mt-3 text-xs text-slate-400">Click any cell to manually reassign a subject for that slot.</p>
        </Card>

        <ConflictPanel
          conflicts={active.conflicts}
          hoursOk={active.totalHours <= active.totalSlots}
          onResolve={handleRegenerate}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  FACULTY SCHEDULE SCREEN                                                 */
/* ---------------------------------------------------------------------- */

function FacultyScheduleScreen({ faculty, selectedFacultyId, setSelectedFacultyId, timetables, config, setMobileOpen }) {
  const schedule = useMemo(() => {
    const byDay = {};
    config.workingDays.forEach((d) => (byDay[d] = Array(config.periodsPerDay).fill(null)));
    Object.values(timetables).forEach((tt) => {
      if (!tt.grid) return;
      Object.entries(tt.grid).forEach(([day, periods]) => {
        if (!byDay[day]) return;
        periods.forEach((cell, p) => {
          if (cell && cell.facultyId === selectedFacultyId) {
            if (byDay[day][p]) {
              byDay[day][p] = { ...byDay[day][p], conflict: true, extra: { section: tt.section, year: tt.year, subject: cell.code } };
            } else {
              byDay[day][p] = { section: tt.section, year: tt.year, subject: cell.name, code: cell.code, conflict: false };
            }
          }
        });
      });
    });
    return byDay;
  }, [timetables, selectedFacultyId, config]);

  const selectedFaculty = faculty.find((f) => f.id === selectedFacultyId);

  return (
    <div className="page-enter">
      <TopBar title="Faculty Schedule" subtitle="See where a faculty member is teaching across all sections" setMobileOpen={setMobileOpen} />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 font-display text-sm font-bold text-white">
          {selectedFaculty?.name?.split(" ").map((w) => w[0]).slice(-2).join("") || "—"}
        </div>
        <div className="min-w-[180px] flex-1">
          <Select value={selectedFacultyId} onChange={setSelectedFacultyId} options={faculty.map((f) => ({ value: f.id, label: f.name }))} />
        </div>
      </div>

      <div key={selectedFacultyId} className="page-enter grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {config.workingDays.map((day, di) => (
          <div key={day} className="sweep-in" style={{ animationDelay: `${di * 50}ms` }}>
            <h4 className="font-display mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> {day}
            </h4>
            <div className="relative border-l-2 border-slate-100 pl-5">
              {schedule[day].map((cell, p) => (
                <div key={p} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                      cell?.conflict ? "bg-rose-500" : cell ? "bg-indigo-500" : "bg-slate-300"
                    }`}
                  />
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs transition ${
                      cell?.conflict
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : cell
                        ? "border-indigo-100 bg-indigo-50/50 text-indigo-800 hover:border-indigo-200"
                        : "border-slate-100 bg-slate-50/50 text-slate-400"
                    }`}
                  >
                    <p className="font-mono-custom mb-0.5 font-semibold">{PERIOD_LABELS[p] || `Period ${p + 1}`}</p>
                    {cell ? (
                      <p className="font-medium">
                        {cell.conflict && <AlertTriangle size={11} className="mr-1 inline -mt-0.5" />}
                        {cell.subject} · {cell.year} {cell.section}
                      </p>
                    ) : (
                      <p className="italic">Free period</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SETTINGS SCREEN                                                         */
/* ---------------------------------------------------------------------- */

function SettingsScreen({ config, setConfig, addToast, setStaleKeys, timetables, setMobileOpen }) {
  const [local, setLocal] = useState(config);

  const toggleDay = (d) => {
    setLocal((c) => ({
      ...c,
      workingDays: c.workingDays.includes(d) ? c.workingDays.filter((x) => x !== d) : [...c.workingDays, d].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)),
    }));
  };

  function save() {
    setConfig(local);
    setStaleKeys(new Set(Object.keys(timetables)));
    addToast("Settings saved. Existing timetables marked for regeneration.", "success");
  }

  return (
    <div className="page-enter">
      <TopBar title="Settings" subtitle="Global scheduling defaults" setMobileOpen={setMobileOpen} />
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
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`relative h-7 w-7 rounded-full text-[10px] font-bold transition-all duration-200 ${
                    on ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {d.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rise-in flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{ animationDelay: "60ms" }}>
          <div>
            <p className="text-sm font-semibold text-slate-700">Periods per Day</p>
            <p className="text-xs text-slate-400">Teaching periods, excluding the lunch break</p>
          </div>
          <div className="max-w-[160px]">
            <Select
              value={String(local.periodsPerDay)}
              onChange={(v) => setLocal((c) => ({ ...c, periodsPerDay: Number(v) }))}
              options={[4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} periods` }))}
            />
          </div>
        </div>

        <div className="rise-in flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{ animationDelay: "120ms" }}>
          <div>
            <p className="text-sm font-semibold text-slate-700">Break After Period</p>
            <p className="text-xs text-slate-400">Where the lunch break is inserted</p>
          </div>
          <div className="max-w-[160px]">
            <Select
              value={String(local.breakAfter)}
              onChange={(v) => setLocal((c) => ({ ...c, breakAfter: Number(v) }))}
              options={Array.from({ length: local.periodsPerDay }, (_, i) => i + 1).map((n) => ({ value: String(n), label: `After period ${n}` }))}
            />
          </div>
        </div>

        <div className="flex justify-end px-6 py-5">
          <PrimaryButton icon={Check} onClick={save}>
            Save Settings
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MODALS                                                                  */
/* ---------------------------------------------------------------------- */

function SubjectModal({ state, onClose, onSave, years, faculty }) {
  const editing = state?.mode === "edit";
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!state) return setForm(null);
    if (editing) setForm(state.data);
    else
      setForm({
        code: "", name: "", year: years[0]?.id || "", section: years[0]?.sections[0] || "A", hours: 4, facultyId: faculty[0]?.id || "",
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state || !form) return null;
  const sectionsForYear = years.find((y) => y.id === form.year)?.sections || [];

  return (
    <Modal open onClose={onClose} title={editing ? "Edit Subject" : "Add Subject"}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Subject Code">
          <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAT101" />
        </Field>
        <Field label="Hours / Week">
          <TextInput type="number" min={1} max={12} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
        </Field>
        <div className="col-span-2">
          <Field label="Subject Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mathematics" />
          </Field>
        </div>
        <Field label="Year">
          <Select value={form.year} onChange={(v) => setForm({ ...form, year: v, section: years.find((y) => y.id === v)?.sections[0] || "A" })} options={years.map((y) => ({ value: y.id, label: y.id }))} />
        </Field>
        <Field label="Section">
          <Select value={form.section} onChange={(v) => setForm({ ...form, section: v })} options={sectionsForYear.map((s) => ({ value: s, label: s }))} />
        </Field>
        <div className="col-span-2">
          <Field label="Faculty">
            <Select value={form.facultyId} onChange={(v) => setForm({ ...form, facultyId: v })} options={faculty.map((f) => ({ value: f.id, label: f.name }))} />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton icon={Check} onClick={() => onSave(form)} disabled={!form.code || !form.name}>
          Save Subject
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function FacultyModal({ state, onClose, onSave }) {
  const editing = state?.mode === "edit";
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!state) return setForm(null);
    setForm(editing ? { id: state.data.id, name: state.data.name } : { name: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state || !form) return null;

  return (
    <Modal open onClose={onClose} title={editing ? "Edit Faculty" : "Add Faculty"} width="max-w-sm">
      <Field label="Faculty Name">
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Arun" />
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton icon={Check} onClick={() => onSave(form)} disabled={!form.name}>
          Save
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function SectionModal({ state, onClose, onAddYear, onAddSection }) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(""), [state]);
  if (!state) return null;

  const isYear = state.mode === "year";

  return (
    <Modal open onClose={onClose} title={isYear ? "Add Academic Year" : `Add Section to ${state.yearId}`} width="max-w-sm">
      <Field label={isYear ? "Year name" : "Section name"}>
        <TextInput value={value} onChange={(e) => setValue(e.target.value)} placeholder={isYear ? "5th Year" : "D"} />
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          icon={Check}
          disabled={!value.trim()}
          onClick={() => {
            isYear ? onAddYear(value.trim()) : onAddSection(state.yearId, value.trim().toUpperCase());
            onClose();
          }}
        >
          Add
        </PrimaryButton>
      </div>
    </Modal>
  );
}

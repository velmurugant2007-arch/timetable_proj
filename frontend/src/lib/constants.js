import {
  LayoutDashboard, GraduationCap, BookOpen, Users, Wand2,
  CalendarDays, UserCheck, Settings as SettingsIcon, Grid, FileUp, UsersRound
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  COLORS — prototype line 14                                         */
/* ------------------------------------------------------------------ */
export const COLORS = ['indigo', 'sky', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'fuchsia'];

/* ------------------------------------------------------------------ */
/*  NAV — prototype lines 54-63, adapted for Next.js routes            */
/* ------------------------------------------------------------------ */
export const NAV = [
  { key: 'dashboard', href: '/',                  label: 'Dashboard',          icon: LayoutDashboard },
  { key: 'years',     href: '/years',             label: 'Years & Sections',   icon: GraduationCap },
  { key: 'subjects',  href: '/subjects',          label: 'Subjects',           icon: BookOpen },
  { key: 'faculty',   href: '/faculty',           label: 'Faculty',            icon: Users },
  { key: 'generate',  href: '/generate',          label: 'Generate Timetable', icon: Wand2 },
  { key: 'timetables',href: '/timetables',        label: 'Timetables',         icon: CalendarDays },
  { key: 'masterTimetable', href: '/master-timetable', label: 'Master Timetable', icon: Grid },
  { key: 'presentTtImport', href: '/present-tt-import', label: 'Present TT Import', icon: FileUp },
  { key: 'facultySchedule', href: '/faculty-schedule', label: 'Faculty Schedule', icon: UserCheck },
  { key: 'facultyMasterTT', href: '/faculty-master-tt', label: 'Faculty Master TT', icon: UsersRound },
  { key: 'settings',  href: '/settings',          label: 'Settings',           icon: SettingsIcon },
];

/* ------------------------------------------------------------------ */
/*  DAYS & PERIODS — prototype lines 65-66                             */
/* ------------------------------------------------------------------ */
export const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const PERIOD_LABELS = [
  '08.45 – 09.40', '09.40 – 10.35', '10.55 – 11.45',
  '11.45 – 12.35', '01.45 – 02.35', '02.35 – 03.25', '03.25 – 04.15'
];

export const COLLEGE_TIMINGS = [
  { isBreak: false, time: "08.45 AM - 09.40 AM" },
  { isBreak: false, time: "09.40 AM - 10.35 AM" },
  { isBreak: true,  time: "10.35 AM - 10.55 AM", label: "TEA BREAK" },
  { isBreak: false, time: "10.55 AM - 11.45 AM" },
  { isBreak: false, time: "11.45 AM - 12.35 PM" },
  { isBreak: true,  time: "12.35 PM - 01.45 PM", label: "LUNCH BREAK" },
  { isBreak: false, time: "01.45 PM - 02.35 PM" },
  { isBreak: false, time: "02.35 PM - 03.25 PM" },
  { isBreak: false, time: "03.25 PM - 04.15 PM" },
];

/* ------------------------------------------------------------------ */
/*  TIMETABLE CELL TONES — prototype lines 594-604                     */
/* ------------------------------------------------------------------ */
export const CELL_TONE = {
  indigo:  'bg-indigo-50 border-indigo-200 text-indigo-800',
  sky:     'bg-sky-50 border-sky-200 text-sky-800',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  amber:   'bg-amber-50 border-amber-200 text-amber-800',
  violet:  'bg-violet-50 border-violet-200 text-violet-800',
  rose:    'bg-rose-50 border-rose-200 text-rose-800',
  cyan:    'bg-cyan-50 border-cyan-200 text-cyan-800',
  fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
  slate:   'bg-slate-50 border-slate-200 text-slate-700',
};

/* ------------------------------------------------------------------ */
/*  GENERATION STEPS — prototype lines 690-696                         */
/* ------------------------------------------------------------------ */
export const GEN_STEPS = [
  'Analyzing constraints...',
  'Checking faculty availability...',
  'Allocating subjects...',
  'Checking conflicts...',
  'Timetable generated successfully!',
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
export const sectionKey = (year, section) => `${year}__${section}`;

export function colorFor(subjectId, colorMap) {
  return colorMap[subjectId] || 'slate';
}

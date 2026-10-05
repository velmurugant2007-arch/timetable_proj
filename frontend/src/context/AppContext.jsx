'use client';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { COLORS, sectionKey } from '@/lib/constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  /* ---- Core data state ---- */
  const [years, setYears] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({ workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'], periodsPerDay: 6, breakAfter: 3 });

  /* ---- Timetable state ---- */
  const [timetables, setTimetables] = useState({});
  const [staleKeys, setStaleKeys] = useState(new Set());
  const [activeKey, setActiveKey] = useState(null);

  /* ---- Generation state ---- */
  const [genYear, setGenYear] = useState('1st Year');
  const [genSection, setGenSection] = useState('A');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  /* ---- Faculty schedule state ---- */
  const [selectedFacultyId, setSelectedFacultyId] = useState('f1');

  /* ---- Toast state ---- */
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ---- Derived data ---- */
  const facultyMap = useMemo(
    () => Object.fromEntries(faculty.map((f) => [f.id, f])),
    [faculty]
  );

  const colorMap = useMemo(() => {
    const map = {};
    subjects.forEach((s, i) => (map[s.id] = COLORS[i % COLORS.length]));
    return map;
  }, [subjects]);

  const allSectionOptions = useMemo(() => {
    const list = [];
    years.forEach((y) => y.sections.forEach((sec) => list.push({ year: y.name || y.id, section: sec })));
    return list;
  }, [years]);

  const staleCount = staleKeys.size;

  const markStale = useCallback((year, section) => {
    const key = sectionKey(year, section);
    setStaleKeys((prev) => {
      if (timetables[key]) {
        const next = new Set(prev);
        next.add(key);
        return next;
      }
      return prev;
    });
  }, [timetables]);

  const clearStale = useCallback((key) => {
    setStaleKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const value = {
    years, setYears,
    faculty, setFaculty,
    subjects, setSubjects,
    config, setConfig,
    timetables, setTimetables,
    staleKeys, setStaleKeys,
    activeKey, setActiveKey,
    genYear, setGenYear,
    genSection, setGenSection,
    generating, setGenerating,
    genStep, setGenStep,
    selectedFacultyId, setSelectedFacultyId,
    toasts, addToast, removeToast,
    facultyMap, colorMap, allSectionOptions, staleCount,
    markStale, clearStale,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

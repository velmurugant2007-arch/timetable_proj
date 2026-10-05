'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import ToastStack from '@/components/ToastStack';
import CommandPalette from '@/components/CommandPalette';
import GenerationOverlay from '@/components/timetable/GenerationOverlay';
import { yearsApi, subjectsApi, facultyApi, settingsApi, timetablesApi } from '@/lib/api';

export default function DashboardLayout({ children }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    setYears, setSubjects, setFaculty, setConfig, setTimetables,
    generating, genStep,
  } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch all data on mount
  useEffect(() => {
    if (!user) return;
    async function fetchAll() {
      try {
        const [yRes, sRes, fRes, cfgRes, ttRes] = await Promise.all([
          yearsApi.getAll(),
          subjectsApi.getAll(),
          facultyApi.getRaw(),
          settingsApi.get(),
          timetablesApi.getAll(),
        ]);
        setYears(yRes.data.data);
        setSubjects(sRes.data.data);
        setFaculty(fRes.data.data);
        setConfig(cfgRes.data.data);
        setTimetables(ttRes.data.data || {});
        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setDataLoaded(true);
      }
    }
    fetchAll();
  }, [user]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <main className="smooth-scroll flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10 relative print:overflow-visible print:p-0">
        {dataLoaded ? children : (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        )}
      </main>

      {generating && <GenerationOverlay step={genStep} />}
      <ToastStack />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

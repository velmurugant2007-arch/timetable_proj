'use client';
import { useRouter } from 'next/navigation';
import { GraduationCap, CalendarDays, BookOpen, Users, Wand2, UserCheck } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import CountUp from '@/components/dashboard/CountUp';
import { useApp } from '@/context/AppContext';
import { sectionKey } from '@/lib/constants';

/** Dashboard — prototype lines 1061-1168 */
export default function DashboardPage() {
  const router = useRouter();
  const { years, subjects, faculty, timetables, allSectionOptions, staleKeys, staleCount } = useApp();

  return (
    <div className="page-enter">
      <TopBar title="Dashboard" subtitle="Overview of your college timetable system" />

      {/* Hero banner */}
      <div className="rise-in mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-500 p-6 text-white shadow-lg shadow-indigo-600/25 sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono-custom text-[11px] font-semibold uppercase tracking-widest text-indigo-100/80">PSNA College of Engineering &amp; Technology</p>
            <h2 className="font-display mt-1.5 text-xl font-bold sm:text-2xl">Every section, conflict-free — automatically.</h2>
            <p className="mt-1.5 max-w-md text-sm text-indigo-100/90">
              {Object.keys(timetables).length} of {allSectionOptions.length} sections scheduled · {staleCount} awaiting regeneration
            </p>
          </div>
          <PrimaryButton icon={Wand2} onClick={() => router.push('/generate')} className="!bg-white !text-indigo-700 shadow-md hover:!bg-indigo-50">
            Generate New Timetable
          </PrimaryButton>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Years', value: years.length, icon: GraduationCap, tone: 'indigo' },
          { label: 'Total Sections', value: years.reduce((a, y) => a + y.sections.length, 0), icon: CalendarDays, tone: 'sky' },
          { label: 'Total Subjects', value: subjects.length, icon: BookOpen, tone: 'emerald' },
          { label: 'Total Faculty', value: faculty.length, icon: Users, tone: 'amber' },
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

      {/* Status + Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="rise-in p-6 lg:col-span-2" style={{ animationDelay: '160ms' }}>
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
                      <p className="text-sm font-semibold text-slate-700">{year} · Section {section}</p>
                      <p className="text-xs text-slate-400">
                        {tt ? `Generated ${new Date(tt.generatedAt).toLocaleTimeString()}` : 'Not generated yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!tt && <Badge tone="slate">Pending</Badge>}
                      {tt && stale && <Badge tone="amber">Needs regeneration</Badge>}
                      {tt && !stale && tt.conflicts?.length > 0 && <Badge tone="rose">{tt.conflicts.length} conflict(s)</Badge>}
                      {tt && !stale && (!tt.conflicts || tt.conflicts.length === 0) && <Badge tone="emerald">Conflict-free</Badge>}
                      <SecondaryButton onClick={() => router.push(tt ? '/timetables' : '/generate')}>
                        {tt ? 'View' : 'Generate'}
                      </SecondaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="rise-in p-6" style={{ animationDelay: '220ms' }}>
          <h3 className="font-display mb-4 text-base font-bold text-slate-800">Quick Actions</h3>
          <div className="space-y-2.5">
            <SecondaryButton className="w-full !justify-start" icon={BookOpen} onClick={() => router.push('/subjects')}>Manage Subjects</SecondaryButton>
            <SecondaryButton className="w-full !justify-start" icon={Users} onClick={() => router.push('/faculty')}>Manage Faculty</SecondaryButton>
            <SecondaryButton className="w-full !justify-start" icon={UserCheck} onClick={() => router.push('/faculty-schedule')}>View Faculty Schedule</SecondaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

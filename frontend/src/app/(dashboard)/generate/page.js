'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, AlertTriangle, RefreshCw, TriangleAlert } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import CountUp from '@/components/dashboard/CountUp';
import { useApp } from '@/context/AppContext';
import { timetablesApi } from '@/lib/api';
import { ALL_DAYS, sectionKey, GEN_STEPS } from '@/lib/constants';
import SectionTimetablePrint from '@/components/timetable/SectionTimetablePrint';

/** Generate Timetable — prototype GenerateScreen lines 1533-1666 */
export default function GeneratePage() {
  const router = useRouter();
  const {
    years, genYear, setGenYear, genSection, setGenSection,
    config, setConfig, subjects, facultyMap, timetables,
    staleKeys, setTimetables, setActiveKey, clearStale,
    setGenerating, setGenStep, addToast,
  } = useApp();

  useEffect(() => {
    if (years.length > 0) {
      const currentYearExists = years.some(y => (y.name || y.id) === genYear);
      if (!currentYearExists) {
        setGenYear(years[0].name || years[0].id);
        setGenSection(years[0].sections[0] || 'A');
      } else {
        const y = years.find(y => (y.name || y.id) === genYear);
        if (y && !y.sections.includes(genSection)) {
          setGenSection(y.sections[0] || 'A');
        }
      }
    }
  }, [years, genYear, genSection, setGenYear, setGenSection]);

  const sectionsForGenYear = years.find((y) => (y.name || y.id) === genYear)?.sections || [];

  const sectionSubjects = subjects
    .filter((s) => s.year === genYear && s.section === genSection)
    .map((s) => ({ ...s, facultyName: facultyMap[s.facultyId]?.name || 'Unassigned' }));

  const requiredHours = sectionSubjects.reduce((a, s) => a + s.hours, 0);
  const availablePeriods = config.workingDays.length * config.periodsPerDay;
  const stale = staleKeys.has(sectionKey(genYear, genSection));
  const existing = timetables[sectionKey(genYear, genSection)];

  const toggleDay = (d) => {
    setConfig((c) => ({
      ...c,
      workingDays: c.workingDays.includes(d) ? c.workingDays.filter((x) => x !== d) : [...c.workingDays, d].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)),
    }));
  };

  async function runGeneration() {
    setGenerating(true);
    setGenStep(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setGenStep(i);
      if (i >= GEN_STEPS.length) {
        clearInterval(timer);
        setTimeout(async () => {
          try {
            const res = await timetablesApi.generate({ year: genYear, section: genSection });
            const data = res.data.data;
            const key = data.key || sectionKey(genYear, genSection);
            setTimetables((prev) => ({ ...prev, [key]: data }));
            clearStale(key);
            setActiveKey(key);
            addToast(
              data.conflicts?.length
                ? `Generated with ${data.conflicts.length} conflict(s) — review before saving.`
                : `Timetable generated for ${genYear} · Section ${genSection}`,
              data.conflicts?.length ? 'warning' : 'success'
            );
            router.push('/timetables');
          } catch (err) {
            addToast(err.response?.data?.error || 'Generation failed', 'warning');
          } finally {
            setGenerating(false);
          }
        }, 450);
      }
    }, 520);
  }

  return (
    <div className="page-enter">
      <TopBar title="Generate Timetable" subtitle="Set constraints and let the engine build a conflict-free schedule" />

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Academic Year">
            <Select value={genYear} onChange={(v) => { setGenYear(v); setGenSection(years.find((y) => (y.name || y.id) === v)?.sections[0] || 'A'); }} options={years.map((y) => ({ value: y.name || y.id, label: y.name || y.id }))} />
          </Field>
          <Field label="Section">
            <Select value={genSection} onChange={setGenSection} options={sectionsForGenYear.map((s) => ({ value: s, label: `Section ${s}` }))} />
          </Field>
          <Field label="Periods / Day">
            <Select value={String(config.periodsPerDay)} onChange={(v) => setConfig((c) => ({ ...c, periodsPerDay: Number(v) }))} options={[4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} periods` }))} />
          </Field>
          <Field label="Working Days">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_DAYS.map((d) => (
                <button key={d} onClick={() => toggleDay(d)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${config.workingDays.includes(d) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>{d}</button>
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
              { label: 'Subjects', value: sectionSubjects.length },
              { label: 'Required Weekly Hours', value: requiredHours },
              { label: 'Available Periods', value: availablePeriods },
              { label: 'Faculty Conflicts', value: 0, tone: 'emerald' },
            ].map((s, si) => (
              <div key={s.label} className="rise-in rounded-xl bg-slate-50 px-4 py-3.5 text-center" style={{ animationDelay: `${si * 60}ms` }}>
                <p className={`font-display text-2xl font-bold ${s.tone === 'emerald' ? 'text-emerald-600' : 'text-slate-800'}`}>
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
              <Badge key={s.id} tone="indigo">{s.code} · {s.hours}h · {s.facultyName}</Badge>
            ))}
            {sectionSubjects.length === 0 && <p className="text-sm text-slate-400">No subjects configured for this section yet.</p>}
          </div>

          <PrimaryButton icon={Sparkles} className="mt-6 w-full sm:w-auto" disabled={sectionSubjects.length === 0} onClick={runGeneration}>
            Generate Timetable
          </PrimaryButton>
        </Card>

        <Card className="p-6">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-700">How it works</h3>
          <ol className="space-y-3 text-sm text-slate-500">
            {['Reads subjects, weekly hours and assigned faculty for the section.',
              'Distributes hours evenly across working days and periods.',
              'Cross-checks every slot against faculty already teaching other sections.',
              'Flags unavoidable conflicts for manual review instead of hiding them.'].map((text, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">{i + 1}</span>
                {text}
              </li>
            ))}
          </ol>
          {existing && (
            <SecondaryButton className="mt-5 w-full" onClick={runGeneration} icon={RefreshCw}>Regenerate Existing Timetable</SecondaryButton>
          )}
        </Card>
      </div>
    </div>
  );
}

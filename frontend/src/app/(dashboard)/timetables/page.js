'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Download, Printer, Check, Wand2, CalendarDays, TriangleAlert, Pencil, FileText, Mail, ChevronDown } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import Modal from '@/components/ui/Modal';
import ConflictPanel from '@/components/timetable/ConflictPanel';
import { useApp } from '@/context/AppContext';
import { timetablesApi, exportApi } from '@/lib/api';
import { sectionKey, PERIOD_LABELS, colorFor } from '@/lib/constants';
import SectionTimetablePrint from '@/components/timetable/SectionTimetablePrint';

/** Timetables page — prototype TimetablesScreen lines 1672-1798 */
export default function TimetablesPage() {
  const router = useRouter();
  const {
    timetables, setTimetables, activeKey, setActiveKey,
    config, colorMap, staleKeys, subjects, facultyMap, addToast, clearStale,
  } = useApp();
  const printRef = useRef(null);
  const [cellEdit, setCellEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Export states
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const keys = Object.keys(timetables);
  const active = activeKey && timetables[activeKey] ? timetables[activeKey] : timetables[keys[0]];
  const activeK = activeKey && timetables[activeKey] ? activeKey : keys[0];

  useEffect(() => {
    if (!activeKey && keys.length) setActiveKey(keys[0]);
  }, [keys.length]);

  if (!active) {
    return (
      <div className="page-enter">
        <TopBar title="Timetables" subtitle="All generated section timetables" />
        <EmptyState icon={CalendarDays} title="No timetables generated yet" subtitle="Head to Generate Timetable to build your first conflict-free schedule."
          action={<PrimaryButton icon={Wand2} onClick={() => router.push('/generate')}>Generate Timetable</PrimaryButton>} />
      </div>
    );
  }

  const { year, section } = active;
  const stale = staleKeys.has(activeK);

  async function handleRegenerate() {
    try {
      const res = await timetablesApi.generate({ year, section, shuffleOrder: true });
      const data = res.data.data;
      const key = data.key || sectionKey(year, section);
      setTimetables((prev) => ({ ...prev, [key]: data }));
      clearStale(key);
      addToast(data.conflicts?.length ? `Regenerated — ${data.conflicts.length} conflict(s) remain` : 'Regenerated — conflict-free', data.conflicts?.length ? 'warning' : 'success');
    } catch (err) {
      addToast('Regeneration failed', 'warning');
    }
  }

  async function handleSave() {
    try {
      await timetablesApi.save(activeK);
      setTimetables((prev) => ({ ...prev, [activeK]: { ...prev[activeK], saved: true } }));
      setIsEditing(false);
      addToast('Timetable saved', 'success');
    } catch (err) {
      addToast('Save failed', 'warning');
    }
  }

  async function applyCellEdit(subjectId) {
    if (!cellEdit) return;
    try {
      const res = await timetablesApi.editCell(cellEdit.key, { day: cellEdit.day, period: cellEdit.period, subjectId });
      setTimetables((prev) => ({ ...prev, [cellEdit.key]: res.data.data }));
      addToast('Cell updated', 'success');
    } catch (err) {
      addToast('Cell edit failed', 'warning');
    }
    setCellEdit(null);
  }

  async function handleExportPDF() {
    setExportMenuOpen(false);
    window.print();
  }

  function handleExportWord() {
    setExportMenuOpen(false);
    addToast('Generating Word Document...', 'success');
    const htmlContent = printRef.current.innerHTML;
    // Basic HTML wrapper that MS Word can interpret
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>
      ${htmlContent}
      </body></html>
    `;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Timetable_${year}_${section}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSendEmail() {
    if (!emailTarget) return addToast('Please enter an email address', 'warning');
    setEmailSending(true);
    try {
      const htmlContent = printRef.current.innerHTML;
      const res = await exportApi.email({
        email: emailTarget,
        subject: `Timetable - ${year} Section ${section}`,
        htmlContent
      });
      addToast(res.data.message || 'Email sent', 'success');
      setEmailModalOpen(false);
      setEmailTarget('');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to send email', 'warning');
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="page-enter print:m-0 print:p-0 print:bg-white print:h-auto print:w-auto">
      <div className="print:hidden">
        <TopBar title="Timetables" subtitle="All generated section timetables" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 print:hidden">
        {keys.map((k) => {
          const tt = timetables[k];
          const isStale = staleKeys.has(k);
          return (
            <button key={k} onClick={() => setActiveKey(k)} className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${k === activeK ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
              {tt.year} · {tt.section}
              {isStale && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
              {!isStale && tt.conflicts?.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />}
              {!isStale && (!tt.conflicts || tt.conflicts.length === 0) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {stale && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
          <span className="flex items-center gap-2"><TriangleAlert size={16} className="shrink-0" /> Timetable constraints changed. This schedule is out of date.</span>
          <SecondaryButton icon={RefreshCw} onClick={handleRegenerate} className="!border-amber-300 !bg-white">Regenerate Timetable</SecondaryButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        <Card key={activeK} className="rise-in p-5 print:p-0 print:border-none print:shadow-none print:bg-transparent">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-800">{year} · Section {section}</h2>
              <p className="text-xs text-slate-400">
                {active.saved ? 'Saved' : 'Unsaved changes'} · Generated {new Date(active.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton icon={RefreshCw} onClick={handleRegenerate}>Regenerate</SecondaryButton>
              
              <div className="relative">
                <SecondaryButton onClick={() => setExportMenuOpen(!exportMenuOpen)}>
                  Export <ChevronDown size={14} className="ml-1" />
                </SecondaryButton>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                      <button onClick={handleExportPDF} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        <Download size={14} className="text-slate-400" /> Export to PDF
                      </button>
                      <button onClick={handleExportWord} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        <FileText size={14} className="text-blue-500" /> Export to Word
                      </button>
                      <button onClick={() => { setExportMenuOpen(false); setEmailModalOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        <Mail size={14} className="text-indigo-500" /> Email Timetable
                      </button>
                    </div>
                  </>
                )}
              </div>

              <SecondaryButton icon={Printer} onClick={() => window.print()}>Print</SecondaryButton>
              {active.saved && !isEditing ? (
                <PrimaryButton icon={Pencil} onClick={() => setIsEditing(true)}>Edit Timetable</PrimaryButton>
              ) : (
                <PrimaryButton icon={Check} onClick={handleSave}>Save Timetable</PrimaryButton>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 print:overflow-visible print:ring-0 print:p-0 print:shadow-none">
            <SectionTimetablePrint
              timetable={active}
              config={config}
              printRef={printRef}
              editable={isEditing || !active.saved}
              onEditCell={(d, p) => setCellEdit({ key: activeK, day: d, period: p })}
            />
          </div>
          {(isEditing || !active.saved) && (
            <p className="mt-3 text-xs text-slate-400 print:hidden">Click any cell to manually reassign a subject for that slot.</p>
          )}
        </Card>
        <div className="print:hidden">
          <ConflictPanel conflicts={active.conflicts || []} hoursOk={active.totalHours <= active.totalSlots} onResolve={handleRegenerate} />
        </div>
      </div>

      {/* Cell Edit Modal */}
      <Modal open={!!cellEdit} onClose={() => setCellEdit(null)} title="Edit Timetable Cell" width="max-w-sm">
        {cellEdit && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{cellEdit.day} · {PERIOD_LABELS[cellEdit.period] || `Period ${cellEdit.period + 1}`}</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              <button onClick={() => applyCellEdit('FREE')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-500 hover:border-indigo-300 hover:bg-indigo-50">Mark as Free</button>
              {subjects.filter((s) => s.year === timetables[cellEdit.key]?.year && s.section === timetables[cellEdit.key]?.section).map((s) => (
                <button key={s.id} onClick={() => applyCellEdit(s.id)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50">
                  <span className="font-medium text-slate-700">{s.code} · {s.name}</span>
                  <span className="text-xs text-slate-400">{facultyMap[s.facultyId]?.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Email Export Modal */}
      <Modal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Email Timetable" width="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Send this timetable directly to an email address.</p>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Recipient Email</label>
            <input
              type="email"
              placeholder="faculty@college.edu"
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              list="faculty-emails"
            />
            <datalist id="faculty-emails">
              {Object.values(facultyMap).filter(f => f.email).map(f => (
                <option key={f.id} value={f.email}>{f.name}</option>
              ))}
            </datalist>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setEmailModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSendEmail} disabled={emailSending || !emailTarget}>
              {emailSending ? 'Sending...' : 'Send Email'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

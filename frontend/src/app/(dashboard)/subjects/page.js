'use client';
import { useState, useMemo, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, Upload } from 'lucide-react';
import * as xlsx from 'xlsx';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PrimaryButton from '@/components/ui/PrimaryButton';
import IconButton from '@/components/ui/IconButton';
import SubjectModal from '@/components/subjects/SubjectModal';
import { useApp } from '@/context/AppContext';
import { subjectsApi } from '@/lib/api';

/** Subjects page — prototype SubjectsScreen lines 1371-1453 */
export default function SubjectsPage() {
  const { subjects, setSubjects, facultyMap, faculty, setFaculty, years, setYears, addToast, markStale } = useApp();
  const [query, setQuery] = useState('');
  const [subjectModal, setSubjectModal] = useState(null);
  const fileInputRef = useRef(null);

  async function handleImportExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast('Importing subjects...', 'success');
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = xlsx.utils.sheet_to_json(firstSheet);

      if (!json.length) {
        addToast('Excel file is empty', 'warning');
        return;
      }

      const res = await subjectsApi.bulkImport(json);
      setSubjects(res.data.data.subjects);
      setFaculty(res.data.data.faculty);
      setYears(res.data.data.years);
      addToast(`Imported ${res.data.data.added} subjects successfully`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to import Excel', 'warning');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => (s.code || '').toLowerCase().includes(q) || 
             (s.name || '').toLowerCase().includes(q) || 
             (s.year || '').toLowerCase().includes(q) || 
             (facultyMap[s.facultyId]?.name || s.facultyName || '').toLowerCase().includes(q)
    );
  }, [subjects, query, facultyMap]);

  async function handleSave(data) {
    try {
      if (data.id) {
        const res = await subjectsApi.update(data.id, data);
        setSubjects((prev) => prev.map((s) => (s.id === data.id ? res.data.data : s)));
        const old = subjects.find((s) => s.id === data.id);
        if (old && (old.hours !== data.hours || old.facultyId !== data.facultyId)) {
          markStale(data.year, data.section);
          addToast(`Timetable constraints changed for ${data.year} · Section ${data.section}`, 'warning');
        }
      } else {
        const res = await subjectsApi.create(data);
        setSubjects((prev) => [...prev, res.data.data]);
        markStale(data.year, data.section);
        addToast(`Subject ${data.code} added`, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save subject', 'warning');
    }
    setSubjectModal(null);
  }

  async function handleDelete(s) {
    try {
      await subjectsApi.delete(s.id);
      setSubjects((prev) => prev.filter((x) => x.id !== s.id));
      markStale(s.year, s.section);
      addToast(`${s.code} removed`, 'warning');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete', 'warning');
    }
  }

  return (
    <div className="page-enter">
      <TopBar title="Subjects" subtitle="Manage subjects, weekly hours and faculty assignment" />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, name, year or faculty…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
        </div>
        <Badge tone="slate">{filtered.length} of {subjects.length}</Badge>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Upload size={16} /> Import Excel
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
          <PrimaryButton icon={Plus} onClick={() => setSubjectModal({ mode: 'add' })}>Add Subject</PrimaryButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[65vh] overflow-auto smooth-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                <th className="px-5 py-3">Code</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Year</th>
                <th className="px-5 py-3">Section</th><th className="px-5 py-3">Hrs/Week</th><th className="px-5 py-3">Faculty</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="sweep-in group border-b border-slate-50 transition last:border-0 hover:bg-indigo-50/30" style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}>
                  <td className="px-5 py-3 font-mono-custom text-xs font-semibold text-indigo-600">{s.code}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">{s.name}</td>
                  <td className="px-5 py-3 text-slate-500">{s.year}</td>
                  <td className="px-5 py-3 text-slate-500">{s.section}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-semibold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">{s.hours}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-medium">{facultyMap[s.facultyId]?.name || s.facultyName || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                      <IconButton icon={Pencil} tone="indigo" title="Edit" onClick={() => setSubjectModal({ mode: 'edit', data: s })} />
                      <IconButton icon={Trash2} tone="rose" title="Delete" onClick={() => handleDelete(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No subjects match &ldquo;{query}&rdquo;.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SubjectModal state={subjectModal} onClose={() => setSubjectModal(null)} onSave={handleSave} years={years} faculty={faculty} />
    </div>
  );
}

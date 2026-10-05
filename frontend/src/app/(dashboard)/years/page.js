'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import IconButton from '@/components/ui/IconButton';
import SectionModal from '@/components/years/SectionModal';
import { useApp } from '@/context/AppContext';
import { yearsApi } from '@/lib/api';
import { COLORS } from '@/lib/constants';

/** Years & Sections — prototype lines 1172-1222 */
export default function YearsPage() {
  const router = useRouter();
  const { years, setYears, addToast, setActiveKey, timetables } = useApp();
  const [sectionModal, setSectionModal] = useState(null);

  async function handleAddYear(name) {
    try {
      const res = await yearsApi.create(name);
      setYears((prev) => [...prev, res.data.data]);
      addToast(`${name} added`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add year', 'warning');
    }
  }

  async function handleEditYear(id, name) {
    try {
      const res = await yearsApi.update(id, name);
      setYears((prev) => prev.map((y) => (y.id === id || y.name === id) ? res.data.data : y));
      addToast('Year updated', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update year', 'warning');
    }
  }

  async function handleDeleteYear(id) {
    if (!window.confirm('Are you sure you want to delete this year and all its sections?')) return;
    try {
      await yearsApi.delete(id);
      setYears((prev) => prev.filter((y) => y.id !== id && y.name !== id));
      addToast('Year deleted', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete year', 'warning');
    }
  }

  async function handleAddSection(yearId, sectionName) {
    try {
      const res = await yearsApi.addSection(yearId, sectionName);
      setYears((prev) => prev.map((y) => (y.id === yearId || y.name === yearId) ? res.data.data : y));
      addToast(`Section ${sectionName} added`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add section', 'warning');
    }
  }

  async function handleEditSection(yearId, oldSection, newSection) {
    try {
      const res = await yearsApi.updateSection(yearId, oldSection, newSection);
      setYears((prev) => prev.map((y) => (y.id === yearId || y.name === yearId) ? res.data.data : y));
      addToast('Section updated', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update section', 'warning');
    }
  }

  async function handleDeleteSection(yearId, sectionName) {
    if (!window.confirm(`Delete Section ${sectionName}?`)) return;
    try {
      const res = await yearsApi.deleteSection(yearId, sectionName);
      setYears((prev) => prev.map((y) => (y.id === yearId || y.name === yearId) ? res.data.data : y));
      addToast('Section deleted', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete section', 'warning');
    }
  }

  return (
    <div className="page-enter">
      <TopBar title="Years & Sections" subtitle="Configure academic years and their sections" />
      <div className="mb-5 flex justify-end">
        <PrimaryButton icon={Plus} onClick={() => setSectionModal({ mode: 'year' })}>Add Year</PrimaryButton>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {years.map((y, yi) => {
          const tone = COLORS[yi % COLORS.length];
          const yearId = y.id || y.name;
          const yearName = y.name || y.id;
          return (
            <div key={yearId} className="rise-in group/year hover-lift relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60" style={{ animationDelay: `${yi * 70}ms` }}>
              <div className={`absolute left-0 top-0 h-full w-1 bg-${tone}-500`} />
              <div className="mb-4 flex items-center justify-between pl-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${tone}-50 text-${tone}-600`}>
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-800">{yearName}</h3>
                    <p className="text-xs text-slate-400">{y.sections.length} section{y.sections.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <IconButton icon={Pencil} tone="indigo" title="Edit Year & Sections" onClick={() => setSectionModal({ mode: 'edit-year', yearId, initialValue: yearName, sections: y.sections })} />
                  <IconButton icon={Trash2} tone="rose" title="Delete Year" onClick={() => handleDeleteYear(yearId)} />
                </div>
              </div>
              <div className="space-y-4 pl-1.5 mt-4">
                {y.sections.map((s, si) => (
                  <div key={s} className="group/section relative flex flex-col gap-2 pl-4">
                    <span className={`absolute left-0 top-3.5 h-px w-3 bg-${tone}-200`} />
                    {si < y.sections.length - 1 && <span className={`absolute -left-0 top-3.5 h-[calc(100%+1rem)] w-px bg-${tone}-100`} />}
                    
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg border border-${tone}-200 bg-${tone}-50 text-xs font-bold text-${tone}-700 z-10`}>{s}</div>
                      <span className="text-sm font-medium text-slate-600">Section {s}</span>
                    </div>
                    
                    <div className="flex pl-10">
                      <button
                        onClick={() => {
                          const key = `${yearName}__${s}`;
                          if (timetables && timetables[key]) {
                            setActiveKey(key);
                            router.push('/timetables');
                          } else {
                            addToast('Timetable for this section is not generated', 'warning');
                          }
                        }}
                        className="flex items-center gap-2 rounded-full border-2 border-[#003B5C] bg-white px-3 py-1 text-[11px] font-bold tracking-widest text-slate-800 transition hover:bg-slate-50"
                      >
                        VIEW TIMETABLE <ArrowRight size={14} strokeWidth={3} className="text-[#003B5C]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <SectionModal 
        state={sectionModal} 
        onClose={() => setSectionModal(null)} 
        onAddYear={handleAddYear} 
        onEditYear={handleEditYear}
        onAddSection={handleAddSection} 
        onEditSection={handleEditSection}
        onDeleteSection={handleDeleteSection}
      />
    </div>
  );
}

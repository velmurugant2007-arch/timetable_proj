'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Users, ArrowRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import IconButton from '@/components/ui/IconButton';
import EmptyState from '@/components/ui/EmptyState';
import FacultyModal from '@/components/faculty/FacultyModal';
import { useApp } from '@/context/AppContext';
import { facultyApi } from '@/lib/api';
import { COLORS } from '@/lib/constants';

export default function FacultyPage() {
  const router = useRouter();
  const { faculty, setFaculty, subjects, addToast, setSelectedFacultyId } = useApp();
  const [facultyModal, setFacultyModal] = useState(null);

  const facultyDerived = faculty.map((f) => {
    const subs = subjects.filter((s) => s.facultyId === f.id);
    const weeklyHours = subs.reduce((a, s) => a + s.hours, 0);
    return { ...f, subs, weeklyHours };
  });

  async function handleSave(data) {
    try {
      if (data.id) {
        const res = await facultyApi.update(data.id, data);
        setFaculty((prev) => prev.map((f) => (f.id === data.id ? res.data.data : f)));
      } else {
        const res = await facultyApi.create(data);
        setFaculty((prev) => [...prev, res.data.data]);
      }
      addToast(data.id ? 'Faculty updated' : 'Faculty added', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed', 'warning');
    }
    setFacultyModal(null);
  }

  async function handleDelete(f) {
    if (!window.confirm(`Are you sure you want to remove ${f.name}?`)) return;
    try {
      await facultyApi.delete(f.id);
      setFaculty((prev) => prev.filter((x) => x.id !== f.id));
      addToast(`${f.name} removed`, 'warning');
    } catch (err) {
      addToast(err.response?.data?.error || 'Cannot remove', 'warning');
    }
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <TopBar title="Faculty" subtitle="Manage teaching staff and their workload" />
      <div className="mb-5 flex justify-end">
        <PrimaryButton icon={Plus} onClick={() => setFacultyModal({ mode: 'add' })}>Add Faculty</PrimaryButton>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
        {facultyDerived.map((f, i) => {
          const tone = COLORS[i % COLORS.length];
          const initials = f.name.split(' ').map((w) => w[0]).slice(-2).join('');
          
          return (
            <div key={f.id} className="rise-in flex flex-col hover-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60" style={{ animationDelay: `${i * 50}ms` }}>
              
              <div className="flex justify-end gap-1 mb-2 opacity-60 hover:opacity-100 transition-opacity">
                <IconButton icon={Pencil} tone="indigo" title="Edit" onClick={() => setFacultyModal({ mode: 'edit', data: f })} />
                <IconButton icon={Trash2} tone="rose" title="Delete" onClick={() => handleDelete(f)} />
              </div>

              <div className="flex flex-col items-center mb-5">
                {f.image ? (
                  <img src={f.image} alt={f.name} className="h-20 w-20 rounded-full object-cover shadow-sm mb-3 border-2 border-white ring-2 ring-slate-100" />
                ) : (
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-${tone}-500 to-${tone}-400 font-display text-2xl font-bold text-white shadow-sm mb-3 border-2 border-white ring-2 ring-slate-100`}>
                    {initials}
                  </div>
                )}
                <h3 className="font-display text-base font-bold text-slate-800 text-center">{f.name}</h3>
                <p className="font-mono-custom text-xs font-semibold text-slate-400">{f.id.toUpperCase()}</p>
                {f.email && <p className="mt-1 text-xs text-slate-500 font-medium">{f.email}</p>}
              </div>

              <div className="flex-1 mb-4">
                {f.subs.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-[11px] text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Year</th>
                          <th className="px-3 py-2 font-semibold">Sec</th>
                          <th className="px-3 py-2 font-semibold">Subject</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {f.subs.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium">{s.year.replace(' Year', '')}</td>
                            <td className="px-3 py-2 font-medium">{s.section}</td>
                            <td className="px-3 py-2 truncate max-w-[100px]" title={s.name}>{s.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                    <p className="text-center text-xs text-slate-400 italic">No subjects assigned yet.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Hours / Week</span>
                  <span className="font-mono-custom text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{f.weeklyHours}h</span>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedFacultyId(f.id);
                    router.push('/faculty-schedule');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-[#003B5C] bg-white px-4 py-2 text-[11px] font-bold tracking-widest text-slate-800 transition hover:bg-slate-50"
                >
                  VIEW TIMETABLE <ArrowRight size={14} strokeWidth={3} className="text-[#003B5C]" />
                </button>
              </div>

            </div>
          );
        })}
        {facultyDerived.length === 0 && (
          <div className="col-span-full"><EmptyState icon={Users} title="No faculty yet" subtitle="Add teaching staff to start assigning subjects." /></div>
        )}
      </div>
      <FacultyModal state={facultyModal} onClose={() => setFacultyModal(null)} onSave={handleSave} />
    </div>
  );
}

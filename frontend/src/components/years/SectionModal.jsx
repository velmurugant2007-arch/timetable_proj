'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';
import Field from '@/components/ui/Field';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import IconButton from '@/components/ui/IconButton';
import { useApp } from '@/context/AppContext';

export default function SectionModal({ state, onClose, onAddYear, onEditYear, onAddSection, onEditSection, onDeleteSection }) {
  const { years } = useApp();
  const [value, setValue] = useState('');
  const [newSection, setNewSection] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionVal, setEditSectionVal] = useState('');
  const [mounted, setMounted] = useState(false);

  // Find live year data to ensure sections stay updated if they are added/removed while modal is open
  const liveYear = state?.yearId ? years.find(y => y.id === state.yearId || y.name === state.yearId) : null;
  const sections = liveYear?.sections || [];

  useEffect(() => {
    setMounted(true);
    if (state?.initialValue) {
      setValue(state.initialValue);
    } else {
      setValue('');
    }
    setNewSection('');
    setEditingSection(null);
    setEditSectionVal('');
  }, [state]);

  if (!state || !mounted) return null;

  let title = '';
  let placeholder = '';
  let submitAction = () => {};

  if (state.mode === 'year') {
    title = 'Add Academic Year';
    placeholder = 'e.g., 5th Year';
    submitAction = () => { onAddYear(value.trim()); onClose(); };
  } else if (state.mode === 'edit-year') {
    title = 'Edit Year & Sections';
    placeholder = 'e.g., 5th Year';
    submitAction = () => { onEditYear(state.yearId, value.trim()); onClose(); };
  }

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:left-72 transition-opacity animate-[fadeIn_.2s_ease]" 
        onClick={onClose} 
      />
      
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl animate-[slideInRight_.3s_ease]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-500" />
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <Field label="Year name">
            <TextInput value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus />
          </Field>
          
          {state.mode === 'edit-year' && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-display text-sm font-bold text-slate-700">Sections in this Year</h4>
              
              <div className="space-y-2">
                {sections.map(s => (
                  <div key={s} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3">
                    {editingSection === s ? (
                      <div className="flex flex-1 items-center gap-2 pr-2">
                        <TextInput 
                          value={editSectionVal} 
                          onChange={(e) => setEditSectionVal(e.target.value)} 
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editSectionVal.trim()) {
                              onEditSection(state.yearId, s, editSectionVal.trim().toUpperCase());
                              setEditingSection(null);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            if (editSectionVal.trim()) {
                              onEditSection(state.yearId, s, editSectionVal.trim().toUpperCase());
                              setEditingSection(null);
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingSection(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-slate-700">Section {s}</span>
                        <div className="flex gap-1">
                          <IconButton icon={Pencil} tone="indigo" title="Edit Section" onClick={() => {
                            setEditingSection(s);
                            setEditSectionVal(s);
                          }} />
                          <IconButton icon={Trash2} tone="rose" title="Delete Section" onClick={() => onDeleteSection(state.yearId, s)} />
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {sections.length === 0 && (
                  <div className="text-sm text-slate-400 italic">No sections added yet.</div>
                )}
              </div>

              <div className="flex items-end gap-2 pt-2">
                <div className="flex-1">
                  <Field label="Add New Section">
                    <TextInput 
                      value={newSection} 
                      onChange={(e) => setNewSection(e.target.value)} 
                      placeholder="e.g., A" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSection.trim()) {
                          onAddSection(state.yearId, newSection.trim().toUpperCase());
                          setNewSection('');
                        }
                      }}
                    />
                  </Field>
                </div>
                <PrimaryButton 
                  icon={Plus} 
                  disabled={!newSection.trim()}
                  onClick={() => {
                    onAddSection(state.yearId, newSection.trim().toUpperCase());
                    setNewSection('');
                  }}
                  className="mb-1"
                >
                  Add
                </PrimaryButton>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex flex-col gap-3 pt-4 border-t border-slate-100">
            <PrimaryButton
              icon={Check}
              disabled={!value.trim()}
              className="w-full justify-center"
              onClick={submitAction}
            >
              {state.mode.includes('edit') ? 'Save Year Name' : 'Add Year'}
            </PrimaryButton>
            <SecondaryButton className="w-full justify-center" onClick={onClose}>
              Done
            </SecondaryButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

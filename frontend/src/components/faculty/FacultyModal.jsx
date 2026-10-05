'use client';
import { useState, useEffect, useRef } from 'react';
import { Check, Upload, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';

/** FacultyModal — prototype lines 2026-2051 */
export default function FacultyModal({ state, onClose, onSave }) {
  const editing = state?.mode === 'edit';
  const [form, setForm] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!state) return setForm(null);
    setForm(editing ? { id: state.data.id, name: state.data.name, image: state.data.image || '', email: state.data.email || '' } : { name: '', image: '', email: '' });
  }, [state]);

  if (!state || !form) return null;

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Faculty' : 'Add Faculty'} width="max-w-sm">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
          {form.image ? (
            <>
              <img src={form.image} alt="Profile" className="h-full w-full object-cover" />
              <button 
                onClick={() => setForm({ ...form, image: '' })}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/50 text-white hover:bg-rose-500 transition-colors"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <Upload size={24} className="mb-1 opacity-50" />
              <span className="text-[10px] font-semibold tracking-wider">UPLOAD</span>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            accept="image/*"
            title="Upload Profile Picture"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => setForm({ ...form, image: reader.result });
              reader.readAsDataURL(file);
            }}
          />
        </div>
        <p className="text-xs text-slate-400 text-center px-4">Upload a profile picture (optional)</p>
      </div>

      <div className="space-y-4">
        <Field label="Faculty Name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Arun" />
        </Field>
        <Field label="Email ID (Optional)">
          <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="arun@college.edu" type="email" />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton icon={Check} onClick={() => onSave(form)} disabled={!form.name}>
          Save
        </PrimaryButton>
      </div>
    </Modal>
  );
}

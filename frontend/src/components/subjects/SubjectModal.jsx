'use client';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';

/** SubjectModal — prototype lines 1973-2023 */
export default function SubjectModal({ state, onClose, onSave, years, faculty }) {
  const editing = state?.mode === 'edit';
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!state) return setForm(null);
    if (editing) setForm(state.data);
    else
      setForm({
        code: '', name: '', year: years[0]?.name || years[0]?.id || '',
        section: years[0]?.sections[0] || 'A', hours: 4,
        facultyId: faculty[0]?.id || '',
        isLab: false,
      });
  }, [state]);

  if (!state || !form) return null;
  const yearObj = years.find((y) => (y.name || y.id) === form.year);
  const sectionsForYear = yearObj?.sections || [];

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Subject' : 'Add Subject'}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Subject Code">
          <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAT101" />
        </Field>
        <Field label="Hours / Week">
          <TextInput type="number" min={1} max={12} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
        </Field>
        <div className="col-span-2">
          <Field label="Subject Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mathematics" />
          </Field>
        </div>
        <Field label="Year">
          <Select
            value={form.year}
            onChange={(v) => {
              const yr = years.find((y) => (y.name || y.id) === v);
              setForm({ ...form, year: v, section: yr?.sections[0] || 'A' });
            }}
            options={years.map((y) => ({ value: y.name || y.id, label: y.name || y.id }))}
          />
        </Field>
        <Field label="Section">
          <Select value={form.section} onChange={(v) => setForm({ ...form, section: v })} options={sectionsForYear.map((s) => ({ value: s, label: s }))} />
        </Field>
        <Field label="Faculty">
          <Select value={form.facultyId} onChange={(v) => setForm({ ...form, facultyId: v })} options={faculty.map((f) => ({ value: f.id, label: f.name }))} />
        </Field>
        <Field label="Subject Type">
          <Select 
            value={form.isLab ? 'lab' : 'theory'} 
            onChange={(v) => setForm({ ...form, isLab: v === 'lab' })} 
            options={[
              { value: 'theory', label: 'Theory Class' },
              { value: 'lab', label: 'Lab Subject' }
            ]} 
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        {(!years.length || !faculty.length) && (
          <div className="mr-auto text-sm text-rose-500 font-medium self-center">
            You must add Years and Faculty before creating a subject manually.
          </div>
        )}
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton 
          icon={Check} 
          onClick={() => onSave(form)} 
          disabled={!form.code || !form.name || !form.year || !form.section || !form.facultyId}
        >
          Save Subject
        </PrimaryButton>
      </div>
    </Modal>
  );
}

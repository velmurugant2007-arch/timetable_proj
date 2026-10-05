'use client';
import { useState, useEffect, useRef } from 'react';
import { Download, Printer, Users } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Select from '@/components/ui/Select';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import { useApp } from '@/context/AppContext';
import { facultyApi } from '@/lib/api';
import FacultyTimetablePrint from '@/components/timetable/FacultyTimetablePrint';

export default function FacultySchedulePage() {
  const { faculty, selectedFacultyId, setSelectedFacultyId, config, addToast } = useApp();
  const [schedule, setSchedule] = useState({});
  const printRef = useRef(null);

  // If no faculty selected yet and faculty list exists, select first
  useEffect(() => {
    if (!selectedFacultyId && faculty.length > 0) {
      setSelectedFacultyId(faculty[0].id);
    }
  }, [faculty, selectedFacultyId, setSelectedFacultyId]);

  const selectedFaculty = faculty.find((f) => f.id === selectedFacultyId) || faculty[0];

  useEffect(() => {
    if (!selectedFaculty?.id) return;
    async function fetchSchedule() {
      try {
        const res = await facultyApi.getSchedule(selectedFaculty.id);
        setSchedule(res.data.data.schedule);
      } catch (err) {
        // Initialize empty schedule
        const byDay = {};
        config.workingDays.forEach((d) => (byDay[d] = Array(config.periodsPerDay).fill(null)));
        setSchedule(byDay);
      }
    }
    fetchSchedule();
  }, [selectedFaculty?.id, config]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportWord = () => {
    addToast('Generating Word Document...', 'success');
    if (!printRef.current) return;

    // Clone the node so we can replace inputs with text without affecting live view
    const container = printRef.current.cloneNode(true);
    
    // Replace input elements with spans containing their current/default values
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value || input.defaultValue || '';
      span.className = input.className;
      input.parentNode.replaceChild(span, input);
    });

    let htmlContent = container.innerHTML;
    
    // Inject Word-specific CSS for vertical text
    htmlContent = htmlContent.replace(/data-mso-rotate="90"/g, 'style="mso-rotate: 90; writing-mode: tb-rl; layout-flow: vertical-ideographic; mso-layout-flow-alt: bottom-to-top; white-space: nowrap; height: 100pt; text-align: center;"');

    // Basic HTML wrapper that MS Word can interpret with A4 Landscape and basic table borders
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Faculty Timetable</title>
        <style>
          @page WordSection1 {
            size: 841.89pt 595.28pt; /* A4 Landscape */
            mso-page-orientation: landscape;
            margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          }
          div.WordSection1 { page: WordSection1; }
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 10pt; }
          th, td { border: 1pt solid black; padding: 4pt; text-align: center; vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (selectedFaculty?.name || 'Faculty').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Faculty_Timetable_${safeName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-enter print:m-0 print:p-0 print:bg-white print:w-auto print:h-auto">
      <div className="print:hidden">
        <TopBar title="Faculty Schedule" subtitle="View and export individual timetable schedules for each faculty" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 print:hidden">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 font-display text-sm font-bold text-white shadow-sm">
            {selectedFaculty?.name?.split(' ').map((w) => w[0]).slice(-2).join('') || '—'}
          </div>
          <div className="flex-1 max-w-md">
            <Select 
              value={selectedFaculty?.id} 
              onChange={setSelectedFacultyId} 
              options={faculty.map((f) => ({ value: f.id, label: `${f.name}${f.dept ? ` (${f.dept})` : ''}` }))} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SecondaryButton icon={Download} onClick={handleExportWord}>
            Export Word
          </SecondaryButton>
          <PrimaryButton icon={Printer} onClick={handleExportPDF}>
            Export PDF
          </PrimaryButton>
        </div>
      </div>

      <div key={selectedFaculty?.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <FacultyTimetablePrint 
          printRef={printRef}
          faculty={selectedFaculty}
          schedule={schedule}
          config={config}
        />
      </div>
    </div>
  );
}


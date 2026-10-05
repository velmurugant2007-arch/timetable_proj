'use client';
import { useState, useEffect, useRef } from 'react';
import { FileUp, Upload, AlertCircle, FileText, Download, Printer, Maximize2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import Modal from '@/components/ui/Modal';
import { importedTimetableApi } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import SectionTimetablePrint from '@/components/timetable/SectionTimetablePrint';

export default function PresentTtImportPage() {
  const { addToast, config, colorMap } = useApp();
  const [docxFiles, setDocxFiles] = useState(null);
  const [uploadingDocx, setUploadingDocx] = useState(false);
  
  const [importedTimetables, setImportedTimetables] = useState({});
  const [loading, setLoading] = useState(true);

  // Individual View State
  const [viewingTimetable, setViewingTimetable] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchImportedTimetables();
  }, []);

  const fetchImportedTimetables = async () => {
    try {
      setLoading(true);
      const res = await importedTimetableApi.getAll();
      if (res.data.success) {
        setImportedTimetables(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch imported timetables", err);
      addToast("Failed to load existing imported timetables.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDocxUpload = async (e) => {
    e.preventDefault();
    if (!docxFiles || docxFiles.length === 0) {
      addToast('Please select at least one .docx file.', 'error');
      return;
    }

    setUploadingDocx(true);
    const formData = new FormData();
    Array.from(docxFiles).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await importedTimetableApi.uploadDocx(formData);
      if (res.data.success) {
        setImportedTimetables(res.data.data.importedTimetables);
        addToast(res.data.data.message || 'Successfully uploaded present timetables!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploadingDocx(false);
      setDocxFiles(null);
      document.getElementById('docx-upload-input').value = '';
    }
  };

  const groupedData = {};
  Object.values(importedTimetables).forEach(tt => {
    if (!groupedData[tt.yearName]) groupedData[tt.yearName] = [];
    groupedData[tt.yearName].push(tt);
  });

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
        <title>Timetable Export</title>
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
    link.download = `Timetable_${viewingTimetable?.yearName}_${viewingTimetable?.section}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-enter print:m-0 print:p-0 print:bg-white print:w-auto print:h-auto">
      <div className="print:hidden">
        <TopBar 
          title="Present TT Import" 
          subtitle="Upload finalized .docx timetables and securely store them as Present TT." 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Upload .docx Files</h2>
              <p className="text-sm text-slate-500">Extracts schedule grids from Word documents</p>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-100 flex gap-3 text-blue-800">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">How it works:</p>
              <p>Upload your finalized Word documents (e.g., 1st Year, 2nd Year). The system will extract the exact schedules and store them separately. These will NOT conflict with Excel-generated timetables.</p>
            </div>
          </div>

          <form onSubmit={handleDocxUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select .docx Files</label>
              <input 
                id="docx-upload-input"
                type="file" 
                accept=".docx"
                multiple
                onChange={(e) => setDocxFiles(e.target.files)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-lg p-2"
              />
              {docxFiles && docxFiles.length > 0 && (
                <p className="mt-2 text-xs font-medium text-slate-600">{docxFiles.length} file(s) selected.</p>
              )}
            </div>

            <div className="pt-2">
              <PrimaryButton type="submit" disabled={uploadingDocx || !docxFiles || docxFiles.length === 0} className="w-full justify-center">
                {uploadingDocx ? 'Uploading & Parsing...' : 'Upload Timetables'}
              </PrimaryButton>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Current Present TT</h2>
              <p className="text-sm text-slate-500">Timetables currently stored from docx</p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 animate-pulse">Loading imported timetables...</div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">No imported timetables found.</p>
              <p className="text-xs text-slate-400 mt-1">Upload a .docx file to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedData).map(yearName => (
                <div key={yearName} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">{yearName}</h3>
                  <div className="space-y-4">
                    {groupedData[yearName].map(tt => (
                      <div key={tt.section} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex justify-between items-center">
                          <span className="font-bold text-slate-700 text-sm">Section {tt.section}</span>
                          <button 
                            onClick={() => setViewingTimetable(tt)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md"
                          >
                            <Maximize2 size={14} />
                            View Full & Export
                          </button>
                        </div>
                        <div className="overflow-x-auto p-3">
                          <table className="w-full text-xs text-center border-collapse border border-slate-300">
                            <thead>
                              <tr>
                                <th className="border border-slate-300 p-1 bg-slate-50 text-slate-600">Day</th>
                                {[1, 2, 3, 4, 5, 6, 7].map(i => <th key={i} className="border border-slate-300 p-1 bg-slate-50 text-slate-600">{i}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                                <tr key={day}>
                                  <td className="border border-slate-300 p-1 font-bold text-slate-700">{day}</td>
                                  {tt.grid && tt.grid[day] ? tt.grid[day].map((cell, i) => (
                                    <td key={i} className="border border-slate-300 p-1">{cell ? cell.code : '-'}</td>
                                  )) : Array(7).fill(null).map((_, i) => <td key={i} className="border border-slate-300 p-1">-</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Imported: {new Date(groupedData[yearName][0].lastGenerated).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Timetable View Overlay */}
      {viewingTimetable && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-sm overflow-y-auto animate-[fadeIn_.15s_ease] print:relative print:inset-auto print:bg-white print:overflow-visible print:p-0">
          <div className="min-h-screen p-4 md:p-8 flex flex-col items-center print:min-h-0 print:p-0 print:block">
            
            {/* Sticky Header */}
            <div className="sticky top-4 z-10 w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between mb-8 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {viewingTimetable.yearName} - Section {viewingTimetable.section}
                </h2>
                <p className="text-sm text-slate-500">Full Timetable Preview</p>
              </div>
              
              <div className="flex items-center gap-3">
                <SecondaryButton onClick={() => setViewingTimetable(null)}>
                  Close
                </SecondaryButton>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <SecondaryButton icon={Download} onClick={handleExportWord}>
                  Export Word
                </SecondaryButton>
                <PrimaryButton icon={Printer} onClick={handleExportPDF}>
                  Export PDF
                </PrimaryButton>
              </div>
            </div>

            {/* Timetable Content */}
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
              <SectionTimetablePrint 
                printRef={printRef} 
                timetable={{
                  ...viewingTimetable,
                  year: viewingTimetable.yearName
                }} 
                config={config} 
                colorMap={colorMap} 
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

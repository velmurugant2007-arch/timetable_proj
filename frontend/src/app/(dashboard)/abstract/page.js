'use client';
import { useState, useEffect, useRef } from 'react';
import { Printer, RefreshCcw, FileText, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { abstractApi } from '@/lib/api';
import { useApp } from '@/context/AppContext';

export default function AbstractPage() {
  const { addToast } = useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  const fetchAbstract = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await abstractApi.getAbstract();
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch abstract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbstract();
  }, []);

  const exportOptions = {
    A4: { size: '841.89pt 595.28pt', orientation: 'landscape', printSize: 'A4 landscape' },
    A3: { size: '1190.55pt 841.89pt', orientation: 'landscape', printSize: 'A3 landscape' },
    MAX: { size: '1584pt 1224pt', orientation: 'landscape', printSize: 'landscape' }
  };

  const handlePrint = (pageSizeConfig) => {
    // Inject dynamic CSS for print
    const style = document.createElement('style');
    style.id = 'dynamic-print-style';
    style.innerHTML = `
      @page {
        size: ${pageSizeConfig.printSize || 'landscape'};
        margin: ${pageSizeConfig.printMargin || '10mm'};
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('dynamic-print-style');
      if (el) el.remove();
    }, 1000);
  };

  const handleExportWord = (pageSizeConfig) => {
    addToast('Generating Word Document...', 'success');
    if (!printRef.current) return;

    const container = printRef.current.cloneNode(true);
    
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value || input.defaultValue || '';
      span.className = input.className;
      input.parentNode.replaceChild(span, input);
    });

    let htmlContent = container.innerHTML;
    
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Faculty Workload Abstract</title>
        <style>
          @page WordSection1 {
            size: ${pageSizeConfig.size}; /* Configurable Size */
            mso-page-orientation: ${pageSizeConfig.orientation};
            margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          }
          div.WordSection1 { page: WordSection1; }
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 10pt; }
          th, td { border: 1pt solid black; padding: 4pt; text-align: center; vertical-align: middle; }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
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
    link.download = 'Faculty_Workload_Abstract_2025_26.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Faculty Workload Abstract" subtitle="View and print workload abstract for the teaching faculty" />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between items-center hide-on-print">
          <p className="text-sm text-slate-500">
            Workload generated from Master Faculty Timetable.
          </p>
          <div className="flex items-center gap-3">
            <SecondaryButton icon={RefreshCcw} onClick={fetchAbstract} disabled={loading}>
              Refresh
            </SecondaryButton>
            <DropdownMenu
              triggerIcon={Download}
              triggerLabel="Export Word"
              options={[
                { label: 'Export A4', icon: Download, onClick: () => handleExportWord(exportOptions.A4) },
                { label: 'Export A3', icon: Download, onClick: () => handleExportWord(exportOptions.A3) },
                { label: 'Export Maximum', icon: Download, onClick: () => handleExportWord(exportOptions.MAX) }
              ]}
              disabled={!data || data.length === 0}
            />
            <DropdownMenu
              triggerIcon={Printer}
              triggerLabel="Print / PDF"
              options={[
                { label: 'Print A4', icon: Printer, onClick: () => handlePrint(exportOptions.A4) },
                { label: 'Print A3', icon: Printer, onClick: () => handlePrint(exportOptions.A3) },
                { label: 'Print Maximum', icon: Printer, onClick: () => handlePrint(exportOptions.MAX) }
              ]}
              disabled={!data || data.length === 0}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-600 hide-on-print">
            {error}
          </div>
        )}

        <Card className="print-reset">
          <div className="p-4 md:p-6 print-p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                  <p className="text-sm">Calculating workload abstract...</p>
                </div>
              </div>
            ) : !data || data.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400 hide-on-print">
                <FileText size={48} className="opacity-20" />
                <p>No master faculty timetable imported yet.</p>
              </div>
            ) : (
              <div className="print-abstract-container w-full overflow-x-auto">
                <div ref={printRef} className="abstract-print-wrapper bg-white">
                  <div className="mb-6 text-center text-black print-header">
                    <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide text-blue-900">PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY, DINDIGUL</h1>
                    <h2 className="text-sm md:text-md italic text-gray-700">(An Autonomous Institution, Affiliated to Anna University, Chennai)</h2>
                    
                    <h3 className="text-md md:text-lg font-bold uppercase mt-6 mb-6 text-blue-900">FACULTY WORKLOAD PARTICULARS</h3>
                    
                    <div className="flex justify-between items-center text-left font-bold text-sm md:text-md px-2">
                      <div>Dept.: Computer Science & Engineering</div>
                      <div>Academic Year/Sem: 2025-2026 / ODD</div>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-black text-sm text-black abstract-table">
                    <thead>
                      <tr>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold">Sl. No</th>
                        <th rowSpan="2" className="border border-black p-2 text-left font-bold min-w-[200px]">Name of the Faculty</th>
                        <th rowSpan="2" className="border border-black p-2 text-left font-bold min-w-[150px]">Designation</th>
                        <th colSpan="2" className="border border-black p-2 text-center font-bold">Theory Class Hours</th>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold w-24">Practical / Project Class Hours (b)</th>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold w-24">Tutorial Class Hours (c)</th>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold w-24">Placement / Seminar Class Hours (d)</th>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold w-24">Total Contact Hours (a1+a2+b+c+d)</th>
                        <th rowSpan="2" className="border border-black p-2 text-center font-bold w-24">Total work load (a1+(a2+b+c+d)/2)</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-2 text-center font-bold w-12">W(a1)</th>
                        <th className="border border-black p-2 text-center font-bold w-12">S(a2)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                          <td className="border border-black p-1.5 text-center">{row.sNo}</td>
                          <td className="border border-black p-1.5 text-left font-medium">{row.name}</td>
                          <td className="border border-black p-1.5 text-left">{row.designation}</td>
                          {row.isLeave || row.isRelieved ? (
                            <td colSpan="7" className="border border-black p-1.5 text-center font-semibold">
                              {row.remarks || (row.isRelieved ? 'Relieved' : 'On Leave')}
                            </td>
                          ) : (
                            <>
                              <td className="border border-black p-1.5 text-center">{row.theoryW}</td>
                              <td className="border border-black p-1.5 text-center">{row.theoryS}</td>
                              <td className="border border-black p-1.5 text-center">{row.practical}</td>
                              <td className="border border-black p-1.5 text-center">{row.tutorial}</td>
                              <td className="border border-black p-1.5 text-center">{row.placement}</td>
                              <td className="border border-black p-1.5 text-center font-semibold">{row.contactHours}</td>
                              <td className="border border-black p-1.5 text-center font-bold">{row.totalWorkload}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Print Footer / Signatures */}
                  <div className="mt-12 flex justify-between px-4 font-bold text-black print-footer hidden print:flex">
                    <div className="text-center">TT I/C</div>
                    <div className="text-center">HoD-CSE</div>
                    <div className="text-center">Convener</div>
                    <div className="text-center">Principal</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          body {
            background-color: white !important;
          }
          .hide-on-print {
            display: none !important;
          }
          .print-reset {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .print-p-0 {
            padding: 0 !important;
          }
          .abstract-print-wrapper {
            padding: 0px;
            width: 100%;
          }
          .abstract-table {
            font-size: 11pt;
            border-color: #000 !important;
          }
          .abstract-table th, .abstract-table td {
            border-color: #000 !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}

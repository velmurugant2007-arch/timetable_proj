'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Eye,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Trash2,
  UsersRound,
  BookOpen,
  Clock,
  Layers,
  FileText,
  CalendarCheck,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import DropdownMenu from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import { facultyMasterTTApi } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import MasterFacultyTTPrint from '@/components/timetable/MasterFacultyTTPrint';
import IndividualFacultyMasterPrint from '@/components/timetable/IndividualFacultyMasterPrint';

export default function FacultyMasterTTPage() {
  const { addToast } = useApp();

  // Active tab: 'mapping' | 'import' | 'master'
  const [activeTab, setActiveTab] = useState('import');

  // Server state
  const [masterTT, setMasterTT] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload states
  const [ttFile, setTtFile] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [uploadingTT, setUploadingTT] = useState(false);
  const [uploadingMapping, setUploadingMapping] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Search & filter states
  const [mappingSearch, setMappingSearch] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('all'); // 'all' | 'mapped' | 'unmapped' | 'leave'

  // Individual faculty view modal
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [individualModalOpen, setIndividualModalOpen] = useState(false);

  // Refs for printing / exporting
  const masterPrintRef = useRef(null);
  const individualPrintRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await facultyMasterTTApi.getAll();
      if (res.data?.success) {
        setMasterTT(res.data.data?.masterTT || null);
        setMappings(res.data.data?.mappings || []);
      }
    } catch (err) {
      console.error('Failed to fetch faculty master TT data:', err);
      addToast('Failed to load Faculty Master TT data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload Master Staff TT Excel
  const handleTTUpload = async (e) => {
    e.preventDefault();
    if (!ttFile) {
      addToast('Please select a Master Staff TT Excel file (.xlsx, .xls)', 'error');
      return;
    }

    setUploadingTT(true);
    const formData = new FormData();
    formData.append('file', ttFile);

    try {
      const res = await facultyMasterTTApi.upload(formData);
      if (res.data?.success) {
        setMasterTT(res.data.data);
        addToast(res.data.message || 'Master staff timetable imported successfully!', 'success');
        setTtFile(null);
        const input = document.getElementById('tt-file-input');
        if (input) input.value = '';
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload timetable file', 'error');
    } finally {
      setUploadingTT(false);
    }
  };

  // Upload Acronym Mapping Excel
  const handleMappingUpload = async (e) => {
    e.preventDefault();
    if (!mappingFile) {
      addToast('Please select an Acronym Mapping Excel file (.xlsx, .xls)', 'error');
      return;
    }

    setUploadingMapping(true);
    const formData = new FormData();
    formData.append('file', mappingFile);

    try {
      const res = await facultyMasterTTApi.uploadMapping(formData);
      if (res.data?.success) {
        setMappings(res.data.data?.mappings || []);
        if (res.data.data?.masterTT) {
          setMasterTT(res.data.data.masterTT);
        }
        addToast(res.data.message || 'Faculty acronym mappings imported successfully!', 'success');
        setMappingFile(null);
        const input = document.getElementById('mapping-file-input');
        if (input) input.value = '';
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload mapping file', 'error');
    } finally {
      setUploadingMapping(false);
    }
  };

  // Generate / Regenerate Master Faculty TT
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await facultyMasterTTApi.generate();
      if (res.data?.success) {
        setMasterTT(res.data.data);
        addToast('Master Faculty Timetable generated and synchronized successfully!', 'success');
        setActiveTab('master');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to generate master timetable', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Clear data
  const handleClear = async (type = 'all') => {
    if (!window.confirm(`Are you sure you want to clear ${type === 'all' ? 'all' : type} data?`)) {
      return;
    }
    try {
      await facultyMasterTTApi.clear(type);
      await fetchData();
      addToast('Data cleared successfully', 'success');
    } catch (err) {
      addToast('Failed to clear data', 'error');
    }
  };

  // Reusable export logic
  const handleExportWord = (printRef, defaultFileName, pageSizeConfig) => {
    addToast('Generating Word Document...', 'success');
    if (!printRef.current) return;

    // Only export the screen-visible table to prevent duplication from print split views
    const screenTableEl = printRef.current.querySelector('.screen-only-table');
    if (!screenTableEl) {
      addToast('No timetable data to export.', 'error');
      return;
    }

    const htmlContent = screenTableEl.outerHTML;

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Timetable Export</title>
        <style>
          @page WordSection1 {
            size: ${pageSizeConfig.size};
            mso-page-orientation: ${pageSizeConfig.orientation || 'landscape'};
            margin: ${pageSizeConfig.margin || '20.0pt 20.0pt 20.0pt 20.0pt'};
          }
          div.WordSection1 { page: WordSection1; }
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: ${pageSizeConfig.fontSize || '6.5pt'}; }
          th, td { border: 1pt solid black; padding: 1.5pt; text-align: center; vertical-align: middle; }
          .bg-slate-50, .bg-slate-100 { background-color: #f1f5f9; }
          .bg-slate-200 { background-color: #e2e8f0; }
          .bg-emerald-50 { background-color: #ecfdf5; }
          .bg-indigo-50 { background-color: #eef2ff; }
          .bg-amber-50 { background-color: #fffbeb; }
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
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    // Remove it after printing
    setTimeout(() => {
      const el = document.getElementById('dynamic-print-style');
      if (el) el.remove();
    }, 1000);
  };

  const exportOptions = {
    A4: { size: '841.89pt 595.28pt', orientation: 'landscape', printSize: 'A4 landscape' },
    A3: { size: '1190.55pt 841.89pt', orientation: 'landscape', printSize: 'A3 landscape' },
    MAX: { size: '1584pt 1224pt', orientation: 'landscape', printSize: 'landscape' }
  };

  // (Replaced by handleExportWord reusable function above)

  // Filtered lists
  const filteredMappings = mappings.filter((m) => {
    const q = mappingSearch.toLowerCase();
    return (
      (m.fullName && m.fullName.toLowerCase().includes(q)) ||
      (m.acronym && m.acronym.toLowerCase().includes(q)) ||
      (m.designation && m.designation.toLowerCase().includes(q)) ||
      (m.remarks && m.remarks.toLowerCase().includes(q))
    );
  });

  const facultyList = masterTT?.faculty || [];
  const filteredFaculty = facultyList.filter((f) => {
    const q = facultySearch.toLowerCase();
    const matchesSearch =
      (f.fullName && f.fullName.toLowerCase().includes(q)) ||
      (f.acronym && f.acronym.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (facultyFilter === 'mapped') return f.isMapped;
    if (facultyFilter === 'unmapped') return !f.isMapped;
    if (facultyFilter === 'leave') return f.isMedicalLeave;
    return true;
  });

  const totalFacultyCount = facultyList.length;
  const mappedFacultyCount = facultyList.filter((f) => f.isMapped).length;
  const unmappedFacultyCount = facultyList.filter((f) => !f.isMapped).length;
  const leaveFacultyCount = facultyList.filter((f) => f.isMedicalLeave).length;
  const totalHoursSum = facultyList.reduce((acc, f) => acc + (f.totalHours || 0), 0);

  return (
    <div className="page-enter print:m-0 print:p-0 print:bg-white print:w-auto print:h-auto pb-16">
      {/* Top Header */}
      <div className="print:hidden">
        <TopBar
          title="Faculty Master Timetable"
          subtitle="Import Master Staff Timetable, map acronyms, view workloads, and generate full master timetable"
          actions={
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </SecondaryButton>
              {(masterTT?.faculty?.length > 0 || mappings.length > 0) && (
                <SecondaryButton
                  onClick={() => handleClear('all')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Clear Data
                </SecondaryButton>
              )}
            </div>
          }
        />

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 pt-3 sticky top-16 z-20 print:hidden">
          <div className="flex gap-2">
            {/* Tab 2: Master Staff TT Import */}
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'import'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Master Staff TT Import</span>
              {totalFacultyCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-bold">
                  {totalFacultyCount}
                </span>
              )}
            </button>

            {/* Tab 1: Acronym Mapping */}
            <button
              onClick={() => setActiveTab('mapping')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'mapping'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Faculty Acronym Mapping</span>
              {mappings.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  {mappings.length}
                </span>
              )}
            </button>

            {/* Tab 3: Master Faculty Timetable */}
            <button
              onClick={() => setActiveTab('master')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'master'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Master Faculty Timetable</span>
              {masterTT?.isGenerated && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-bold">
                  Generated
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
        {/* ==================================================================== */}
        {/* TAB 1: ACRONYM MAPPING                                               */}
        {/* ==================================================================== */}
        {activeTab === 'mapping' && (
          <div className="space-y-6">
            {/* Upload Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    Upload Faculty Acronym Mapping List
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload the faculty name list Excel file (e.g.{' '}
                    <code className="text-indigo-600 font-semibold">Name list updated.xlsx</code>). The system will extract
                    the serial number, faculty name, acronym (e.g. DSS, NU, KD), designation, and medical leave status.
                  </p>
                </div>
                {mappings.length > 0 && (
                  <button
                    onClick={() => handleClear('mappings')}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  >
                    Clear Mappings
                  </button>
                )}
              </div>

              <form onSubmit={handleMappingUpload} className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  id="mapping-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setMappingFile(e.target.files?.[0] || null)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-sm text-slate-600 cursor-pointer"
                />
                <PrimaryButton type="submit" disabled={!mappingFile || uploadingMapping}>
                  <Upload className={`w-4 h-4 mr-1.5 ${uploadingMapping ? 'animate-spin' : ''}`} />
                  {uploadingMapping ? 'Uploading & Parsing...' : 'Import Acronym Mappings'}
                </PrimaryButton>
              </form>
            </div>

            {/* Mappings Summary & Table */}
            {mappings.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Stats Row */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold">Total Faculty Listed</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">{mappings.length}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold">Professors / Heads</div>
                    <div className="text-xl font-bold text-indigo-600 mt-0.5">
                      {mappings.filter((m) => m.designation?.toLowerCase().includes('professor')).length}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold">Medical Leave</div>
                    <div className="text-xl font-bold text-red-600 mt-0.5">
                      {mappings.filter((m) => m.isMedicalLeave).length}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 font-semibold">Acronyms Defined</div>
                    <div className="text-xl font-bold text-emerald-600 mt-0.5">
                      {mappings.filter((m) => m.acronym).length}
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by faculty name, acronym (e.g. DSS), designation..."
                      value={mappingSearch}
                      onChange={(e) => setMappingSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Showing <span className="font-bold text-slate-800">{filteredMappings.length}</span> of{' '}
                    <span className="font-bold text-slate-800">{mappings.length}</span> entries
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100/70 text-slate-700 uppercase text-xs font-bold sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">S.No</th>
                        <th className="py-3 px-4 w-28 text-center">Acronym</th>
                        <th className="py-3 px-4">Faculty Full Name</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4">Status / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMappings.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 text-center text-slate-500 font-semibold">{m.sNo}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs">
                              {m.acronym || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{m.fullName}</td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">{m.designation}</td>
                          <td className="py-2.5 px-4">
                            {m.isMedicalLeave ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                <HeartPulse className="w-3 h-3" />
                                {m.remarks || 'MEDICAL LEAVE'}
                              </span>
                            ) : m.remarks ? (
                              <span className="text-xs text-slate-500 italic">{m.remarks}</span>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Acronym Mappings Imported Yet</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Upload your <code className="text-indigo-600">Name list updated.xlsx</code> above. It maps short acronyms
                  like DSS, NU, KD into their full names and designations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: MASTER STAFF TT IMPORT                                        */}
        {/* ==================================================================== */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Upload Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-600" />
                    Import Master Staff Timetable Excel
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload your Master Staff Timetable or Individual Timetable file (e.g.{' '}
                    <code className="text-indigo-600 font-semibold">MASTER STAFF TT 25-26 EVEN.xlsx</code> or{' '}
                    <code className="text-indigo-600 font-semibold">INDIVIDUAL TT.docx</code>). The system will automatically
                    extract and organize all faculty schedules into the master format.
                  </p>
                </div>
                {totalFacultyCount > 0 && (
                  <button
                    onClick={() => handleClear('timetable')}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  >
                    Clear Timetable
                  </button>
                )}
              </div>

              <form onSubmit={handleTTUpload} className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  id="tt-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv, .docx, .doc"
                  onChange={(e) => setTtFile(e.target.files?.[0] || null)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-sm text-slate-600 cursor-pointer"
                />
                <PrimaryButton type="submit" disabled={!ttFile || uploadingTT}>
                  <Upload className={`w-4 h-4 mr-1.5 ${uploadingTT ? 'animate-spin' : ''}`} />
                  {uploadingTT ? 'Uploading & Parsing...' : 'Import Master Staff TT'}
                </PrimaryButton>
              </form>
            </div>

            {/* Timetable Overview & Faculty List */}
            {totalFacultyCount > 0 ? (
              <div className="space-y-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                      <span>Total Faculty</span>
                      <UsersRound className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{totalFacultyCount}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Faculty schedules extracted</div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                      <span>Mapped to Names</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{mappedFacultyCount}</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      {mappings.length > 0 ? 'Matched with mapping list' : 'Upload mapping file to match'}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                      <span>Unmapped Acronyms</span>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{unmappedFacultyCount}</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">Shown with original acronym</div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                      <span>Total Work Hours</span>
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-blue-600 mt-1">{totalHoursSum}</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">Teaching hours per week</div>
                  </div>
                </div>

                {/* Faculty Summary Table Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Table Header & Filters */}
                  <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search faculty by name, acronym..."
                          value={facultySearch}
                          onChange={(e) => setFacultySearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Filter Badges */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                        <button
                          onClick={() => setFacultyFilter('all')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            facultyFilter === 'all' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                          }`}
                        >
                          All ({totalFacultyCount})
                        </button>
                        <button
                          onClick={() => setFacultyFilter('mapped')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            facultyFilter === 'mapped' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Mapped ({mappedFacultyCount})
                        </button>
                        <button
                          onClick={() => setFacultyFilter('unmapped')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            facultyFilter === 'unmapped' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-600'
                          }`}
                        >
                          Unmapped ({unmappedFacultyCount})
                        </button>
                        {leaveFacultyCount > 0 && (
                          <button
                            onClick={() => setFacultyFilter('leave')}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              facultyFilter === 'leave' ? 'bg-white shadow text-red-700 font-bold' : 'text-slate-600'
                            }`}
                          >
                            Leave ({leaveFacultyCount})
                          </button>
                        )}
                      </div>
                    </div>

                    <PrimaryButton onClick={handleGenerate} disabled={generating}>
                      <Sparkles className={`w-4 h-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Generating...' : 'Generate Master TT'}
                    </PrimaryButton>
                  </div>

                  {/* Faculty Table */}
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100/70 text-slate-700 uppercase text-xs font-bold sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">Sl.No</th>
                          <th className="py-3 px-4 w-24 text-center">Acronym</th>
                          <th className="py-3 px-4">Faculty Member Name</th>
                          <th className="py-3 px-4">Designation</th>
                          <th className="py-3 px-4 w-32 text-center">Weekly Hours</th>
                          <th className="py-3 px-4 w-36 text-center">Mapping Status</th>
                          <th className="py-3 px-4 w-28 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredFaculty.map((fac, idx) => (
                          <tr key={fac.acronym || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-center text-slate-500 font-bold">{fac.slNo || idx + 1}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">
                                {fac.acronym}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {fac.fullName || fac.acronym}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {fac.designation || '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-extrabold text-sm">
                              {fac.isMedicalLeave ? (
                                <span className="text-slate-400 font-normal text-xs">0 hrs</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {fac.totalHours || 0} hrs
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {fac.isMedicalLeave ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                  <HeartPulse className="w-3 h-3" /> Medical Leave
                                </span>
                              ) : fac.isMapped ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Mapped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3" /> Unmapped
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => {
                                  setViewingFaculty(fac);
                                  setIndividualModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View TT
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Master Staff Timetable Imported Yet</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Upload your <code className="text-indigo-600">MASTER STAFF TT 25-26 EVEN.xlsx</code> above. The system
                  will automatically parse all 44 faculty rows and each period's class assignment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: MASTER FACULTY TIMETABLE                                      */}
        {/* ==================================================================== */}
        {activeTab === 'master' && (
          <div className="space-y-6 print:space-y-0">
            {/* Actions Bar (Hidden in Print) */}
            <div className="print:hidden bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {masterTT?.meta?.department || 'Department of Computer Science and Engineering'}
                </h3>
                <p className="text-xs text-slate-500">
                  {masterTT?.meta?.semester || '2025-26 Even Semester'} • {totalFacultyCount} Faculty Members • {totalHoursSum} Total Weekly Hours
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PrimaryButton onClick={handleGenerate} disabled={generating || totalFacultyCount === 0}>
                  <Sparkles className={`w-4 h-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Regenerating...' : 'Regenerate Master TT'}
                </PrimaryButton>
                {masterTT && (
                  <div className="flex items-center gap-2">
                    <DropdownMenu
                      triggerIcon={Printer}
                      triggerLabel="Print / PDF"
                      options={[
                        { label: 'Print A4', icon: Printer, onClick: () => handlePrint(exportOptions.A4) },
                        { label: 'Print A3', icon: Printer, onClick: () => handlePrint(exportOptions.A3) },
                        { label: 'Print Maximum', icon: Printer, onClick: () => handlePrint(exportOptions.MAX) }
                      ]}
                    />
                    <DropdownMenu
                      triggerIcon={Download}
                      triggerLabel="Export Word"
                      options={[
                        { label: 'Export A4', icon: Download, onClick: () => handleExportWord(masterPrintRef, `Master_Faculty_Timetable_${masterTT?.meta?.semester?.replace(/\s+/g, '_') || 'Export'}.doc`, exportOptions.A4) },
                        { label: 'Export A3', icon: Download, onClick: () => handleExportWord(masterPrintRef, `Master_Faculty_Timetable_${masterTT?.meta?.semester?.replace(/\s+/g, '_') || 'Export'}.doc`, exportOptions.A3) },
                        { label: 'Export Maximum', icon: Download, onClick: () => handleExportWord(masterPrintRef, `Master_Faculty_Timetable_${masterTT?.meta?.semester?.replace(/\s+/g, '_') || 'Export'}.doc`, exportOptions.MAX) }
                      ]}
                    />
                    <SecondaryButton onClick={() => handleClear('master')} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Clear TT
                    </SecondaryButton>
                  </div>
                )}
              </div>
            </div>

            {/* Grid Display */}
            {totalFacultyCount > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 overflow-hidden print:border-none print:shadow-none print:p-0 print:overflow-visible">
                <MasterFacultyTTPrint data={masterTT} printRef={masterPrintRef} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Timetable Generated Yet</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Please go to the <span className="font-semibold text-indigo-600">Master Staff TT Import</span> tab to
                  upload your timetable file first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Faculty Timetable Modal */}
      {individualModalOpen && viewingFaculty && (
        <Modal
          isOpen={individualModalOpen}
          onClose={() => setIndividualModalOpen(false)}
          title={`Individual Timetable: ${viewingFaculty.fullName || viewingFaculty.acronym}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-200 hide-on-print">
              <SecondaryButton onClick={() => setIndividualModalOpen(false)}>
                Close
              </SecondaryButton>
              <DropdownMenu
                triggerIcon={Printer}
                triggerLabel="Print / PDF"
                options={[
                  { label: 'Print Portrait (A4)', icon: Printer, onClick: () => handlePrint({ printSize: 'portrait' }) },
                  { label: 'Print Landscape (A4)', icon: Printer, onClick: () => handlePrint({ printSize: 'landscape' }) }
                ]}
              />
              <DropdownMenu
                triggerIcon={Download}
                triggerLabel="Export Word"
                options={[
                  { label: 'Export Portrait (A4)', icon: Download, onClick: () => handleExportWord(individualPrintRef, `Faculty_Timetable_${viewingFaculty?.acronym}.doc`, { size: '595.28pt 841.89pt', orientation: 'portrait' }) },
                  { label: 'Export Landscape (A4)', icon: Download, onClick: () => handleExportWord(individualPrintRef, `Faculty_Timetable_${viewingFaculty?.acronym}.doc`, { size: '841.89pt 595.28pt', orientation: 'landscape' }) }
                ]}
              />
            </div>

            {/* Individual Print Component */}
            <div className="overflow-x-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              <IndividualFacultyMasterPrint
                faculty={viewingFaculty}
                meta={masterTT?.meta}
                printRef={individualPrintRef}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

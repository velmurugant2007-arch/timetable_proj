'use client';
import { useRef, useState, useEffect } from 'react';
import { Printer, FileText, Download, Upload, AlertCircle, Edit2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import EmptyState from '@/components/ui/EmptyState';
import DropdownMenu from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import { useApp } from '@/context/AppContext';
import { masterTimetableApi, subjectsApi, importedTimetableApi } from '@/lib/api';
import MasterTimetablePrint from '@/components/timetable/MasterTimetablePrint';

export default function MasterTimetablePage() {
  const { timetables, setTimetables, setSubjects, setYears, config, years, addToast } = useApp();
  const printRef = useRef(null);
  
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [fetchingSheets, setFetchingSheets] = useState(false);

  // Imported Timetable State (.docx)
  const [importedTimetables, setImportedTimetables] = useState({});
  const [showPresentTT, setShowPresentTT] = useState(false);

  useEffect(() => {
    importedTimetableApi.getAll()
      .then(res => {
        if (res.data.success) setImportedTimetables(res.data.data);
      })
      .catch(err => console.error("Failed to load imported timetables", err));
  }, []);

  // Edit Elective State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingElective, setEditingElective] = useState(null);
  const [newElectiveCode, setNewElectiveCode] = useState('');
  const [newElectiveName, setNewElectiveName] = useState('');
  const [savingElective, setSavingElective] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (!selectedFile) {
      setSheets([]);
      setSelectedSheet('');
      return;
    }

    setFetchingSheets(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await masterTimetableApi.getSheets(formData);
      if (res.data.success) {
        setSheets(res.data.data.sheets);
        // Pre-select "CSE" if it exists, otherwise the first one
        const defaultSheet = res.data.data.sheets.find(s => s.toUpperCase() === 'CSE') || res.data.data.sheets[0] || '';
        setSelectedSheet(defaultSheet);
      }
    } catch (err) {
      addToast('Failed to read sheets from Excel file.', 'error');
      setSheets([]);
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select an Excel file first.', 'error');
      return;
    }
    if (!selectedSheet) {
      addToast('Please select a sheet to import.', 'error');
      return;
    }
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetName', selectedSheet);

    try {
      const res = await masterTimetableApi.importAndGenerate(formData);
      if (res.data.success) {
        // Update context with the new data from the backend
        setTimetables(res.data.data.timetables);
        setSubjects(res.data.data.subjects);
        setYears(res.data.data.years);
        
        addToast(`Successfully imported ${res.data.data.coursesImported} courses and generated timetables!`, 'success');
        setImportModalOpen(false);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Import failed.', 'error');
    } finally {
      setImporting(false);
      setFile(null);
    }
  };

  // Docx Upload moved to dedicated Present TT Import module

  function processHtmlForExport(html, isWord = false) {
    let processed = html;
    
    // Inject mso-rotate for vertical text into table cells directly with explicit height and flow rules
    if (isWord) {
      processed = processed.replace(/data-mso-rotate="90"/g, 'style="mso-rotate: 90; writing-mode: tb-rl; layout-flow: vertical-ideographic; mso-layout-flow-alt: bottom-to-top; white-space: nowrap; height: 100pt; text-align: center;"');
    } else {
      // Excel perfectly supports pure mso-rotate
      processed = processed.replace(/data-mso-rotate="90"/g, 'style="mso-rotate: 90; white-space: nowrap; text-align: center;"');
    }

    // Replace <wbr> with <br> for proper stacking in Word/Excel
    processed = processed.replace(/<wbr\s*\/?>/g, '<br style="mso-data-placement:same-cell;" />');

    // Remove img tags to prevent broken image icons
    processed = processed.replace(/<img[^>]*>/g, '');

    if (isWord) {
      // Force table to 100% width via inline attribute so Word respects it
      processed = processed.replace(/<table/g, '<table width="100%"');
      
      // Inject colgroup to force equal column widths for periods, and narrow for class/sec
      // There are 2 header cols + 6 days * 7 periods = 44 columns total.
      const totalCols = 2 + (config.workingDays.length * config.periodsPerDay);
      const periodColWidth = (96 / (totalCols - 2)).toFixed(2);
      
      let colgroupHtml = '<colgroup><col width="2%"><col width="2%">';
      for (let i = 0; i < totalCols - 2; i++) {
        colgroupHtml += `<col width="${periodColWidth}%">`;
      }
      colgroupHtml += '</colgroup>';
      
      // Insert colgroup right after <table> or <thead>
      processed = processed.replace(/(<table[^>]*>)/i, `$1${colgroupHtml}`);
    }

    return processed;
  }

  const exportOptions = {
    A4: { 
      size: '841.89pt 595.28pt', 
      orientation: 'landscape', 
      printSize: 'A4 landscape',
      fontSize: '3pt',
      cellPadding: '0px',
      margin: '5.0pt 5.0pt 5.0pt 5.0pt',
      titleSize: '7pt',
      headerSize: '4pt'
    },
    A3: { 
      size: '1190.55pt 841.89pt', 
      orientation: 'landscape', 
      printSize: 'A3 landscape',
      fontSize: '4.5pt',
      cellPadding: '0.5px',
      margin: '8.0pt 8.0pt 8.0pt 8.0pt',
      titleSize: '9pt',
      headerSize: '5pt'
    },
    MAX: { 
      size: '1584pt 1224pt', 
      orientation: 'landscape', 
      printSize: 'landscape',
      fontSize: '6pt',
      cellPadding: '1px',
      margin: '10.0pt 10.0pt 10.0pt 10.0pt',
      titleSize: '12pt',
      headerSize: '7pt'
    }
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

  function handleExportWord(pageSizeConfig) {
    const sizeLabel = pageSizeConfig === exportOptions.A4 ? 'A4' : pageSizeConfig === exportOptions.A3 ? 'A3' : 'MAX';
    addToast(`Generating Word Document (${sizeLabel})...`, 'success');

    const { workingDays, periodsPerDay } = config;
    
    // Font sizes — larger since we split rows across 2 pages
    const exportFontSize = pageSizeConfig === exportOptions.A4 ? '5pt' : pageSizeConfig === exportOptions.A3 ? '6.5pt' : '8pt';
    const exportHeaderSize = pageSizeConfig === exportOptions.A4 ? '5.5pt' : pageSizeConfig === exportOptions.A3 ? '7pt' : '9pt';
    const exportTitleSize = pageSizeConfig === exportOptions.A4 ? '9pt' : pageSizeConfig === exportOptions.A3 ? '11pt' : '13pt';
    const exportCellPadding = pageSizeConfig === exportOptions.A4 ? '1px' : pageSizeConfig === exportOptions.A3 ? '1.5px' : '2px';
    const cellHeight = pageSizeConfig === exportOptions.A4 ? '50pt' : pageSizeConfig === exportOptions.A3 ? '65pt' : '80pt';

    // Parse the live DOM table to extract data (only the screen-visible one)
    const screenTableEl = printRef.current.querySelector('.screen-only-table');
    if (!screenTableEl) {
      addToast('No timetable data to export.', 'error');
      return;
    }

    const tbodyRows = screenTableEl.querySelectorAll('tbody tr');
    
    function getCellText(td) {
      return td.textContent.trim();
    }

    // Build a data model of all body rows, tracking year group boundaries
    const bodyData = [];
    for (const tr of tbodyRows) {
      const tds = tr.querySelectorAll('td');
      const rowCells = [];
      for (const td of tds) {
        rowCells.push({
          text: getCellText(td),
          colSpan: parseInt(td.getAttribute('colspan') || '1', 10),
          rowSpan: parseInt(td.getAttribute('rowspan') || '1', 10),
        });
      }
      bodyData.push(rowCells);
    }

    // Identify year group boundaries: each group starts where a CLASS cell (rowSpan > 1) begins
    const yearGroups = []; // array of { startRow, endRow, classText, rowSpan }
    let ri = 0;
    while (ri < bodyData.length) {
      const row = bodyData[ri];
      if (row.length > 0 && row[0].rowSpan > 1) {
        const rs = row[0].rowSpan;
        yearGroups.push({ startRow: ri, endRow: ri + rs - 1, classText: row[0].text, rowSpan: rs });
        ri += rs;
      } else {
        // Single-row year (e.g., ME with only 1 section)
        yearGroups.push({ startRow: ri, endRow: ri, classText: row[0]?.text || '', rowSpan: 1 });
        ri++;
      }
    }

    // Split year groups roughly in half by total rows
    const totalBodyRows = bodyData.length;
    const halfRows = Math.ceil(totalBodyRows / 2);
    let splitIdx = 0;
    let rowCount = 0;
    for (let g = 0; g < yearGroups.length; g++) {
      rowCount += yearGroups[g].rowSpan;
      if (rowCount >= halfRows) {
        splitIdx = g + 1;
        break;
      }
    }
    if (splitIdx === 0) splitIdx = 1;
    if (splitIdx >= yearGroups.length) splitIdx = yearGroups.length - 1;

    const firstHalfGroups = yearGroups.slice(0, splitIdx);
    const secondHalfGroups = yearGroups.slice(splitIdx);

    const fullDays = {
      'MON': 'MONDAY', 'TUE': 'TUESDAY', 'WED': 'WEDNESDAY', 
      'THU': 'THURSDAY', 'FRI': 'FRIDAY', 'SAT': 'SATURDAY'
    };

    const totalCols = 2 + (workingDays.length * periodsPerDay);
    const periodColWidth = (94 / (workingDays.length * periodsPerDay)).toFixed(2);

    function buildColgroup() {
      let cg = '<colgroup><col width="3%"><col width="3%">';
      for (let i = 0; i < workingDays.length * periodsPerDay; i++) {
        cg += `<col width="${periodColWidth}%">`;
      }
      cg += '</colgroup>';
      return cg;
    }

    function buildHeader(pageLabel) {
      let html = '';
      // Row 1: Main Title
      html += `<tr><th colspan="${totalCols}" style="font-size:${exportTitleSize}; padding:4px; text-align:center; border:1px solid black;">PSNA COLLEGE OF ENGINEERING &amp; TECHNOLOGY, DINDIGUL</th></tr>`;
      // Row 2: Subtitle
      html += `<tr><th colspan="${totalCols}" style="font-size:${exportTitleSize}; padding:4px; text-align:center; border:1px solid black;">`;
      html += `<span style="color:#993300;">PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY (An Autonomous Institution, Affiliated to Anna University, Chennai)</span><br/>`;
      html += `<b>DEPARTMENT OF CSE MASTER CLASS TIME TABLE - ODD / EVEN SEMESTER ${pageLabel}</b>`;
      html += `</th></tr>`;
      // Row 3: CLASS, SEC, Day headers
      html += `<tr>`;
      html += `<th rowspan="2" style="border:1px solid black; font-size:${exportHeaderSize}; padding:2px; mso-rotate:90; writing-mode:tb-rl; layout-flow:vertical-ideographic; mso-layout-flow-alt:bottom-to-top; white-space:nowrap; height:50pt;">CLASS</th>`;
      html += `<th rowspan="2" style="border:1px solid black; font-size:${exportHeaderSize}; padding:2px; mso-rotate:90; writing-mode:tb-rl; layout-flow:vertical-ideographic; mso-layout-flow-alt:bottom-to-top; white-space:nowrap; height:50pt;">SEC</th>`;
      for (const day of workingDays) {
        const dayKey = day.substring(0, 3).toUpperCase();
        const dayFull = fullDays[dayKey] || day;
        html += `<th colspan="${periodsPerDay}" style="border:1px solid black; font-size:${exportHeaderSize}; padding:2px; text-align:center;">${dayFull}</th>`;
      }
      html += `</tr>`;
      // Row 4: Period numbers
      html += `<tr>`;
      for (let d = 0; d < workingDays.length; d++) {
        for (let p = 1; p <= periodsPerDay; p++) {
          html += `<th style="border:1px solid black; font-size:${exportHeaderSize}; padding:1px; text-align:center;">${p}</th>`;
        }
      }
      html += `</tr>`;
      return html;
    }

    function emitBodyRows(groups) {
      let html = '';
      for (const group of groups) {
        for (let ri = group.startRow; ri <= group.endRow; ri++) {
          const row = bodyData[ri];
          html += `<tr>`;
          
          let cellIdx = 0;
          const isFirstRowOfGroup = (ri === group.startRow);
          
          if (isFirstRowOfGroup) {
            // Emit CLASS cell
            const classCell = row[cellIdx];
            html += `<td rowspan="${classCell.rowSpan}" style="border:1px solid black; font-size:${exportFontSize}; font-weight:bold; padding:2px; text-align:center;">${classCell.text}</td>`;
            cellIdx++;
          }
          
          // Emit SEC cell
          if (cellIdx < row.length) {
            const secCell = row[cellIdx];
            html += `<td style="border:1px solid black; font-size:${exportFontSize}; font-weight:bold; padding:2px; text-align:center;">${secCell.text}</td>`;
            cellIdx++;
          }
          
          // Emit all period cells
          while (cellIdx < row.length) {
            const cell = row[cellIdx];
            let cellContent = cell.text || '';
            let cellStyle = `border:1px solid black; font-size:${exportFontSize}; padding:${exportCellPadding}; text-align:center; vertical-align:middle;`;
            
            if (cellContent && cellContent !== '-') {
              cellStyle += ` mso-rotate:90; writing-mode:tb-rl; layout-flow:vertical-ideographic; mso-layout-flow-alt:bottom-to-top; white-space:nowrap; height:${cellHeight};`;
              if (cellContent.includes('/')) {
                cellContent = cellContent.split('/').join('<br style="mso-data-placement:same-cell;" />');
              }
            }
            
            html += `<td colspan="${cell.colSpan}" style="${cellStyle}">${cellContent || ''}</td>`;
            cellIdx++;
          }
          
          html += `</tr>`;
        }
      }
      return html;
    }

    function buildPageTable(groups, pageLabel) {
      let html = `<table width="100%" border="1" cellspacing="0" cellpadding="${exportCellPadding}" style="border-collapse:collapse; font-family:Arial; font-size:${exportFontSize}; table-layout:fixed;">`;
      html += buildColgroup();
      html += buildHeader(pageLabel);
      html += emitBodyRows(groups);
      html += `</table>`;
      return html;
    }

    const page1Html = buildPageTable(firstHalfGroups, '(Page 1)');
    const page2Html = buildPageTable(secondHalfGroups, '(Page 2)');

    // Signatures table
    const signaturesHtml = `
      <table width="100%" style="border:none; font-family:Arial; font-size:${exportFontSize}; margin-top:20pt;">
        <tr>
          <td style="border:none; text-align:center; padding-top:30pt; font-weight:bold;">Dept TT i/c</td>
          <td style="border:none; text-align:center; padding-top:30pt; font-weight:bold;">HOD/</td>
          <td style="border:none; text-align:center; padding-top:30pt; font-weight:bold;">TT Convener</td>
          <td style="border:none; text-align:center; padding-top:30pt; font-weight:bold;">Principal</td>
        </tr>
      </table>
    `;

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Master Timetable (${sizeLabel})</title>
        <style>
          @page WordSection1 {
            size: ${pageSizeConfig.size};
            mso-page-orientation: ${pageSizeConfig.orientation};
            margin: ${pageSizeConfig.margin};
            mso-header-margin: 0pt;
            mso-footer-margin: 0pt;
          }
          div.WordSection1 { page: WordSection1; }
          table { border-collapse: collapse; }
          th, td { vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          ${page1Html}
          ${signaturesHtml}
          <br clear="all" style="page-break-before:always; mso-break-type:section-break;" />
          ${page2Html}
          ${signaturesHtml}
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Timetable_${sizeLabel}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportExcel() {
    addToast('Generating Excel File...', 'success');
    let htmlContent = processHtmlForExport(printRef.current.innerHTML, false);

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Master Timetable</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: sans-serif; }
          th, td { border: 1px solid black; text-align: center; vertical-align: middle; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\\ufeff', excelHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Master_Timetable.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const openEditElective = (cell) => {
    setEditingElective(cell);
    setNewElectiveCode('');
    setNewElectiveName(cell.name || '');
    setEditModalOpen(true);
  };

  const handleEditElectiveSubmit = async (e) => {
    e.preventDefault();
    if (!newElectiveCode) return addToast('Course code is required', 'error');

    setSavingElective(true);
    try {
      const res = await subjectsApi.bulkUpdateCode({
        oldCode: editingElective.code,
        newCode: newElectiveCode,
        newName: newElectiveName || editingElective.name
      });
      if (res.data.success) {
        addToast(`Updated elective code for ${res.data.data.updatedCount} subjects!`, 'success');
        setTimetables(res.data.data.timetables);
        setSubjects(res.data.data.subjects);
        setEditModalOpen(false);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update code', 'error');
    } finally {
      setSavingElective(false);
    }
  };

  return (
    <div className="page-enter print:m-0 print:p-0 print:bg-white print:h-auto print:w-auto">
      <div className="print:hidden">
        <TopBar 
          title="Master Timetable" 
          subtitle="A unified view of all class timetables in a single grid." 
        />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Printer size={20} />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-slate-800">Export Master Timetable</p>
              <p className="text-[13px] font-medium text-slate-500">Print to PDF, Word, or Excel/CSV</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {Object.keys(importedTimetables).length > 0 && (
              <button 
                onClick={() => setShowPresentTT(!showPresentTT)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${showPresentTT ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                {showPresentTT ? 'Show Generated Master TT' : 'Generate Present Master TT with Imported Docs TT'}
              </button>
            )}
            <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block"></div>
            <SecondaryButton icon={Upload} onClick={() => setImportModalOpen(true)}>Import Excel</SecondaryButton>
            <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block"></div>
            <SecondaryButton onClick={handleExportExcel} disabled={Object.keys(showPresentTT ? importedTimetables : timetables).length === 0}>
              <Download className="mr-1.5 h-4 w-4 text-emerald-600" />
              Export Excel
            </SecondaryButton>
            <DropdownMenu
              triggerIcon={Download}
              triggerLabel="Export Word"
              options={[
                { label: 'Export A4', icon: Download, onClick: () => handleExportWord(exportOptions.A4) },
                { label: 'Export A3', icon: Download, onClick: () => handleExportWord(exportOptions.A3) },
                { label: 'Export Maximum', icon: Download, onClick: () => handleExportWord(exportOptions.MAX) }
              ]}
              disabled={Object.keys(showPresentTT ? importedTimetables : timetables).length === 0}
            />
            <DropdownMenu
              triggerIcon={Printer}
              triggerLabel="Print / PDF"
              options={[
                { label: 'Print A4', icon: Printer, onClick: () => handlePrint(exportOptions.A4) },
                { label: 'Print A3', icon: Printer, onClick: () => handlePrint(exportOptions.A3) },
                { label: 'Print Maximum', icon: Printer, onClick: () => handlePrint(exportOptions.MAX) }
              ]}
              disabled={Object.keys(showPresentTT ? importedTimetables : timetables).length === 0}
            />
          </div>
        </div>
      </div>
      
      <div className="page-enter">
        <MasterTimetablePrint 
          timetables={showPresentTT ? importedTimetables : timetables} 
          config={config} 
          years={years}
          printRef={printRef} 
          onEditElective={openEditElective}
        />
      </div>

      {/* Edit Elective Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Update Elective Course Code">
        {editingElective && (
          <form onSubmit={handleEditElectiveSubmit} className="space-y-4">
            <div className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              You are updating the placeholder code <strong>{editingElective.code}</strong>. This will instantly update the code across all classes and years that share this specific elective.
            </div>
            
            <TextInput 
              label="Real Course Code" 
              placeholder="e.g. CS2501" 
              value={newElectiveCode} 
              onChange={(e) => setNewElectiveCode(e.target.value)} 
              required
            />
            
            <TextInput 
              label="Course Name (Optional)" 
              placeholder="e.g. Data Analytics" 
              value={newElectiveName} 
              onChange={(e) => setNewElectiveName(e.target.value)} 
            />

            <div className="flex justify-end gap-3 pt-4">
              <SecondaryButton type="button" onClick={() => setEditModalOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={savingElective}>
                {savingElective ? 'Updating...' : 'Update Code Everywhere'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Curriculum Excel">
        <div className="mb-4 rounded-lg bg-blue-50 p-4 border border-blue-100 flex gap-3 text-blue-800">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">How Import Works:</p>
            <p>This will completely clear your current subjects and timetables. It will read the selected department sheet, create new subjects, and automatically generate timetables for ALL years and sections instantly.</p>
          </div>
        </div>

        <form onSubmit={handleImportSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Curriculum Excel File</label>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-lg p-2"
            />
          </div>

          {fetchingSheets && (
            <div className="text-sm text-slate-500 animate-pulse">Reading sheets from file...</div>
          )}

          {sheets.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Department Sheet</label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                {sheets.map(sheet => (
                  <option key={sheet} value={sheet}>{sheet}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <SecondaryButton type="button" onClick={() => setImportModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={importing || !file}>
              {importing ? 'Importing & Generating...' : 'Import & Generate All'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

    </div>
  );
}

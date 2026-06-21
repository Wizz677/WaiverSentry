import React, { useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ExactWaiver, evaluateWaiver, generatePortfolioReport } from '../utils/exactEngine';
import { Upload, Download, FileJson, FileText, FileSpreadsheet, CheckCircle } from 'lucide-react';

export default function OfficialOutputView() {
  const [exactWaivers, setExactWaivers] = useState<ExactWaiver[]>([]);
  const [activeJsonIndex, setActiveJsonIndex] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      alert('File is empty or only contains headers.');
      return;
    }
    
    // Parse header to map index
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['exception_id', 'type', 'requester', 'approver', 'justification', 'start_date', 'end_date', 'status', 'risk_level'];
    
    const missingHeaders = expectedHeaders.filter(eh => !header.includes(eh));
    if (missingHeaders.length > 0) {
      alert(`Malformed CSV. Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }
    
    const parsed: ExactWaiver[] = [];
    for (let i = 1; i < lines.length; i++) {
        // Handle basic commas inside quotes (basic csv parsing)
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(p => p.replace(/^"|"$/g, '').trim()) || [];
        
        if (parts.length >= expectedHeaders.length) {
            const w: any = {};
            header.forEach((h, idx) => {
                if (expectedHeaders.includes(h)) {
                  w[h] = parts[idx] || '';
                }
            });

            // Date validation
            if (Number.isNaN(Date.parse(w.start_date)) || Number.isNaN(Date.parse(w.end_date))) {
               alert(`Row ${i} contains invalid date formats.`);
               return;
            }

            parsed.push(w as ExactWaiver);
        } else {
            alert(`Row ${i} is missing columns.`);
            return;
        }
    }
    setExactWaivers(parsed);
  };

  const generateAndDownloadJSON = () => {
    const results = exactWaivers.map(w => evaluateWaiver(w));
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expected_output.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAndDownloadReport = () => {
    const reportText = generatePortfolioReport(exactWaivers);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAndDownloadPDF = () => {
    const reportText = generatePortfolioReport(exactWaivers);
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(reportText, 180);
    doc.text(lines, 10, 10);
    doc.save('portfolio_report.pdf');
  };

  const generateAndDownloadExcel = () => {
    const results = exactWaivers.map(w => {
      const evaluation = evaluateWaiver(w);
      return {
        ...w,
        Risk_Level: evaluation.risk_level,
        Alerts_Count: evaluation.alerts.length,
        Alerts: evaluation.alerts.join('; '),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Waivers");
    XLSX.writeFile(workbook, "waivers_output.xlsx");
  };

  const loadSample = () => {
    const sampleCSV = `exception_id, type, requester, approver, justification, start_date, end_date, status, risk_level
EXC-001,admin_access,john.doe,alice.smith,Production troubleshooting,2026-02-15,2026-04-15,ACTIVE,HIGH
EXC-002,firewall_rule_open,ops.team,bob.jones,Integration with Partner Ltd,2025-11-20,2026-04-20,ACTIVE,MEDIUM
EXC-003,encryption_waiver,dev.lead,security.lead,Legacy system compatibility,2023-06-01,2024-06-01,EXPIRED,HIGH
EXC-00145,admin_access,bob.dylan,sam.sepiol,Temporary,2025-10-15,2025-12-15,ACTIVE,HIGH
`;
    parseCSV(sampleCSV);
  }

  return (
    <div className="h-full bg-[#0a0b0e] flex font-sans overflow-hidden text-slate-300">
      <div className="flex-1 border-r border-[#1e293b] flex flex-col">
        <div className="p-6 border-b border-[#1e293b]">
          <h2 className="text-xl font-semibold text-white">Official Engine Output</h2>
          <p className="text-xs text-slate-400 mt-1">Parses exact 9-column CSV to exact hackathon evaluation outputs.</p>

          <div className="flex items-center gap-3 mt-4">
             <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
             </label>
             <button onClick={loadSample} className="bg-[#1e293b] hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700">
                Load Sample
             </button>
             {exactWaivers.length > 0 && (
                 <>
                   <div className="w-px h-6 bg-slate-700 mx-2"></div>
                   <button onClick={generateAndDownloadJSON} className="bg-[#1e293b] hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700">
                     <FileJson className="w-4 h-4 text-emerald-400" />
                     Download JSON
                   </button>
                   <button onClick={generateAndDownloadReport} className="bg-[#1e293b] hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700">
                     <FileText className="w-4 h-4 text-amber-400" />
                     Download Portfolio (.TXT)
                   </button>
                   <button onClick={generateAndDownloadPDF} className="bg-[#1e293b] hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700">
                     <FileText className="w-4 h-4 text-rose-400" />
                     Download PDF
                   </button>
                   <button onClick={generateAndDownloadExcel} className="bg-[#1e293b] hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700">
                     <FileSpreadsheet className="w-4 h-4 text-green-400" />
                     Download Excel
                   </button>
                 </>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {exactWaivers.length === 0 ? (
                <div className="text-center text-slate-500 mt-20 text-sm">
                    No data loaded. Upload the official CSV or load the sample.
                </div>
            ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span>{exactWaivers.length} Records Loaded</span>
                    <span className="text-indigo-400">EVALUATION_DATE: 2026-04-15</span>
                  </div>
                  
                  <div className="grid gap-3">
                    {exactWaivers.map((w, i) => {
                        const result = evaluateWaiver(w);
                        let riskColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                        if (result.risk_level === 'MEDIUM') riskColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        if (result.risk_level === 'HIGH') riskColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                        if (result.risk_level === 'CRITICAL') riskColor = 'text-red-400 bg-red-500/10 border-red-500/20';

                        return (
                            <div key={i} className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => setActiveJsonIndex(i)}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                     <h3 className="text-sm font-semibold text-white">{w.exception_id} · <span className="font-mono text-xs font-normal text-slate-400">{w.type}</span></h3>
                                     <p className="text-xs text-slate-400 mt-1 block">Ends: {w.end_date} | Status: {w.status}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskColor}`}>
                                      {result.risk_level}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 bg-[#0a0b0e] p-2 rounded border border-slate-800">
                                   <strong>{result.alerts.length} Alerts:</strong>
                                   <ul className="list-disc list-inside ml-1 mt-1 space-y-0.5">
                                      {result.alerts.map((a, aidx) => (
                                          <li key={aidx} className="truncate">{a}</li>
                                      ))}
                                      {result.alerts.length === 0 && <li>None</li>}
                                   </ul>
                                </div>
                            </div>
                        )
                    })}
                  </div>
                </div>
            )}
        </div>
      </div>

      <div className="w-[40%] bg-[#0a0b0e] flex flex-col">
        {activeJsonIndex !== null ? (
            <>
                <div className="p-4 border-b border-[#1e293b] bg-[#0f172a]/50">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                       <CheckCircle className="w-4 h-4 text-emerald-400" />
                       Exact Per-Record JSON
                    </h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
                        {JSON.stringify(evaluateWaiver(exactWaivers[activeJsonIndex]), null, 2)}
                    </pre>
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs p-6 text-center">
                Select a record from the list to view the exact JSON output formatted for evaluation.
            </div>
        )}
      </div>
    </div>
  );
}

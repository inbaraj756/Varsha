import React, { useState } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { RollEntry, LedgerStats } from '../types.ts';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RollEntry[];
  stats: LedgerStats;
  currencySymbol: string;
  isAdmin: boolean;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  entries,
  stats,
  currencySymbol,
  isAdmin,
}) => {
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    setPrintNotice(null);
    try {
      window.print();
    } catch {
      // ignore
    }
    if (window.self !== window.top) {
      setPrintNotice('If print dialog does not open in preview, click "Download Slip (HTML)" or "CSV Export".');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Roll Number', 'Name', 'Entries', 'Unit Rate', 'Total Amount'];
    const rows = entries.map((e) => [
      e.rollNumber,
      `"${e.name || `Roll ${e.rollNumber}`}"`,
      e.entries,
      stats.unitRate,
      isAdmin ? e.entries * stats.unitRate : 'Protected',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Varsha_Ledger_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTMLSlip = () => {
    const dateStr = new Date().toLocaleDateString();
    const rowsHtml = entries
      .map(
        (item) => `
      <tr style="${item.entries > 0 ? 'background:#f0fdf4;' : ''}">
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;">#${item.rollNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${item.name || `Roll ${item.rollNumber}`}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${item.entries}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;">${
          isAdmin ? `${currencySymbol}${(item.entries * stats.unitRate).toLocaleString()}` : 'Protected'
        }</td>
      </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Varsha - Roll 301 to 400 Ledger Report</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:820px;margin:24px auto;padding:0 16px;">
  <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <h1 style="margin:0;font-size:22px;">Varsha - Roll 301 to 400 Ledger Report</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Generated on ${dateStr} · 1 Entry = ${currencySymbol}${stats.unitRate}</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;">
    <div><div style="color:#64748b;font-size:10px;text-transform:uppercase;">Total Rolls</div><strong>100 Students</strong></div>
    <div><div style="color:#64748b;font-size:10px;text-transform:uppercase;">Active Entries</div><strong>${isAdmin ? `${stats.totalEntries} entries` : 'Admin Only'}</strong></div>
    <div><div style="color:#64748b;font-size:10px;text-transform:uppercase;">Rate Formula</div><strong>1 Entry = ${currencySymbol}${stats.unitRate}</strong></div>
    <div><div style="color:#64748b;font-size:10px;text-transform:uppercase;">Grand Total Sum</div><strong>${isAdmin ? `${currencySymbol}${stats.totalSum.toLocaleString()}` : 'Admin Only'}</strong></div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;">
    <thead>
      <tr style="background:#f1f5f9;text-align:left;">
        <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;">Roll #</th>
        <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;">Name</th>
        <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Entries</th>
        <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Amount (${currencySymbol})</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Varsha_Ledger_Slip_${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity print:static print:inset-auto print:block print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col print:static print:max-h-none print:shadow-none print:border-0 print:rounded-none print:w-full print:max-w-none print:block print:p-0 print:bg-white print:text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0 print:border-slate-300">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
              Varsha - Roll 301 to 400 Ledger Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
              Generated on {new Date().toLocaleDateString()} · 1 Entry = {currencySymbol}{stats.unitRate}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadHTMLSlip}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Save Slip (HTML)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {printNotice && (
          <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2 print:hidden">
            <span>{printNotice}</span>
            <button
              type="button"
              onClick={handleDownloadHTMLSlip}
              className="px-2.5 py-1 bg-indigo-600 text-white rounded font-semibold whitespace-nowrap cursor-pointer"
            >
              Save Slip
            </button>
          </div>
        )}

        {/* Printable Paper Area */}
        <div className="overflow-y-auto py-4 space-y-4 print:overflow-visible print:p-0 print:pt-4">
          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs print:bg-slate-50 print:border-slate-300">
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Total Rolls</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">100 Students</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Active Entries</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                {isAdmin ? `${stats.totalEntries} entries` : 'Admin Only'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Rate Formula</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                1 Entry = {currencySymbol}{stats.unitRate}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Grand Total Sum</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                {isAdmin ? `${currencySymbol}${stats.totalSum.toLocaleString()}` : 'Admin Only'}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden print:border-slate-300">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans font-semibold print:bg-slate-100 print:text-slate-900">
                <tr>
                  <th className="py-2 px-3">Roll #</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 text-right">Entries</th>
                  <th className="py-2 px-3 text-right">Amount ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums print:divide-slate-200">
                {entries.map((item) => (
                  <tr
                    key={item.rollNumber}
                    className={item.entries > 0 ? 'bg-emerald-50/20 dark:bg-emerald-950/20 print:bg-emerald-50/30' : ''}
                  >
                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                      #{item.rollNumber}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-800 dark:text-slate-200 print:text-slate-900">
                      {item.name || `Roll ${item.rollNumber}`}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-900 dark:text-slate-100 print:text-slate-900 font-semibold">
                      {item.entries}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                      {currencySymbol}{(item.entries * stats.unitRate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

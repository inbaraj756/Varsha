import React from 'react';
import { X, Printer, Download } from 'lucide-react';
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
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
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
    link.setAttribute('download', `Roll70_Register_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Roll 301 to 400 Ledger Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated on {new Date().toLocaleDateString()} · 1 Entry = {currencySymbol}{stats.unitRate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="overflow-y-auto py-4 space-y-4 print:p-0">
          {/* Summary Box */}
          <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs">
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Total Rolls</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">100 Students</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Active Entries</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAdmin ? `${stats.totalEntries} entries` : 'Admin Only'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Rate Formula</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1 Entry = {currencySymbol}{stats.unitRate}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Grand Total Sum</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAdmin ? `${currencySymbol}${stats.totalSum.toLocaleString()}` : 'Admin Only'}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans font-semibold">
                <tr>
                  <th className="py-2 px-3">Roll #</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 text-right">Entries</th>
                  <th className="py-2 px-3 text-right">Amount ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {entries.map((item) => (
                  <tr
                    key={item.rollNumber}
                    className={item.entries > 0 ? 'bg-emerald-50/20 dark:bg-emerald-950/20' : ''}
                  >
                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      #{item.rollNumber}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-800 dark:text-slate-200">
                      {item.name || `Roll ${item.rollNumber}`}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-900 dark:text-slate-100 font-semibold">
                      {item.entries}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
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

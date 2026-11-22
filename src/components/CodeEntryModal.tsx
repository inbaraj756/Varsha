import React, { useState, useEffect, useMemo } from 'react';
import { X, Code2, Copy, Check, Download, Save, AlertCircle, FileCode2, ListOrdered } from 'lucide-react';
import { RollEntry } from '../types.ts';

interface CodeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RollEntry[];
  unitRate: number;
  currencySymbol: string;
  onApplyEntries: (updatedEntries: RollEntry[]) => Promise<void>;
}

function generateLedgerDataTS(entries: RollEntry[], unitRate: number, currencySymbol: string): string {
  const entriesLines = entries
    .map((e) => {
      const safeName = JSON.stringify(e.name?.trim() || `Roll ${e.rollNumber}`);
      const count = Math.max(0, Number(e.entries) || 0);
      return `  { rollNumber: ${e.rollNumber}, name: ${safeName}, entries: ${count} },`;
    })
    .join('\n');

  return `import { RollEntry } from '../types.ts';

export const LEDGER_CONFIG = {
  title: 'Varsha',
  unitRate: ${unitRate},
  currencySymbol: ${JSON.stringify(currencySymbol)},
  updatedAt: ${JSON.stringify(new Date().toISOString())},
};

export const INITIAL_LEDGER_ENTRIES: RollEntry[] = [
${entriesLines}
];
`;
}

function formatQuickLines(entries: RollEntry[]): string {
  return entries
    .map((e) => `${e.rollNumber} | ${e.name?.trim() || `Roll ${e.rollNumber}`} | ${e.entries}`)
    .join('\n');
}

export const CodeEntryModal: React.FC<CodeEntryModalProps> = ({
  isOpen,
  onClose,
  entries,
  unitRate,
  currencySymbol,
  onApplyEntries,
}) => {
  const [activeTab, setActiveTab] = useState<'lines' | 'code'>('lines');
  const [linesText, setLinesText] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLinesText(formatQuickLines(entries));
      setCodeInput(generateLedgerDataTS(entries, unitRate, currencySymbol));
      setError(null);
      setCopied(false);
    }
  }, [isOpen, entries, unitRate, currencySymbol]);

  const parsedPreview = useMemo(() => {
    const map = new Map<number, { name: string; entries: number }>();
    for (const e of entries) {
      map.set(e.rollNumber, { name: e.name, entries: e.entries });
    }
    const rawLines = linesText.split(/\r?\n/);
    for (const raw of rawLines) {
      const line = raw.trim();
      if (!line) continue;
      // Support "301 | Name | 10" or "301, Name, 10" or "301=10"
      let parts: string[] = [];
      if (line.includes('|')) {
        parts = line.split('|').map((s) => s.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((s) => s.trim());
      } else if (line.includes('=')) {
        const [r, c] = line.split('=').map((s) => s.trim());
        parts = [r, `Roll ${r}`, c];
      }
      if (parts.length >= 2) {
        const roll = parseInt(parts[0].replace(/^#/, ''), 10);
        if (!isNaN(roll) && roll >= 301 && roll <= 400) {
          if (parts.length === 2) {
            const maybeNum = Number(parts[1]);
            if (!isNaN(maybeNum) && parts[1] !== '') {
              map.set(roll, {
                name: map.get(roll)?.name || `Roll ${roll}`,
                entries: Math.max(0, Math.floor(maybeNum)),
              });
            } else {
              map.set(roll, {
                name: parts[1] || `Roll ${roll}`,
                entries: map.get(roll)?.entries || 0,
              });
            }
          } else {
            const namePart = parts.slice(1, parts.length - 1).join(' ').trim();
            const countPart = parseInt(parts[parts.length - 1], 10);
            map.set(roll, {
              name: namePart || `Roll ${roll}`,
              entries: isNaN(countPart) ? (map.get(roll)?.entries || 0) : Math.max(0, countPart),
            });
          }
        }
      }
    }
    return map;
  }, [linesText, entries]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically. Please select and copy manually.');
    }
  };

  const handleDownloadCodeFile = () => {
    const blob = new Blob([codeInput], { type: 'text/typescript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ledgerData.ts';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplyAndSave = async () => {
    setError(null);
    setSaving(true);
    try {
      let nextEntries: RollEntry[] = [];

      if (activeTab === 'lines') {
        nextEntries = entries.map((item) => {
          const parsed = parsedPreview.get(item.rollNumber);
          return {
            ...item,
            name: parsed?.name?.trim() || `Roll ${item.rollNumber}`,
            entries: parsed ? parsed.entries : item.entries,
          };
        });
      } else {
        // Parse JSON array or INITIAL_LEDGER_ENTRIES objects from pasted code
        const map = new Map<number, { name?: string; entries?: number }>();
        const objRegex = /\{\s*["']?rollNumber["']?\s*:\s*(\d+)\s*,\s*["']?name["']?\s*:\s*("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)')\s*,\s*["']?entries["']?\s*:\s*(\d+)/g;
        let match: RegExpExecArray | null;
        let matchCount = 0;

        while ((match = objRegex.exec(codeInput)) !== null) {
          const roll = parseInt(match[1], 10);
          let parsedName = match[3] ?? match[5] ?? `Roll ${roll}`;
          try {
            if (match[2].startsWith('"')) {
              parsedName = JSON.parse(match[2]);
            }
          } catch {
            // keep raw string
          }
          const count = parseInt(match[7], 10);
          if (roll >= 301 && roll <= 400) {
            map.set(roll, { name: parsedName, entries: Math.max(0, count || 0) });
            matchCount++;
          }
        }

        if (matchCount === 0) {
          setError('No valid roll entries found in the pasted code. Expected objects with rollNumber, name, and entries.');
          setSaving(false);
          return;
        }

        nextEntries = entries.map((item) => {
          const found = map.get(item.rollNumber);
          if (!found) return item;
          return {
            ...item,
            name: found.name?.trim() || `Roll ${item.rollNumber}`,
            entries: found.entries ?? item.entries,
          };
        });
      }

      await onApplyEntries(nextEntries);
      onClose();
    } catch {
      setError('Failed to apply and save entries.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
          aria-label="Close code entry"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Code Entry &amp; Codebase Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Edit all roll names &amp; entry counts in bulk or sync directly with <code className="font-mono">src/data/ledgerData.ts</code>.
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('lines');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'lines'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Quick Line Entry (Roll | Name | Entries)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('code');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Codebase File (ledgerData.ts)</span>
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {activeTab === 'lines' ? (
            <>
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Format per line: <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">Roll | Name | Entries</code> (example: <code className="font-mono">301 | Arun Kumar | 12</code> or <code className="font-mono">301, Arun Kumar, 12</code>)
              </div>
              <textarea
                value={linesText}
                onChange={(e) => setLinesText(e.target.value)}
                spellCheck={false}
                rows={14}
                className="w-full flex-1 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span>
                  Saves automatically to <code className="font-mono font-semibold">src/data/ledgerData.ts</code> on Save, or copy/download for manual deployment.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCodeFile}
                    className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ts</span>
                  </button>
                </div>
              </div>
              <textarea
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                spellCheck={false}
                rows={14}
                className="w-full flex-1 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleApplyAndSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Apply & Save to Codebase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

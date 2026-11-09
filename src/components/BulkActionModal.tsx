import React, { useState } from 'react';
import { X, SlidersHorizontal, RotateCcw, Plus, CheckCircle, AlertTriangle } from 'lucide-react';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAddEntries: (fromRoll: number, toRoll: number, count: number) => void;
  onResetAll: () => void;
  unitRate: number;
  onUpdateUnitRate: (newRate: number) => void;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  onClose,
  onBulkAddEntries,
  onResetAll,
  unitRate,
  onUpdateUnitRate,
}) => {
  const [fromRoll, setFromRoll] = useState(301);
  const [toRoll, setToRoll] = useState(400);
  const [entryCount, setEntryCount] = useState(1);
  const [rateInput, setRateInput] = useState(unitRate);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    const start = Math.min(Math.max(301, fromRoll), 400);
    const end = Math.min(Math.max(start, toRoll), 400);
    const count = Math.max(1, entryCount);
    onBulkAddEntries(start, end, count);
    onClose();
  };

  const handleApplyRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateInput >= 0) {
      onUpdateUnitRate(rateInput);
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
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
          aria-label="Close bulk tools"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Admin Bulk Tools
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Batch entry management for 100 roll numbers (301 to 400).
            </p>
          </div>
        </div>

        {/* Section 1: Range Increment */}
        <form onSubmit={handleApplyRange} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 mb-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Add Entries to Range of Roll Numbers
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Add entries to consecutive roll numbers in one click.
          </p>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                From Roll #
              </label>
              <input
                type="number"
                min={301}
                max={400}
                value={fromRoll}
                onChange={(e) => setFromRoll(parseInt(e.target.value) || 301)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                To Roll #
              </label>
              <input
                type="number"
                min={301}
                max={400}
                value={toRoll}
                onChange={(e) => setToRoll(parseInt(e.target.value) || 400)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                + Entries Each
              </label>
              <input
                type="number"
                min={1}
                value={entryCount}
                onChange={(e) => setEntryCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Apply Range (+{entryCount} to Rolls {fromRoll}-{toRoll})
            </button>
          </div>
        </form>

        {/* Section 2: Unit Rate */}
        <form onSubmit={handleApplyRate} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Rate Multiplier (1 Entry = {unitRate})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Default requirement is 1 entry = 100.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={rateInput}
                onChange={(e) => setRateInput(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Save Rate
              </button>
            </div>
          </div>
        </form>

        {/* Section 3: Reset All */}
        <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center gap-2 mb-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold">Reset All 100 Roll Numbers</h3>
          </div>
          <p className="text-xs text-rose-600/90 dark:text-rose-400/80 mb-3">
            Sets all entry counts back to 0. This action cannot be undone.
          </p>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Yes, Reset All to 0
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
            >
              Reset All Entries to 0
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

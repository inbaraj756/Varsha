import React from 'react';
import { RollEntry } from '../types.ts';

interface RollGridSelectorProps {
  entries: RollEntry[];
  selectedRoll: number | null;
  onSelectRoll: (rollNumber: number) => void;
  isAdmin: boolean;
  onQuickAdd: (rollNumber: number, delta: number) => void;
}

export const RollGridSelector: React.FC<RollGridSelectorProps> = ({
  entries,
  selectedRoll,
  onSelectRoll,
  isAdmin,
  onQuickAdd,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Quick Roll Index (301 — 400)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any roll to inspect details. {isAdmin && 'Tap + to increment entry.'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            Has Entries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></span>
            Zero Entries
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 lg:grid-cols-20 gap-1.5">
        {entries.map((item) => {
          const hasEntries = item.entries > 0;
          const isSelected = selectedRoll === item.rollNumber;

          return (
            <div
              key={item.rollNumber}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => onSelectRoll(item.rollNumber)}
                title={`Roll ${item.rollNumber}: ${item.entries} entries (${item.entries * 100})`}
                className={`w-full py-1.5 px-1 rounded-md text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'ring-2 ring-slate-900 dark:ring-white bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                    : hasEntries
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[11px] leading-none">{item.rollNumber}</span>
                {hasEntries && (
                  <span
                    className={`text-[9px] mt-0.5 leading-none px-1 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.entries}
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd(item.rollNumber, 1);
                  }}
                  className="hidden group-hover:flex absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform"
                  title={`Quick +1 Entry for Roll ${item.rollNumber}`}
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

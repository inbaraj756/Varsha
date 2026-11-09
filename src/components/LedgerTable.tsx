import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { RollEntry } from '../types.ts';

interface LedgerTableProps {
  entries: RollEntry[];
  unitRate: number;
  currencySymbol: string;
  isAdmin: boolean;
  onOpenPasswordModal: () => void;
  onUpdateEntry: (rollNumber: number, partial: Partial<RollEntry>) => void;
  selectedRoll: number | null;
  activeTab: 'all' | 'active' | 'zero';
  onSelectTab: (tab: 'all' | 'active' | 'zero') => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  entries,
  unitRate,
  currencySymbol,
  isAdmin,
  onOpenPasswordModal,
  onUpdateEntry,
  selectedRoll,
  activeTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState<'all' | '301-325' | '326-350' | '351-375' | '376-400'>('all');

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // Range filter
      if (rangeFilter === '301-325' && (item.rollNumber < 301 || item.rollNumber > 325)) return false;
      if (rangeFilter === '326-350' && (item.rollNumber < 326 || item.rollNumber > 350)) return false;
      if (rangeFilter === '351-375' && (item.rollNumber < 351 || item.rollNumber > 375)) return false;
      if (rangeFilter === '376-400' && (item.rollNumber < 376 || item.rollNumber > 400)) return false;

      // Tab filter
      if (activeTab === 'active' && item.entries === 0) return false;
      if (activeTab === 'zero' && item.entries > 0) return false;

      // Search query filter (search by roll number or name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRoll = item.rollNumber.toString() === query || `roll ${item.rollNumber}`.includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        if (!matchesRoll && !matchesName) return false;
      }

      return true;
    });
  }, [entries, rangeFilter, activeTab, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors">
      {/* Table Control Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Roll # (301-400) or Name..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Range pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            {(
              [
                { label: 'All 100 (301–400)', value: 'all' },
                { label: '301–325', value: '301-325' },
                { label: '326–350', value: '326-350' },
                { label: '351–375', value: '351-375' },
                { label: '376–400', value: '376-400' },
              ] as const
            ).map((range) => (
              <button
                key={range.value}
                onClick={() => setRangeFilter(range.value)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  rangeFilter === range.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {!isAdmin && (
            <button
              onClick={onOpenPasswordModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>View-Only Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Access Status Banner */}
      {!isAdmin ? (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Public View Only:</strong> You can see roll numbers, entry counts, and calculated sums. Editing is locked.
            </span>
          </div>
          <button
            onClick={onOpenPasswordModal}
            className="underline font-semibold hover:text-amber-950 dark:hover:text-white cursor-pointer"
          >
            Enter Admin Password (Inbaraj) to Edit
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-900/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Admin Mode Active (Inbaraj):</strong> You have full permission to add/decrement entries, edit names, and record notes.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
            Auto-Saving to Server
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4 w-20 text-center">Roll #</th>
              <th className="py-3 px-4 min-w-[160px]">Person Name</th>
              <th className="py-3 px-4 min-w-[200px] text-center">
                Entries Count
              </th>
              <th className="py-3 px-4 text-right min-w-[130px]">
                Calculated Sum ({currencySymbol})
              </th>
              <th className="py-3 px-4 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                  No roll numbers match the current filter.
                </td>
              </tr>
            ) : (
              filteredEntries.map((item) => {
                const totalItemSum = item.entries * unitRate;
                const isHighlighted = selectedRoll === item.rollNumber;

                return (
                  <tr
                    key={item.rollNumber}
                    id={`roll-row-${item.rollNumber}`}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      isHighlighted
                        ? 'bg-amber-50/60 dark:bg-amber-950/20'
                        : item.entries > 0
                        ? 'bg-emerald-50/15 dark:bg-emerald-950/10'
                        : ''
                    }`}
                  >
                    {/* Roll Number */}
                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        #{item.rollNumber}
                      </span>
                    </td>

                    {/* Person Name */}
                    <td className="py-3 px-4 font-sans">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            onUpdateEntry(item.rollNumber, { name: e.target.value })
                          }
                          placeholder={`Roll ${item.rollNumber}`}
                          className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
                        />
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.name || `Roll ${item.rollNumber}`}
                        </span>
                      )}
                    </td>

                    {/* Entries Count Control */}
                    <td className="py-3 px-4 text-center">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEntry(item.rollNumber, {
                                entries: Math.max(0, item.entries - 1),
                              })
                            }
                            disabled={item.entries <= 0}
                            className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Decrement entry (-1)"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={item.entries}
                            onChange={(e) =>
                              onUpdateEntry(item.rollNumber, {
                                entries: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-16 px-1.5 py-1 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEntry(item.rollNumber, {
                                entries: item.entries + 1,
                              })
                            }
                            className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            title="Increment entry (+1)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick +5 badge */}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEntry(item.rollNumber, {
                                entries: item.entries + 5,
                              })
                            }
                            className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                            title="Quick add +5 entries"
                          >
                            +5
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={onOpenPasswordModal}
                          className="inline-flex items-center gap-1.5 cursor-pointer group"
                          title="Click to enter password and edit"
                        >
                          <span
                            className={`font-mono font-bold text-sm tabular-nums px-2.5 py-0.5 rounded ${
                              item.entries > 0
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {item.entries}
                          </span>
                          <Lock className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-colors" />
                        </div>
                      )}
                    </td>

                    {/* Calculated Sum */}
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {currencySymbol}
                        {totalItemSum.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.entries} × {currencySymbol}{unitRate}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateEntry(item.rollNumber, {
                              entries: 0,
                            })
                          }
                          disabled={item.entries === 0}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Reset entries for this roll number"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenPasswordModal}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"
                          title="Locked. Click to enter admin password."
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          Showing <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{filteredEntries.length}</span> of 100 Roll Numbers (301–400)
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-6 font-mono tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">Filtered Entries:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {filteredEntries.reduce((acc, curr) => acc + curr.entries, 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">Filtered Total:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currencySymbol}
                {(filteredEntries.reduce((acc, curr) => acc + curr.entries, 0) * unitRate).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={onOpenPasswordModal}
            className="flex items-center gap-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
            title="Total entries and calculated sum locked. Enter password to view."
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Entries &amp; Sum Protected (Admin Only)</span>
          </div>
        )}
      </div>
    </div>
  );
};

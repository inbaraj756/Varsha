import React from 'react';
import { Calculator, Users, Coins, Lock } from 'lucide-react';
import { LedgerStats } from '../types.ts';

interface StatsCardsProps {
  stats: LedgerStats;
  currencySymbol: string;
  isAdmin: boolean;
  onOpenPasswordModal: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  currencySymbol,
  isAdmin,
  onOpenPasswordModal,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Total Calculated Sum Card - Only visible when admin lock is open */}
      <div
        className={`p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-colors ${
          isAdmin
            ? 'border-slate-200 dark:border-slate-800'
            : 'border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600'
        }`}
        onClick={!isAdmin ? onOpenPasswordModal : undefined}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Calculated Sum
          </span>
          {isAdmin ? (
            <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Lock className="w-4 h-4 text-amber-500" />
          )}
        </div>
        {isAdmin ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
                {currencySymbol}
                {stats.totalSum.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats.totalEntries.toLocaleString()} entries × {currencySymbol}{stats.unitRate} per entry
            </p>
          </>
        ) : (
          <div className="py-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-400 dark:text-slate-500 font-mono tracking-widest">
                ••••••••
              </span>
              <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Hidden for public. Enter password to view.</span>
            </p>
          </div>
        )}
      </div>

      {/* Total Entries Count - Only visible when admin lock is open */}
      <div
        className={`p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-colors ${
          isAdmin
            ? 'border-slate-200 dark:border-slate-800'
            : 'border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600'
        }`}
        onClick={!isAdmin ? onOpenPasswordModal : undefined}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Entries
          </span>
          {isAdmin ? (
            <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <Lock className="w-4 h-4 text-amber-500" />
          )}
        </div>
        {isAdmin ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
                {stats.totalEntries.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">units</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formula: 1 Entry = {currencySymbol}{stats.unitRate}
            </p>
          </>
        ) : (
          <div className="py-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-400 dark:text-slate-500 font-mono tracking-widest">
                ••••••
              </span>
              <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Hidden for public. Enter password to view.</span>
            </p>
          </div>
        )}
      </div>

      {/* Active Persons / Roll Numbers - Publicly visible */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Active Roll Numbers
          </span>
          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
            {stats.activePersons}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            / 100 Rolls (301–400)
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {((stats.activePersons / 100) * 100).toFixed(0)}% with entries recorded
        </p>
      </div>
    </div>
  );
};

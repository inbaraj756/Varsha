import React from 'react';
import { Lock, Unlock, Moon, Sun, Printer, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  isAdmin: boolean;
  onOpenPasswordModal: () => void;
  onLockAdmin: () => void;
  onOpenBulkModal: () => void;
  onOpenPrintModal: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: 'all' | 'active' | 'zero';
  onSelectTab: (tab: 'all' | 'active' | 'zero') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdmin,
  onOpenPasswordModal,
  onLockAdmin,
  onOpenBulkModal,
  onOpenPrintModal,
  darkMode,
  onToggleDarkMode,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              Roll70 Ledger
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 font-mono">
              100 Persons (Rolls 301–400) · 1 Entry = 100
            </span>
          </div>

          {/* Zone 2: Navigation / Filter Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => onSelectTab('all')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'text-slate-900 dark:text-white font-semibold underline underline-offset-8 decoration-2 decoration-slate-900 dark:decoration-white'
                  : ''
              }`}
            >
              Rolls 301–400
            </button>
            <button
              onClick={() => onSelectTab('active')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'active'
                  ? 'text-slate-900 dark:text-white font-semibold underline underline-offset-8 decoration-2 decoration-slate-900 dark:decoration-white'
                  : ''
              }`}
            >
              With Entries
            </button>
            <button
              onClick={() => onSelectTab('zero')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'zero'
                  ? 'text-slate-900 dark:text-white font-semibold underline underline-offset-8 decoration-2 decoration-slate-900 dark:decoration-white'
                  : ''
              }`}
            >
              Zero Entries
            </button>
          </nav>

          {/* Zone 3: Primary Actions (Admin Status & Security Lock) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenPrintModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Print Ledger Report"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            {isAdmin && (
              <button
                onClick={onOpenBulkModal}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Bulk update entries"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Bulk Tools</span>
              </button>
            )}

            {isAdmin ? (
              <button
                onClick={onLockAdmin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
                title="Admin Inbaraj Unlocked. Click to lock."
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Admin Mode (Inbaraj)</span>
                <span className="sm:hidden">Admin</span>
                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.2 rounded font-mono">
                  Lock
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenPasswordModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
                title="Only admin can edit entries. Click to enter password."
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

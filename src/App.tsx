import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { RollGridSelector } from './components/RollGridSelector.tsx';
import { LedgerTable } from './components/LedgerTable.tsx';
import { AdminPasswordModal } from './components/AdminPasswordModal.tsx';
import { BulkActionModal } from './components/BulkActionModal.tsx';
import { PrintReportModal } from './components/PrintReportModal.tsx';
import { RollEntry, LedgerData, LedgerStats } from './types.ts';
import { ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';

const ADMIN_STORAGE_KEY = 'roll70_admin_token';
const LEDGER_LOCAL_KEY = 'roll70_local_ledger';
const EXPECTED_PASSWORD = 'Inbaraj1102';

const START_ROLL = 301;
const END_ROLL = 400;
const TOTAL_ROLLS = 100; // 370 + 30 = 400

const USER_ENTRIES_COUNTS = [
  10, 5, 10, 9, 20, 20, 5, 9, 9, 10, 6, 9, 6, 10, 9, 10, 9, 10, 10, 10,
  10, 9, 10, 10, 8, 7, 10, 10, 6, 5, 6, 6, 10, 8, 10, 10, 10, 10, 9, 9,
  10, 9, 9, 9, 9, 8, 8, 10, 4, 10, 10, 10, 10, 10, 8, 7, 7, 10, 10, 10,
  10, 7, 3, 10, 8, 9, 9, 10, 6, 2, 2
];

// Helper to generate clean initial 100 rolls (301 to 400)
function createInitialRolls(): RollEntry[] {
  return Array.from({ length: TOTAL_ROLLS }, (_, i) => {
    const roll = START_ROLL + i;
    const count = i < USER_ENTRIES_COUNTS.length ? USER_ENTRIES_COUNTS[i] : 0;
    return {
      rollNumber: roll,
      name: `Roll ${roll}`,
      entries: count,
      status: 'unpaid',
      notes: '',
    };
  });
}

function calculateStats(entries: RollEntry[], unitRate: number): LedgerStats {
  let totalEntries = 0;
  let activePersons = 0;
  let paidEntries = 0;
  let unpaidEntries = 0;

  for (const item of entries) {
    const count = Number(item.entries) || 0;
    totalEntries += count;
    if (count > 0) activePersons++;
    if (item.status === 'paid') {
      paidEntries += count;
    } else {
      unpaidEntries += count;
    }
  }

  return {
    totalRollNumbers: entries.length,
    activePersons,
    totalEntries,
    unitRate,
    totalSum: totalEntries * unitRate,
    paidSum: paidEntries * unitRate,
    unpaidSum: unpaidEntries * unitRate,
    paidEntries,
    unpaidEntries,
  };
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) === EXPECTED_PASSWORD;
    } catch {
      return false;
    }
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [ledger, setLedger] = useState<LedgerData>(() => {
    const initialRolls = createInitialRolls();
    return {
      unitRate: 100,
      currencySymbol: '₹',
      title: 'Roll 301 to 400 Entry Register',
      updatedAt: new Date().toISOString(),
      entries: initialRolls,
      stats: calculateStats(initialRolls, 100),
    };
  });

  const [selectedRoll, setSelectedRoll] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'zero'>('all');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState(true);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load from server or localStorage
  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger');
      if (res.ok) {
        const data = await res.json();
        const unitRate = data.unitRate || 100;
        const stats = calculateStats(data.entries, unitRate);
        setLedger({ ...data, unitRate, stats });
        try {
          localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(data));
        } catch {
          // ignore storage quota
        }
      } else {
        // Fallback to local storage if API is not yet ready
        loadFromLocalStorage();
      }
    } catch {
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(LEDGER_LOCAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const unitRate = parsed.unitRate || 100;
        const stats = calculateStats(parsed.entries, unitRate);
        setLedger({ ...parsed, unitRate, stats });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Save changes to backend server
  const saveQueueRef = useRef<NodeJS.Timeout | null>(null);

  const syncWithServer = useCallback(
    async (updatedLedger: LedgerData, currentPassword: string) => {
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/ledger', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: currentPassword || EXPECTED_PASSWORD,
            entries: updatedLedger.entries,
            unitRate: updatedLedger.unitRate,
            title: updatedLedger.title,
            currencySymbol: updatedLedger.currencySymbol,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSaveStatus('saved');
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(data));
          } catch {
            // ignore
          }
        } else {
          setSaveStatus('error');
        }
      } catch {
        // Server offline, cache in local storage
        try {
          localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(updatedLedger));
        } catch {
          // ignore
        }
        setSaveStatus('saved');
      }
    },
    []
  );

  // Handle password unlock
  const handleUnlock = async (enteredPassword: string): Promise<boolean> => {
    const trimmed = enteredPassword.trim();
    if (trimmed === EXPECTED_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword(trimmed);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, trimmed);
      return true;
    }

    // Also check server endpoint
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        setIsAdmin(true);
        setAdminPassword(trimmed);
        sessionStorage.setItem(ADMIN_STORAGE_KEY, trimmed);
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  const handleLockAdmin = () => {
    setIsAdmin(false);
    setAdminPassword('');
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  };

  // Update a single entry
  const handleUpdateEntry = (rollNumber: number, partial: Partial<RollEntry>) => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }

    setLedger((prev) => {
      const newEntries = prev.entries.map((item) => {
        if (item.rollNumber === rollNumber) {
          return { ...item, ...partial };
        }
        return item;
      });

      const updatedStats = calculateStats(newEntries, prev.unitRate);
      const updated: LedgerData = {
        ...prev,
        entries: newEntries,
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      };

      if (saveQueueRef.current) clearTimeout(saveQueueRef.current);
      saveQueueRef.current = setTimeout(() => {
        syncWithServer(updated, adminPassword);
      }, 300);

      return updated;
    });
  };

  // Quick increment from roll grid
  const handleQuickAdd = (rollNumber: number, delta: number) => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }
    const current = ledger.entries.find((e) => e.rollNumber === rollNumber);
    if (current) {
      handleUpdateEntry(rollNumber, {
        entries: Math.max(0, current.entries + delta),
      });
    }
  };

  // Bulk add to range
  const handleBulkAddEntries = (fromRoll: number, toRoll: number, count: number) => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }

    setLedger((prev) => {
      const newEntries = prev.entries.map((item) => {
        if (item.rollNumber >= fromRoll && item.rollNumber <= toRoll) {
          return {
            ...item,
            entries: item.entries + count,
          };
        }
        return item;
      });

      const updatedStats = calculateStats(newEntries, prev.unitRate);
      const updated: LedgerData = {
        ...prev,
        entries: newEntries,
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      };

      syncWithServer(updated, adminPassword);
      return updated;
    });
  };

  // Reset all
  const handleResetAll = async () => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }

    const resetEntries = ledger.entries.map((item) => ({
      ...item,
      entries: 0,
      status: 'unpaid' as const,
      notes: '',
    }));

    const updatedStats = calculateStats(resetEntries, ledger.unitRate);
    const updated: LedgerData = {
      ...ledger,
      entries: resetEntries,
      stats: updatedStats,
      updatedAt: new Date().toISOString(),
    };

    setLedger(updated);
    syncWithServer(updated, adminPassword);
  };

  // Update unit rate
  const handleUpdateUnitRate = (newRate: number) => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }

    setLedger((prev) => {
      const updatedStats = calculateStats(prev.entries, newRate);
      const updated: LedgerData = {
        ...prev,
        unitRate: newRate,
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      };
      syncWithServer(updated, adminPassword);
      return updated;
    });
  };

  // Handle selecting roll from grid
  const handleSelectRoll = (rollNumber: number) => {
    setSelectedRoll(rollNumber);
    const targetElement = document.getElementById(`roll-row-${rollNumber}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const currentStats = ledger.stats || calculateStats(ledger.entries, ledger.unitRate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        isAdmin={isAdmin}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onLockAdmin={handleLockAdmin}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Hero Strip */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Roll 301 to 400 Entry Register
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live automated tally · 1 entry = {ledger.currencySymbol}{ledger.unitRate} · 100 Persons (Rolls 301–400)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Save status indicator */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Syncing...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sync offline</span>
                </>
              )}
            </div>

            {isAdmin ? (
              <span className="px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 rounded-md border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                Admin (Inbaraj)
              </span>
            ) : (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-700 transition-colors"
              >
                Viewer Mode (Read-Only)
              </button>
            )}
          </div>
        </div>

        {/* Financial & Entry Statistics Cards */}
        <StatsCards
          stats={currentStats}
          currencySymbol={ledger.currencySymbol}
          isAdmin={isAdmin}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        />

        {/* Visual 1-70 Roll Number Grid Picker */}
        <RollGridSelector
          entries={ledger.entries}
          selectedRoll={selectedRoll}
          onSelectRoll={handleSelectRoll}
          isAdmin={isAdmin}
          onQuickAdd={handleQuickAdd}
        />

        {/* Main 70 Roll Numbers Ledger Table */}
        <LedgerTable
          entries={ledger.entries}
          unitRate={ledger.unitRate}
          currencySymbol={ledger.currencySymbol}
          isAdmin={isAdmin}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          onUpdateEntry={handleUpdateEntry}
          selectedRoll={selectedRoll}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Roll70 Ledger System · Secured by password authentication (Inbaraj).
          </div>
          <div className="flex items-center gap-4">
            <span>100 Persons Registered (Rolls 301–400)</span>
            <span>·</span>
            <span>1 Entry = {ledger.currencySymbol}{ledger.unitRate}</span>
            <span>·</span>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              Export Report
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onUnlock={handleUnlock}
      />

      <BulkActionModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onBulkAddEntries={handleBulkAddEntries}
        onResetAll={handleResetAll}
        unitRate={ledger.unitRate}
        onUpdateUnitRate={handleUpdateUnitRate}
      />

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        entries={ledger.entries}
        stats={currentStats}
        currencySymbol={ledger.currencySymbol}
        isAdmin={isAdmin}
      />
    </div>
  );
}

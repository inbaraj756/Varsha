import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { RollGridSelector } from './components/RollGridSelector.tsx';
import { LedgerTable } from './components/LedgerTable.tsx';
import { AdminPasswordModal } from './components/AdminPasswordModal.tsx';
import { BulkActionModal } from './components/BulkActionModal.tsx';
import { PrintReportModal } from './components/PrintReportModal.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { RollEntry, LedgerData, LedgerStats, StudentData } from './types.ts';
import { ShieldAlert, RefreshCw, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';

const ADMIN_STORAGE_KEY = 'roll70_admin_token';
const STUDENT_STORAGE_KEY = 'varsha_student_session';
const LEDGER_LOCAL_KEY = 'roll70_local_ledger';
const EXPECTED_PASSWORD = 'ME';

const START_ROLL = 301;
const TOTAL_ROLLS = 100; // Rolls 301 to 400

const USER_ENTRIES_COUNTS = [
  10, 5, 10, 9, 20, 20, 5, 9, 9, 10, 6, 9, 6, 10, 9, 10, 9, 10, 10, 10,
  10, 9, 10, 10, 8, 7, 10, 10, 6, 5, 6, 6, 10, 8, 10, 10, 10, 10, 9, 9,
  10, 9, 9, 9, 9, 8, 8, 10, 4, 10, 10, 10, 10, 10, 8, 7, 7, 10, 10, 10,
  10, 7, 3, 10, 8, 9, 9, 10, 6, 2, 2
];

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
      const stored = sessionStorage.getItem(ADMIN_STORAGE_KEY);
      return stored?.toUpperCase() === 'ME';
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

  const [activeStudent, setActiveStudent] = useState<StudentData | null>(() => {
    try {
      const saved = sessionStorage.getItem(STUDENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [ledger, setLedger] = useState<LedgerData>(() => {
    try {
      const saved = localStorage.getItem(LEDGER_LOCAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.entries) &&
          parsed.entries.length === TOTAL_ROLLS &&
          parsed.entries[0]?.rollNumber === START_ROLL
        ) {
          const unitRate = parsed.unitRate || 100;
          return {
            ...parsed,
            title: 'Varsha',
            unitRate,
            stats: calculateStats(parsed.entries, unitRate),
          };
        }
      }
    } catch {
      // ignore localStorage errors
    }
    const initialRolls = createInitialRolls();
    return {
      unitRate: 100,
      currencySymbol: '₹',
      title: 'Varsha',
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

  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(LEDGER_LOCAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.entries) &&
          parsed.entries.length === TOTAL_ROLLS &&
          parsed.entries[0]?.rollNumber === START_ROLL
        ) {
          const unitRate = parsed.unitRate || 100;
          const stats = calculateStats(parsed.entries, unitRate);
          setLedger({ ...parsed, title: 'Varsha', unitRate, stats });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Load from server
  const fetchLedger = useCallback(async (token?: string) => {
    try {
      const activeToken = token || adminPassword || sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['x-admin-password'] = activeToken;
      }
      const res = await fetch('/api/ledger', { headers });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const unitRate = data.unitRate || 100;
        if (data.entries && Array.isArray(data.entries)) {
          const stats = calculateStats(data.entries, unitRate);
          setLedger({ ...data, title: 'Varsha', unitRate, stats });
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      } else {
        loadFromLocalStorage();
      }
    } catch {
      loadFromLocalStorage();
    }
  }, [adminPassword, loadFromLocalStorage]);

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
            title: 'Varsha',
            currencySymbol: updatedLedger.currencySymbol,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setSaveStatus('saved');
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(data));
          } catch {
            // ignore
          }
        } else if (res.status === 401) {
          setSaveStatus('error');
        } else {
          // Static hosting without API backend: persist locally
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(updatedLedger));
          } catch {
            // ignore
          }
          setSaveStatus('saved');
        }
      } catch {
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

  // Handle password unlock for Admin
  const handleUnlock = async (enteredPassword: string): Promise<boolean> => {
    const trimmed = enteredPassword.trim();
    if (trimmed.toUpperCase() === 'ME') {
      setIsAdmin(true);
      setAdminPassword('ME');
      sessionStorage.setItem(ADMIN_STORAGE_KEY, 'ME');
      fetchLedger('ME');
      return true;
    }

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
        fetchLedger(trimmed);
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

  const handleStudentLoginSuccess = (student: StudentData) => {
    setActiveStudent(student);
    try {
      sessionStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(student));
    } catch {
      // ignore
    }
  };

  const handleStudentLogout = () => {
    setActiveStudent(null);
    try {
      sessionStorage.removeItem(STUDENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const getStudentFallback = useCallback(
    (rollNumber: number): StudentData => {
      const target = ledger.entries.find((e) => e.rollNumber === rollNumber);
      const unitRate = Number(ledger.unitRate) || 100;
      const entriesCount = Number(target?.entries) || 0;
      return {
        rollNumber,
        name: target?.name || `Roll ${rollNumber}`,
        entries: entriesCount,
        unitRate,
        currencySymbol: ledger.currencySymbol || '₹',
        totalSum: entriesCount * unitRate,
        title: 'Varsha',
      };
    },
    [ledger]
  );

  // Update a single entry (Admin only)
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

  // Quick increment from roll grid (Admin only)
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
        activeStudent={activeStudent}
        onStudentLogout={handleStudentLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAdmin ? (
          /* ======================================================== */
          /* ADMIN PORTAL: Full 100 Roll Numbers & Grand Calculations */
          /* ======================================================== */
          <div className="space-y-6">
            {/* Header Hero Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Mode Active
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-mono">
                    Full Access Granted
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Varsha — Administrator Register
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Complete view of all 100 Roll Numbers (301 to 400) · 1 Entry = {ledger.currencySymbol}{ledger.unitRate} · Full Grand Calculations
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

                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit to Public View</span>
                </button>
              </div>
            </div>

            {/* Financial & Entry Statistics Cards (Unlocked for Admin) */}
            <StatsCards
              stats={currentStats}
              currencySymbol={ledger.currencySymbol}
              isAdmin={isAdmin}
              onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
            />

            {/* Visual 301-400 Roll Number Grid Picker */}
            <RollGridSelector
              entries={ledger.entries}
              selectedRoll={selectedRoll}
              onSelectRoll={handleSelectRoll}
              isAdmin={isAdmin}
              onQuickAdd={handleQuickAdd}
            />

            {/* Main 100 Roll Numbers Ledger Table */}
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
          </div>
        ) : (
          /* ======================================================== */
          /* PUBLIC SCENE: Student Roll Login & Individual Statement  */
          /* ======================================================== */
          <StudentPortal
            onAdminClick={() => setIsPasswordModalOpen(true)}
            onStudentLoginSuccess={handleStudentLoginSuccess}
            activeStudent={activeStudent}
            onStudentLogout={handleStudentLogout}
            getStudentFallback={getStudentFallback}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>Varsha</strong> Ledger System · Secured Administrator Portal.
          </div>
          <div className="flex items-center gap-4">
            <span>100 Students (Rolls 301–400)</span>
            <span>·</span>
            <span>1 Entry = {ledger.currencySymbol}{ledger.unitRate}</span>
            <span>·</span>
            {isAdmin ? (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                Export Ledger Report
              </button>
            ) : (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                Admin Portal Login
              </button>
            )}
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

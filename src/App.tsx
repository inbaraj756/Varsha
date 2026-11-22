import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { RollGridSelector } from './components/RollGridSelector.tsx';
import { LedgerTable } from './components/LedgerTable.tsx';
import { AdminPasswordModal } from './components/AdminPasswordModal.tsx';
import { BulkActionModal } from './components/BulkActionModal.tsx';
import { PrintReportModal } from './components/PrintReportModal.tsx';
import { CodeEntryModal } from './components/CodeEntryModal.tsx';
import { CloudSyncModal } from './components/CloudSyncModal.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { LEDGER_CONFIG, INITIAL_LEDGER_ENTRIES } from './data/ledgerData.ts';
import { RollEntry, LedgerData, LedgerStats, StudentData } from './types.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutFirebase } from './firebase.ts';
import {
  checkIsCloudAdmin,
  subscribeAdminLedger,
  seedInitialLedgerToFirestore,
  saveLedgerChangesToFirestore,
} from './services/firestoreLedger.ts';
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Save,
  Code2,
  Cloud,
  CloudOff,
} from 'lucide-react';

const ADMIN_STORAGE_KEY = 'roll70_admin_token';
const STUDENT_STORAGE_KEY = 'varsha_student_session';
const LEDGER_LOCAL_KEY = 'roll70_local_ledger';
const EXPECTED_PASSWORD = 'ME';

const START_ROLL = 301;
const TOTAL_ROLLS = 100; // Rolls 301 to 400

function createInitialRolls(): RollEntry[] {
  const byRoll = new Map(INITIAL_LEDGER_ENTRIES.map((item) => [item.rollNumber, item]));
  return Array.from({ length: TOTAL_ROLLS }, (_, i) => {
    const roll = START_ROLL + i;
    const found = byRoll.get(roll);
    return {
      rollNumber: roll,
      name: found?.name || `Roll ${roll}`,
      entries: Number(found?.entries) || 0,
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
        const localTime = new Date(parsed.updatedAt || 0).getTime();
        const codeTime = new Date(LEDGER_CONFIG.updatedAt || 0).getTime();
        if (
          Array.isArray(parsed.entries) &&
          parsed.entries.length === TOTAL_ROLLS &&
          parsed.entries[0]?.rollNumber === START_ROLL &&
          localTime >= codeTime
        ) {
          const unitRate = parsed.unitRate || LEDGER_CONFIG.unitRate || 100;
          return {
            ...parsed,
            title: LEDGER_CONFIG.title || 'Varsha',
            unitRate,
            stats: calculateStats(parsed.entries, unitRate),
          };
        }
      }
    } catch {
      // ignore localStorage errors
    }
    const initialRolls = createInitialRolls();
    const unitRate = LEDGER_CONFIG.unitRate || 100;
    return {
      unitRate,
      currencySymbol: LEDGER_CONFIG.currencySymbol || '₹',
      title: LEDGER_CONFIG.title || 'Varsha',
      updatedAt: LEDGER_CONFIG.updatedAt || new Date().toISOString(),
      entries: initialRolls,
      stats: calculateStats(initialRolls, unitRate),
    };
  });

  const [selectedRoll, setSelectedRoll] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'zero'>('all');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [dirtyRolls, setDirtyRolls] = useState<Set<number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');

  // Firebase Cloud Sync State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isCloudAdmin, setIsCloudAdmin] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<
    'disconnected' | 'connecting' | 'synced' | 'unauthorized' | 'error'
  >('disconnected');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const ledgerRef = useRef<LedgerData>(ledger);
  useEffect(() => {
    ledgerRef.current = ledger;
  }, [ledger]);

  const hasUnsavedChanges = dirtyRolls.size > 0;

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
        const localTime = new Date(parsed.updatedAt || 0).getTime();
        const codeTime = new Date(LEDGER_CONFIG.updatedAt || 0).getTime();
        if (
          Array.isArray(parsed.entries) &&
          parsed.entries.length === TOTAL_ROLLS &&
          parsed.entries[0]?.rollNumber === START_ROLL &&
          localTime >= codeTime
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

  const isCloudAdminRef = useRef<boolean>(isCloudAdmin);
  useEffect(() => {
    isCloudAdminRef.current = isCloudAdmin;
  }, [isCloudAdmin]);

  // Load from server (fallback only when Cloud Sync is not active)
  const fetchLedger = useCallback(async (token?: string) => {
    if (isCloudAdminRef.current) return;
    try {
      const activeToken = token || adminPassword || sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['x-admin-password'] = activeToken;
      }
      const res = await fetch('/api/ledger', { headers });
      if (isCloudAdminRef.current) return;
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
      if (!isCloudAdminRef.current) {
        loadFromLocalStorage();
      }
    }
  }, [adminPassword, loadFromLocalStorage]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setIsCloudAdmin(false);
        setCloudStatus('disconnected');
        setCloudError(null);
        setAuthReady(true);
        return;
      }

      const authorized = await checkIsCloudAdmin(user);
      setIsCloudAdmin(authorized);
      if (!authorized) {
        setCloudStatus('unauthorized');
      } else {
        setCloudStatus('connecting');
      }
      setCloudError(null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Cloud Firestore ledger when Admin + Cloud Admin are active
  useEffect(() => {
    if (!isAdmin || !authReady || !firebaseUser || !isCloudAdmin) {
      return;
    }

    setCloudStatus('connecting');
    setCloudError(null);

    const unsubscribe = subscribeAdminLedger(
      firebaseUser.uid,
      (cloudEntries, updatedAt) => {
        setLedger((prev) => {
          const stats = calculateStats(cloudEntries, prev.unitRate);
          const next: LedgerData = {
            ...prev,
            title: 'Varsha',
            entries: cloudEntries,
            stats,
            updatedAt,
          };
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        setCloudStatus('synced');
        setCloudError(null);
      },
      (cloudSettings) => {
        setLedger((prev) => {
          const stats = calculateStats(prev.entries, cloudSettings.unitRate);
          return {
            ...prev,
            title: cloudSettings.title || 'Varsha',
            unitRate: cloudSettings.unitRate,
            currencySymbol: cloudSettings.currencySymbol || '₹',
            stats,
          };
        });
      },
      async () => {
        // Seed Firestore with current entries so no prior local entries are lost
        await seedInitialLedgerToFirestore(
          firebaseUser.uid,
          ledgerRef.current.entries,
          ledgerRef.current.unitRate,
          ledgerRef.current.currencySymbol
        );
      },
      (err) => {
        setCloudStatus('error');
        setCloudError(err.message);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, authReady, firebaseUser, isCloudAdmin]);

  const handleSignInGoogle = useCallback(async () => {
    setCloudError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setCloudError(msg);
      setCloudStatus('error');
    }
  }, []);

  const handleSignOutGoogle = useCallback(async () => {
    setCloudError(null);
    try {
      await signOutFirebase();
      setIsCloudAdmin(false);
      setCloudStatus('disconnected');
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Sign out failed.');
    }
  }, []);

  // Save changes to Cloud Firestore + backend server & codebase
  const syncWithServer = useCallback(
    async (
      updatedLedger: LedgerData,
      currentPassword: string,
      onlyRolls?: Set<number>
    ) => {
      setSaveStatus('saving');

      let cloudSaved = false;
      if (isCloudAdmin && firebaseUser?.uid) {
        try {
          await saveLedgerChangesToFirestore(
            updatedLedger.entries,
            {
              title: updatedLedger.title || 'Varsha',
              unitRate: updatedLedger.unitRate,
              currencySymbol: updatedLedger.currencySymbol || '₹',
            },
            firebaseUser.uid,
            onlyRolls
          );
          cloudSaved = true;
          setCloudStatus('synced');
          setCloudError(null);
        } catch (err) {
          setSaveStatus('error');
          setCloudStatus('error');
          setCloudError(err instanceof Error ? err.message : 'Cloud save failed.');
          return;
        }
      }

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
          setDirtyRolls(new Set());
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(data));
          } catch {
            // ignore
          }
        } else if (res.status === 401 && !cloudSaved) {
          setSaveStatus('error');
        } else {
          try {
            localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(updatedLedger));
          } catch {
            // ignore
          }
          setSaveStatus('saved');
          setDirtyRolls(new Set());
        }
      } catch {
        try {
          localStorage.setItem(LEDGER_LOCAL_KEY, JSON.stringify(updatedLedger));
        } catch {
          // ignore
        }
        setSaveStatus('saved');
        setDirtyRolls(new Set());
      }
    },
    [isCloudAdmin, firebaseUser]
  );

  const handleForcePushToCloud = useCallback(async () => {
    if (!isCloudAdmin || !firebaseUser?.uid) {
      throw new Error('Connect an authorized Admin Google account first.');
    }
    await saveLedgerChangesToFirestore(
      ledgerRef.current.entries,
      {
        title: ledgerRef.current.title || 'Varsha',
        unitRate: ledgerRef.current.unitRate,
        currencySymbol: ledgerRef.current.currencySymbol || '₹',
      },
      firebaseUser.uid
    );
    setSaveStatus('saved');
    setCloudStatus('synced');
    setDirtyRolls(new Set());
  }, [isCloudAdmin, firebaseUser]);

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

  // Update a single entry locally (explicit Save commits to codebase & server)
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
      return {
        ...prev,
        entries: newEntries,
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      };
    });

    setDirtyRolls((prev) => {
      const next = new Set(prev);
      next.add(rollNumber);
      return next;
    });
    setSaveStatus('unsaved');
  };

  // Explicit Save button handler: normalizes blank names & writes to data/ledger.json + src/data/ledgerData.ts
  const handleSaveAll = useCallback(async () => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      return;
    }

    const normalizedEntries = ledger.entries.map((item) => ({
      ...item,
      name: item.name && item.name.trim() ? item.name.trim() : `Roll ${item.rollNumber}`,
      entries: Math.max(0, Number(item.entries) || 0),
    }));

    const updatedStats = calculateStats(normalizedEntries, ledger.unitRate);
    const updated: LedgerData = {
      ...ledger,
      entries: normalizedEntries,
      stats: updatedStats,
      updatedAt: new Date().toISOString(),
    };

    const changedSet = new Set(dirtyRolls);
    setLedger(updated);
    await syncWithServer(
      updated,
      adminPassword,
      changedSet.size > 0 ? changedSet : undefined
    );
  }, [isAdmin, ledger, adminPassword, dirtyRolls, syncWithServer]);

  // Apply bulk entries from Code Entry modal and save immediately
  const handleApplyCodeEntries = useCallback(
    async (nextEntries: RollEntry[]) => {
      const normalized = nextEntries.map((item) => ({
        ...item,
        name: item.name && item.name.trim() ? item.name.trim() : `Roll ${item.rollNumber}`,
        entries: Math.max(0, Number(item.entries) || 0),
      }));
      const updatedStats = calculateStats(normalized, ledger.unitRate);
      const updated: LedgerData = {
        ...ledger,
        entries: normalized,
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      };
      setLedger(updated);
      await syncWithServer(updated, adminPassword);
    },
    [ledger, adminPassword, syncWithServer]
  );

  // Ctrl+S / Cmd+S shortcut in Admin Mode
  useEffect(() => {
    if (!isAdmin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin, handleSaveAll]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors print:bg-white print:text-slate-900">
      <Navbar
        isAdmin={isAdmin}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onLockAdmin={handleLockAdmin}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        onSaveAll={handleSaveAll}
        hasUnsavedChanges={hasUnsavedChanges}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeStudent={activeStudent}
        onStudentLogout={handleStudentLogout}
      />

      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${isPrintModalOpen ? 'print:hidden' : 'print:p-0'}`}>
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
                    {isCloudAdmin ? 'Live Multi-Mobile Cloud Sync Active' : 'Local / Codebase Mode'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Varsha — Administrator Register
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Complete view of all 100 Roll Numbers (301 to 400) · 1 Entry = {ledger.currencySymbol}{ledger.unitRate} · Saved entries sync across all mobile devices
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Real-time Save status indicator */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                  {saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span>Saving...</span>
                    </>
                  ) : hasUnsavedChanges || saveStatus === 'unsaved' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Unsaved ({dirtyRolls.size})
                      </span>
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isCloudAdmin ? 'Synced to Cloud' : 'Saved Locally'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>Save Error</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCloudModalOpen(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isCloudAdmin
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {isCloudAdmin ? (
                    <Cloud className="w-3.5 h-3.5" />
                  ) : (
                    <CloudOff className="w-3.5 h-3.5" />
                  )}
                  <span>{isCloudAdmin ? 'Cloud Live' : 'Connect Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Code Entry</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saveStatus === 'saving'}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                    hasUnsavedChanges
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}</span>
                </button>

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

            {/* Cloud Sync Prompt Banner when not connected across mobiles */}
            {!isCloudAdmin && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CloudOff className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-0.5">
                    <div className="font-bold text-sm">
                      {firebaseUser
                        ? 'This Google Account Needs Cloud Admin Authorization'
                        : 'Connect Google Cloud Sync to Share Entries Across Mobiles'}
                    </div>
                    <p className="text-indigo-800 dark:text-indigo-300">
                      {firebaseUser
                        ? `Signed in as ${firebaseUser.email}. Sign in with the primary admin Google account or add this device's UID in Cloud Sync so entries saved on one phone appear on all other phones.`
                        : 'Sign in with Google so entries saved on one mobile phone immediately appear on every other mobile phone.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!firebaseUser ? (
                    <button
                      type="button"
                      onClick={handleSignInGoogle}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Cloud className="w-4 h-4" />
                      Sign in with Google
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCloudModalOpen(true)}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Open Cloud Sync Setup
                    </button>
                  )}
                </div>
              </div>
            )}

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
              hasUnsavedChanges={hasUnsavedChanges}
              dirtyRolls={dirtyRolls}
              saveStatus={saveStatus}
              onSaveAll={handleSaveAll}
              onOpenCodeModal={() => setIsCodeModalOpen(true)}
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
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>Varsha</strong> Ledger System · Secured Administrator Portal.
          </div>
          <div className="flex items-center gap-4">
            <span>100 Persons (Rolls 301–400)</span>
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

      <CodeEntryModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        entries={ledger.entries}
        unitRate={ledger.unitRate}
        currencySymbol={ledger.currencySymbol}
        onApplyEntries={handleApplyCodeEntries}
      />

      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        firebaseUser={firebaseUser}
        isCloudAdmin={isCloudAdmin}
        cloudStatus={cloudStatus}
        cloudError={cloudError}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        onForcePushToCloud={handleForcePushToCloud}
      />
    </div>
  );
}

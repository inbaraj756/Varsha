import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
  setDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { PaymentStatus, RollEntry, StudentData } from '../types.ts';
import { INITIAL_LEDGER_ENTRIES, LEDGER_CONFIG } from '../data/ledgerData.ts';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'v9842957434@gmail.com';
const START_ROLL = 301;
const END_ROLL = 400;
const TOTAL_ROLLS = 100;

export interface CloudSettings {
  title: string;
  unitRate: number;
  currencySymbol: string;
  totalRolls: number;
  updatedAt: string;
}

export interface CloudAdminRecord {
  uid: string;
  email: string;
  addedBy: string;
}

// Defensive sanitizers enforcing exact firebase-blueprint.json boundaries
function sanitizeName(name: unknown, roll: number): string {
  const raw = typeof name === 'string' ? name.trim() : '';
  const fallback = `Roll ${roll}`;
  const valid = raw.length > 0 ? raw : fallback;
  return valid.slice(0, 80);
}

function sanitizeEntriesCount(entries: unknown): number {
  const num = Math.floor(Number(entries) || 0);
  return Math.max(0, Math.min(1000000, num));
}

function sanitizeStatus(status: unknown): PaymentStatus {
  if (status === 'paid' || status === 'pending' || status === 'unpaid') {
    return status;
  }
  return 'unpaid';
}

function sanitizeNotes(notes: unknown): string {
  const raw = typeof notes === 'string' ? notes : '';
  return raw.slice(0, 200);
}

function sanitizeTitle(title: unknown): string {
  const raw = typeof title === 'string' ? title.trim() : '';
  return (raw || 'Varsha').slice(0, 60);
}

function sanitizeCurrency(symbol: unknown): string {
  const raw = typeof symbol === 'string' ? symbol.trim() : '';
  return (raw || '₹').slice(0, 5);
}

function sanitizeUnitRate(rate: unknown): number {
  const num = Number(rate);
  if (!Number.isFinite(num) || num < 0) return 100;
  return Math.min(1000000, num);
}

function formatFirestoreTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export async function checkIsCloudAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
    return true;
  }
  const adminPath = `admins/${user.uid}`;
  try {
    const snap = await getDocFromServer(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    try {
      const snap = await getDoc(doc(db, 'admins', user.uid));
      return snap.exists();
    } catch (err) {
      console.warn(`Admin check skipped for ${adminPath}:`, err);
      return false;
    }
  }
}

export async function seedInitialLedgerToFirestore(
  uid: string,
  entriesOverride?: RollEntry[],
  unitRateOverride?: number,
  currencySymbolOverride?: string
): Promise<void> {
  const byRoll = new Map(
    (entriesOverride || INITIAL_LEDGER_ENTRIES).map((item) => [item.rollNumber, item])
  );
  const unitRate = sanitizeUnitRate(unitRateOverride ?? LEDGER_CONFIG.unitRate ?? 100);
  const currencySymbol = sanitizeCurrency(
    currencySymbolOverride ?? LEDGER_CONFIG.currencySymbol ?? '₹'
  );
  const title = sanitizeTitle(LEDGER_CONFIG.title || 'Varsha');

  const batch = writeBatch(db);

  for (let roll = START_ROLL; roll <= END_ROLL; roll++) {
    const rollId = String(roll);
    const existing = byRoll.get(roll);
    const cleanName = sanitizeName(existing?.name, roll);
    const cleanEntries = sanitizeEntriesCount(existing?.entries);
    const cleanStatus = sanitizeStatus(existing?.status);
    const cleanNotes = sanitizeNotes(existing?.notes);

    batch.set(doc(db, 'rolls', rollId), {
      rollNumber: roll,
      name: cleanName,
      entries: cleanEntries,
      status: cleanStatus,
      notes: cleanNotes,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'publicRolls', rollId), {
      rollNumber: roll,
      name: cleanName,
      entries: cleanEntries,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'settings', 'ledger'), {
    title,
    unitRate,
    currencySymbol,
    totalRolls: TOTAL_ROLLS,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'rolls + publicRolls + settings/ledger');
  }
}

export async function saveLedgerChangesToFirestore(
  entries: RollEntry[],
  settings: { title: string; unitRate: number; currencySymbol: string },
  uid: string,
  onlyRolls?: Set<number>
): Promise<void> {
  const targets =
    onlyRolls && onlyRolls.size > 0
      ? entries.filter((e) => onlyRolls.has(e.rollNumber))
      : entries;

  // Batch limit in Firestore is 500 writes. 100 rolls * 2 + 1 settings = 201 writes (fits in 1 batch).
  const batch = writeBatch(db);

  for (const item of targets) {
    const roll = Math.floor(Number(item.rollNumber));
    if (roll < START_ROLL || roll > END_ROLL) continue;
    const rollId = String(roll);
    const cleanName = sanitizeName(item.name, roll);
    const cleanEntries = sanitizeEntriesCount(item.entries);
    const cleanStatus = sanitizeStatus(item.status);
    const cleanNotes = sanitizeNotes(item.notes);

    batch.set(doc(db, 'rolls', rollId), {
      rollNumber: roll,
      name: cleanName,
      entries: cleanEntries,
      status: cleanStatus,
      notes: cleanNotes,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'publicRolls', rollId), {
      rollNumber: roll,
      name: cleanName,
      entries: cleanEntries,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'settings', 'ledger'), {
    title: sanitizeTitle(settings.title),
    unitRate: sanitizeUnitRate(settings.unitRate),
    currencySymbol: sanitizeCurrency(settings.currencySymbol),
    totalRolls: TOTAL_ROLLS,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'rolls + publicRolls + settings/ledger');
  }
}

export function subscribeAdminLedger(
  uid: string,
  onEntriesUpdate: (entries: RollEntry[], updatedAt: string) => void,
  onSettingsUpdate: (settings: CloudSettings) => void,
  onSeedNeeded: () => Promise<void>,
  onError?: (err: Error) => void
): () => void {
  let seedAttempted = false;
  let publicSyncChecked = false;

  const unsubRolls = onSnapshot(
    collection(db, 'rolls'),
    (snapshot) => {
      if (snapshot.empty && !seedAttempted) {
        seedAttempted = true;
        onSeedNeeded().catch((err) => {
          if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        });
        return;
      }

      if (!snapshot.empty) {
        const byRoll = new Map<number, RollEntry>();
        let latestUpdated = '';

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const roll = Number(d.rollNumber) || Number(docSnap.id);
          if (roll >= START_ROLL && roll <= END_ROLL) {
            byRoll.set(roll, {
              rollNumber: roll,
              name: sanitizeName(d.name, roll),
              entries: sanitizeEntriesCount(d.entries),
              status: sanitizeStatus(d.status),
              notes: sanitizeNotes(d.notes),
            });
            const ts = formatFirestoreTimestamp(d.updatedAt);
            if (!latestUpdated || ts > latestUpdated) {
              latestUpdated = ts;
            }
          }
        });

        const completeEntries: RollEntry[] = Array.from({ length: TOTAL_ROLLS }, (_, i) => {
          const roll = START_ROLL + i;
          return (
            byRoll.get(roll) || {
              rollNumber: roll,
              name: `Roll ${roll}`,
              entries: 0,
              status: 'unpaid',
              notes: '',
            }
          );
        });

        if (!publicSyncChecked) {
          publicSyncChecked = true;
          getDocFromServer(doc(db, 'publicRolls', String(START_ROLL)))
            .then((pubSnap) => {
              if (!pubSnap.exists()) {
                const batch = writeBatch(db);
                for (const item of completeEntries) {
                  batch.set(doc(db, 'publicRolls', String(item.rollNumber)), {
                    rollNumber: item.rollNumber,
                    name: sanitizeName(item.name, item.rollNumber),
                    entries: sanitizeEntriesCount(item.entries),
                    updatedAt: serverTimestamp(),
                  });
                }
                return batch.commit();
              }
            })
            .catch(() => {
              // ignore non-fatal public mirror check error
            });
        }

        onEntriesUpdate(completeEntries, latestUpdated || new Date().toISOString());
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `rolls (uid=${uid})`);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'ledger'),
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        onSettingsUpdate({
          title: sanitizeTitle(d.title),
          unitRate: sanitizeUnitRate(d.unitRate),
          currencySymbol: sanitizeCurrency(d.currencySymbol),
          totalRolls: TOTAL_ROLLS,
          updatedAt: formatFirestoreTimestamp(d.updatedAt),
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/ledger');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );

  return () => {
    unsubRolls();
    unsubSettings();
  };
}

export async function fetchSinglePublicRoll(rollNumber: number): Promise<StudentData | null> {
  if (rollNumber < START_ROLL || rollNumber > END_ROLL) return null;
  const rollId = String(rollNumber);

  const readDocWithFallback = async (ref: ReturnType<typeof doc>) => {
    try {
      return await getDocFromServer(ref);
    } catch {
      return await getDoc(ref);
    }
  };

  try {
    const rollSnap = await readDocWithFallback(doc(db, 'publicRolls', rollId));
    if (!rollSnap.exists()) {
      return null;
    }

    let settingsData: Record<string, unknown> | null = null;
    try {
      const settingsSnap = await readDocWithFallback(doc(db, 'settings', 'ledger'));
      if (settingsSnap.exists()) {
        settingsData = settingsSnap.data();
      }
    } catch {
      // Fall back to default config if settings doc is missing/offline
    }

    const r = rollSnap.data();
    const unitRate = sanitizeUnitRate(settingsData?.unitRate ?? LEDGER_CONFIG.unitRate ?? 100);
    const currencySymbol = sanitizeCurrency(
      settingsData?.currencySymbol ?? LEDGER_CONFIG.currencySymbol ?? '₹'
    );
    const title = sanitizeTitle(settingsData?.title ?? LEDGER_CONFIG.title ?? 'Varsha');
    const entriesCount = sanitizeEntriesCount(r.entries);

    return {
      rollNumber,
      name: sanitizeName(r.name, rollNumber),
      entries: entriesCount,
      unitRate,
      currencySymbol,
      totalSum: entriesCount * unitRate,
      title,
    };
  } catch (error) {
    console.warn('Firestore single roll lookup fallback:', error);
    return null;
  }
}

export function subscribeSinglePublicRoll(
  rollNumber: number,
  onUpdate: (data: StudentData) => void
): () => void {
  if (rollNumber < START_ROLL || rollNumber > END_ROLL) {
    return () => {};
  }
  const rollId = String(rollNumber);
  let latestRoll: { name: string; entries: number } | null = null;
  let latestSettings = {
    unitRate: sanitizeUnitRate(LEDGER_CONFIG.unitRate ?? 100),
    currencySymbol: sanitizeCurrency(LEDGER_CONFIG.currencySymbol ?? '₹'),
    title: sanitizeTitle(LEDGER_CONFIG.title ?? 'Varsha'),
  };

  const emitIfReady = () => {
    if (!latestRoll) return;
    onUpdate({
      rollNumber,
      name: latestRoll.name,
      entries: latestRoll.entries,
      unitRate: latestSettings.unitRate,
      currencySymbol: latestSettings.currencySymbol,
      totalSum: latestRoll.entries * latestSettings.unitRate,
      title: latestSettings.title,
    });
  };

  const unsubRoll = onSnapshot(
    doc(db, 'publicRolls', rollId),
    (snap) => {
      if (snap.exists()) {
        const r = snap.data();
        latestRoll = {
          name: sanitizeName(r.name, rollNumber),
          entries: sanitizeEntriesCount(r.entries),
        };
        emitIfReady();
      }
    },
    (err) => {
      console.warn(`Live roll subscription error for ${rollId}:`, err);
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'ledger'),
    (snap) => {
      if (snap.exists()) {
        const s = snap.data();
        latestSettings = {
          unitRate: sanitizeUnitRate(s.unitRate),
          currencySymbol: sanitizeCurrency(s.currencySymbol),
          title: sanitizeTitle(s.title),
        };
        emitIfReady();
      }
    },
    (err) => {
      console.warn('Live settings subscription error:', err);
    }
  );

  return () => {
    unsubRoll();
    unsubSettings();
  };
}

export async function listCoAdmins(): Promise<CloudAdminRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    const list: CloudAdminRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        uid: String(d.uid || docSnap.id),
        email: String(d.email || ''),
        addedBy: String(d.addedBy || ''),
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admins');
  }
}

export async function addCoAdmin(
  targetUid: string,
  targetEmail: string,
  addedByUid: string
): Promise<void> {
  const cleanUid = targetUid.trim();
  const cleanEmail = targetEmail.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cleanUid)) {
    throw new Error('Invalid UID format. Only letters, numbers, underscores, and hyphens are allowed.');
  }
  if (cleanEmail.length < 3 || cleanEmail.length > 120 || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid Google email address.');
  }

  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: cleanEmail,
      addedBy: addedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `admins/${cleanUid}`);
  }
}

export async function removeCoAdmin(targetUid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admins', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `admins/${targetUid}`);
  }
}

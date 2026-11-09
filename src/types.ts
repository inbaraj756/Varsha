export type PaymentStatus = 'paid' | 'unpaid' | 'pending';

export interface RollEntry {
  rollNumber: number;
  name: string;
  entries: number;
  status?: PaymentStatus;
  notes?: string;
}

export interface LedgerStats {
  totalRollNumbers: number;
  activePersons: number;
  totalEntries: number;
  unitRate: number;
  totalSum: number;
  paidSum: number;
  unpaidSum: number;
  paidEntries: number;
  unpaidEntries: number;
  startRoll?: number;
  endRoll?: number;
}

export interface LedgerData {
  unitRate: number;
  currencySymbol: string;
  title: string;
  updatedAt: string;
  startRoll?: number;
  endRoll?: number;
  entries: RollEntry[];
  stats?: LedgerStats;
  isAdmin?: boolean;
}

export interface StudentData {
  rollNumber: number;
  name: string;
  entries: number;
  unitRate: number;
  currencySymbol: string;
  totalSum: number;
  title: string;
}

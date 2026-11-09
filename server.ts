import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ME';

function checkAdminAuth(pass?: string): boolean {
  if (!pass) return false;
  const p = String(pass).trim();
  return p === ADMIN_PASSWORD || p.toUpperCase() === 'ME';
}

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'ledger.json');

app.use(express.json());

const START_ROLL = 301;
const END_ROLL = 400;
const TOTAL_ROLLS = 100;

// Ensure data file exists
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialEntries = Array.from({ length: TOTAL_ROLLS }, (_, i) => {
      const roll = START_ROLL + i;
      return {
        rollNumber: roll,
        name: `Roll ${roll}`,
        entries: 0,
        status: 'unpaid',
        notes: '',
      };
    });
    const initialData = {
      unitRate: 100,
      currencySymbol: '₹',
      title: 'Varsha',
      updatedAt: new Date().toISOString(),
      entries: initialEntries,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readLedger() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    
    // Safety check: ensure 100 roll numbers from 301 to 400 exist
    if (!Array.isArray(data.entries) || data.entries.length < TOTAL_ROLLS || data.entries[0]?.rollNumber < START_ROLL) {
      const existingMap = new Map(data.entries?.map((e: any) => [e.rollNumber, e]) || []);
      const completeEntries = Array.from({ length: TOTAL_ROLLS }, (_, i) => {
        const roll = START_ROLL + i;
        return existingMap.get(roll) || {
          rollNumber: roll,
          name: `Roll ${roll}`,
          entries: 0,
          status: 'unpaid',
          notes: '',
        };
      });
      data.entries = completeEntries;
      data.unitRate = data.unitRate || 100;
      data.title = 'Varsha';
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    return data;
  } catch (err) {
    console.error('Error reading ledger:', err);
    return null;
  }
}

function writeLedger(data: any) {
  ensureDataFile();
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

// Compute statistics
function computeStats(data: any) {
  const entriesList = data.entries || [];
  const unitRate = Number(data.unitRate) || 100;
  
  let totalEntries = 0;
  let activePersons = 0;
  let paidEntries = 0;
  let unpaidEntries = 0;

  for (const item of entriesList) {
    const count = Number(item.entries) || 0;
    totalEntries += count;
    if (count > 0) activePersons++;
    if (item.status === 'paid') {
      paidEntries += count;
    } else {
      unpaidEntries += count;
    }
  }

  const totalSum = totalEntries * unitRate;
  const paidSum = paidEntries * unitRate;
  const unpaidSum = unpaidEntries * unitRate;

  return {
    totalRollNumbers: entriesList.length,
    activePersons,
    totalEntries,
    unitRate,
    totalSum,
    paidSum,
    unpaidSum,
    paidEntries,
    unpaidEntries,
  };
}

// API Routes
app.get('/api/ledger', (req, res) => {
  const data = readLedger();
  if (!data) {
    return res.status(500).json({ error: 'Failed to read ledger data' });
  }

  const adminPass = (req.headers['x-admin-password'] as string) || (req.query.password as string);
  const isAdmin = checkAdminAuth(adminPass);

  if (isAdmin) {
    const stats = computeStats(data);
    return res.json({
      ...data,
      title: 'Varsha',
      isAdmin: true,
      stats,
    });
  }

  // Public safe view: do not expose all roll numbers or grand totals to public
  return res.json({
    title: 'Varsha',
    unitRate: data.unitRate || 100,
    currencySymbol: data.currencySymbol || '₹',
    totalRollNumbers: TOTAL_ROLLS,
    startRoll: START_ROLL,
    endRoll: END_ROLL,
    isProtected: true,
  });
});

// Student individual login (Username = Roll #, Password = Roll #)
app.post('/api/auth/student-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both Username and Password.' });
  }

  const cleanUser = String(username).replace(/^#/, '').trim();
  const cleanPass = String(password).trim();
  const roll = parseInt(cleanUser, 10);

  if (isNaN(roll) || roll < START_ROLL || roll > END_ROLL) {
    return res.status(400).json({
      error: `Invalid roll number. Please enter a roll number between ${START_ROLL} and ${END_ROLL}.`,
    });
  }

  if (cleanPass !== String(roll)) {
    return res.status(401).json({
      error: `Incorrect password for Roll #${roll}. Password must be equal to your roll number (${roll}).`,
    });
  }

  const data = readLedger();
  if (!data) {
    return res.status(500).json({ error: 'Failed to read ledger' });
  }

  const student = data.entries.find((e: any) => e.rollNumber === roll);
  const unitRate = Number(data.unitRate) || 100;
  const entriesCount = Number(student?.entries) || 0;
  const totalSum = entriesCount * unitRate;

  return res.json({
    success: true,
    student: {
      rollNumber: roll,
      name: student?.name || `Roll ${roll}`,
      entries: entriesCount,
      unitRate,
      currencySymbol: data.currencySymbol || '₹',
      totalSum,
      title: 'Varsha',
    },
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body;
  if (checkAdminAuth(password)) {
    return res.json({ success: true, message: 'Admin verified successfully' });
  }
  return res.status(401).json({ success: false, error: 'Incorrect password. Edit access denied.' });
});

app.put('/api/ledger', (req, res) => {
  const { password, entries, unitRate, title, currencySymbol } = req.body;
  
  if (!checkAdminAuth(password)) {
    return res.status(401).json({ error: 'Unauthorized: Incorrect password. Only admin can edit.' });
  }

  const current = readLedger();
  if (!current) {
    return res.status(500).json({ error: 'Could not load existing ledger' });
  }

  if (Array.isArray(entries)) {
    // Merge or replace entries keeping rollNumber valid 301-400
    current.entries = entries.map((e: any, idx: number) => ({
      rollNumber: Number(e.rollNumber) || (START_ROLL + idx),
      name: typeof e.name === 'string' && e.name.trim() ? e.name : `Roll ${START_ROLL + idx}`,
      entries: Math.max(0, parseInt(e.entries, 10) || 0),
      status: e.status === 'paid' ? 'paid' : (e.status === 'pending' ? 'pending' : 'unpaid'),
      notes: typeof e.notes === 'string' ? e.notes : '',
    }));
  }

  if (typeof unitRate === 'number' && unitRate >= 0) {
    current.unitRate = unitRate;
  }
  if (typeof title === 'string' && title.trim()) {
    current.title = title.trim();
  }
  if (typeof currencySymbol === 'string') {
    current.currencySymbol = currencySymbol;
  }

  const saved = writeLedger(current);
  const stats = computeStats(saved);
  res.json({ success: true, ...saved, stats });
});

app.post('/api/ledger/entry', (req, res) => {
  const { password, rollNumber, entries, name, status, notes } = req.body;

  if (!checkAdminAuth(password)) {
    return res.status(401).json({ error: 'Unauthorized: Incorrect password' });
  }

  const roll = Number(rollNumber);
  if (!roll || roll < START_ROLL || roll > END_ROLL) {
    return res.status(400).json({ error: `Invalid roll number (must be between ${START_ROLL} and ${END_ROLL})` });
  }

  const current = readLedger();
  const index = current.entries.findIndex((e: any) => e.rollNumber === roll);
  if (index === -1) {
    return res.status(404).json({ error: 'Roll number not found' });
  }

  const target = current.entries[index];
  if (typeof entries === 'number') target.entries = Math.max(0, entries);
  if (typeof name === 'string') target.name = name;
  if (typeof status === 'string') target.status = status;
  if (typeof notes === 'string') target.notes = notes;

  const saved = writeLedger(current);
  const stats = computeStats(saved);
  res.json({ success: true, entry: target, stats });
});

app.post('/api/ledger/reset', (req, res) => {
  const { password } = req.body;
  if (!checkAdminAuth(password)) {
    return res.status(401).json({ error: 'Unauthorized: Incorrect password' });
  }

  const current = readLedger();
  current.entries = current.entries.map((e: any) => ({
    ...e,
    entries: 0,
    status: 'unpaid',
    notes: '',
  }));
  const saved = writeLedger(current);
  const stats = computeStats(saved);
  res.json({ success: true, message: 'All 100 roll numbers reset to 0 entries', ...saved, stats });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Roll70 Ledger Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

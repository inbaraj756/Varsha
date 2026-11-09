import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Printer,
  RotateCcw,
  Shield,
  Coins,
  Calculator,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { StudentData } from '../types.ts';

interface StudentPortalProps {
  onAdminClick: () => void;
  onStudentLoginSuccess: (student: StudentData) => void;
  activeStudent: StudentData | null;
  onStudentLogout: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onAdminClick,
  onStudentLoginSuccess,
  activeStudent,
  onStudentLogout,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().replace(/^#/, '');
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Please enter your Roll Number as Username (301 to 400).');
      return;
    }
    if (!cleanPass) {
      setError('Please enter your Roll Number as Password.');
      return;
    }

    const roll = parseInt(cleanUser, 10);
    if (isNaN(roll) || roll < 301 || roll > 400) {
      setError('Invalid Roll Number. Please enter a roll number between 301 and 400.');
      return;
    }

    if (cleanPass !== String(roll)) {
      setError(`Incorrect password for Roll #${roll}. Password must be equal to your roll number (${roll}).`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const data = await res.json();

      if (res.ok && data.student) {
        onStudentLoginSuccess(data.student);
        setError(null);
      } else {
        setError(data.error || 'Failed to authenticate. Please check your roll number.');
      }
    } catch {
      setError('Network connection failed. Please ensure dev server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (rollNum: number) => {
    setUsername(String(rollNum));
    setPassword(String(rollNum));
    setError(null);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8">
      {activeStudent ? (
        /* Logged In: Individual Student Statement Card */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Card Header Strip */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-widest font-mono text-indigo-300 font-semibold">
                  Varsha Student Register
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Roll Number #{activeStudent.rollNumber}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {activeStudent.name} · Individual Account Statement
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={onStudentLogout}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Check Another Roll</span>
              </button>
            </div>
          </div>

          {/* Statement Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Key Metric Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Entries Count */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>My Entries Count</span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {activeStudent.entries}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    entries recorded
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  Recorded for Roll #{activeStudent.rollNumber}
                </p>
              </div>

              {/* Unit Rate */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Rate per Entry</span>
                  <Calculator className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {activeStudent.currencySymbol}{activeStudent.unitRate}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    / 1 entry
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Fixed unit rate calculation
                </p>
              </div>

              {/* Calculated Sum */}
              <div className="p-5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>My Calculated Sum</span>
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-emerald-950 dark:text-emerald-200 font-mono tabular-nums">
                    {activeStudent.currencySymbol}
                    {activeStudent.totalSum.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-mono font-semibold">
                  {activeStudent.entries} × {activeStudent.currencySymbol}{activeStudent.unitRate} = {activeStudent.currencySymbol}{activeStudent.totalSum.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Detailed Calculation Slip Box */}
            <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Item Description
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Amount
                </span>
              </div>
              <div className="py-3 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-sans font-medium text-slate-800 dark:text-slate-200">
                    Roll #{activeStudent.rollNumber} ({activeStudent.name})
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Tally count: {activeStudent.entries} units @ {activeStudent.currencySymbol}{activeStudent.unitRate} each
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {activeStudent.currencySymbol}{activeStudent.totalSum.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Total Payable / Calculated Balance
                </span>
                <span className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                  {activeStudent.currencySymbol}{activeStudent.totalSum.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Privacy and Scope Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
              <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Varsha Privacy Shield Active:</strong>{' '}
                Only your personal calculated sum ({activeStudent.currencySymbol}{activeStudent.totalSum.toLocaleString()}) and entry count ({activeStudent.entries}) are shown here. Other roll numbers and the grand class total are strictly confidential and accessible exclusively by the administrator.
              </div>
            </div>

            {/* Back Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onStudentLogout}
                className="px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                ← Return to Roll Number Login
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Public Scene: Student Login Box */
        <div className="max-w-xl mx-auto">
          {/* Hero Branding */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-3">
              <Shield className="w-3.5 h-3.5" />
              Secure Individual Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Varsha
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
              Roll Numbers 301 to 400. Enter your roll number as username and password to view your entry count and calculated sum.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Student Roll Number Login
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Rolls 301 — 400
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username <span className="text-slate-400 font-normal">(Equal to your Roll #)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    #
                  </span>
                  <input
                    type="number"
                    min={301}
                    max={400}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. 301"
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-slate-400 font-normal">(Equal to your Roll #)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. 301"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Guidance Info Banner */}
              <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center justify-between gap-2">
                <span>
                  <strong>Requirement:</strong> For Roll 301, Username = <code className="font-mono font-bold">301</code> and Password = <code className="font-mono font-bold">301</code>.
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  'Verifying Roll Account...'
                ) : (
                  <>
                    <span>View My Calculated Sum</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Roll Numbers */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Roll Numbers (One-Click Fill)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[301, 302, 303, 305, 310, 325, 350, 370, 400].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleQuickFill(num)}
                    className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Roll {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Login Switch Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onAdminClick}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Portal Access · View All 100 Roll Numbers &amp; Grand Totals</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

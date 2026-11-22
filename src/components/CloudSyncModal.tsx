import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  Copy,
  Check,
  UserPlus,
  Trash2,
  UploadCloud,
  LogOut,
  X,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  CloudAdminRecord,
  listCoAdmins,
  addCoAdmin,
  removeCoAdmin,
} from '../services/firestoreLedger.ts';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseUser: User | null;
  isCloudAdmin: boolean;
  cloudStatus: 'disconnected' | 'connecting' | 'synced' | 'unauthorized' | 'error';
  cloudError: string | null;
  onSignInGoogle: () => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onForcePushToCloud: () => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  firebaseUser,
  isCloudAdmin,
  cloudStatus,
  cloudError,
  onSignInGoogle,
  onSignOutGoogle,
  onForcePushToCloud,
}) => {
  const [coAdmins, setCoAdmins] = useState<CloudAdminRecord[]>([]);
  const [newUid, setNewUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isCloudAdmin) {
      setCoAdmins([]);
      return;
    }
    listCoAdmins()
      .then(setCoAdmins)
      .catch(() => {
        // handled cleanly
      });
  }, [isOpen, isCloudAdmin]);

  if (!isOpen) return null;

  const handleCopyUid = async () => {
    if (!firebaseUser?.uid) return;
    try {
      await navigator.clipboard.writeText(firebaseUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAddCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.uid) return;
    setActionErr(null);
    setActionMsg(null);
    setBusy(true);
    try {
      await addCoAdmin(newUid, newEmail, firebaseUser.uid);
      const updated = await listCoAdmins();
      setCoAdmins(updated);
      setNewUid('');
      setNewEmail('');
      setActionMsg('Co-admin authorized. That mobile can now read & save cloud entries!');
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : 'Failed to authorize co-admin.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveCoAdmin = async (uid: string) => {
    setActionErr(null);
    setActionMsg(null);
    setBusy(true);
    try {
      await removeCoAdmin(uid);
      setCoAdmins((prev) => prev.filter((item) => item.uid !== uid));
      setActionMsg('Co-admin access revoked.');
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : 'Failed to remove co-admin.');
    } finally {
      setBusy(false);
    }
  };

  const handleForcePush = async () => {
    setActionErr(null);
    setActionMsg(null);
    setBusy(true);
    try {
      await onForcePushToCloud();
      setActionMsg('All 100 roll entries uploaded to Cloud Firestore. Other mobiles will update live!');
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : 'Failed to push entries to cloud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
          aria-label="Close cloud sync modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              isCloudAdmin
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {isCloudAdmin ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Multi-Mobile Cloud Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Syncs all 100 roll entries live across every mobile phone and browser.
            </p>
          </div>
        </div>

        {/* Account Connection Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 mb-4">
          {!firebaseUser ? (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Sign in with your Google Account (<strong>{BOOTSTRAPPED_ADMIN_EMAIL}</strong> or an authorized co-admin account) so entries saved on one phone appear automatically on every other phone.
              </p>
              <button
                type="button"
                onClick={onSignInGoogle}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Cloud className="w-4 h-4" />
                Sign in with Google for Cloud Sync
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Connected Google Account
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white break-all">
                    {firebaseUser.email}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <code className="text-[11px] font-mono bg-slate-200/70 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 break-all">
                      UID: {firebaseUser.uid}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Copy UID"
                    >
                      {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>

              {isCloudAdmin ? (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {cloudStatus === 'synced' ? 'Live Cloud Sync Active' : 'Cloud Admin Authorized'}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleForcePush}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Push Current Table to Cloud
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Second Mobile Authorization Needed
                  </div>
                  <p>
                    This Google account is not yet authorized as a Cloud Admin. Either sign in with{' '}
                    <strong>{BOOTSTRAPPED_ADMIN_EMAIL}</strong>, or copy the <strong>UID</strong> above and ask the primary admin to add it below on their phone.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {(cloudError || actionErr) && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{actionErr || cloudError}</span>
          </div>
        )}

        {actionMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Co-Admin Management for Second Mobile */}
        {isCloudAdmin && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Authorize Another Mobile Admin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Using another phone with a different Google account? Have them open this Cloud Sync window, copy their UID, and add it here.
              </p>
            </div>

            <form onSubmit={handleAddCoAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                placeholder="Paste other mobile's UID"
                className="px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Their Google email"
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="sm:col-span-2 py-2 px-3 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Authorize Co-Admin Mobile
              </button>
            </form>

            {coAdmins.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {coAdmins.map((admin) => (
                  <div
                    key={admin.uid}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {admin.email}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {admin.uid}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoAdmin(admin.uid)}
                      disabled={busy}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md cursor-pointer shrink-0"
                      title="Remove co-admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

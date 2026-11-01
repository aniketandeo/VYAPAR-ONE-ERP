import React, { useState } from 'react';
import { AlertTriangle, Download, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: any) => void;
  title?: string;
  recordType?: string;
  recordIdentifier?: string;
  linkedRecords?: string[];
  safeAlternativeText?: string;
  onSafeAlternative?: () => void;
  onDownloadBackup?: () => void;
  itemType?: string;
  itemName?: string;
  linkedData?: Array<{ label: string; count?: number; impact?: string } | string>;
  safeAlternative?: string;
  snapshotData?: any;
}

export const REQUIRED_AUTH_PHONE = '7666257368';

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  recordType,
  recordIdentifier,
  linkedRecords = [],
  safeAlternativeText,
  onSafeAlternative,
  onDownloadBackup,
  itemType,
  itemName,
  linkedData,
  safeAlternative,
  snapshotData,
}) => {
  const [authInput, setAuthInput] = useState('');
  const [error, setError] = useState('');
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  if (!isOpen) return null;

  const displayTitle = title || `Confirm Permanent Deletion of ${itemType || recordType || 'Record'}`;
  const displayRecordType = recordType || itemType || 'Record';
  const displayIdentifier = recordIdentifier || itemName || '';
  const displaySafeAlt = safeAlternativeText || safeAlternative;
  const displayLinked: string[] =
    linkedRecords.length > 0
      ? linkedRecords
      : (linkedData || []).map((item) =>
          typeof item === 'string'
            ? item
            : `${item.label}${item.count !== undefined ? `: ${item.count}` : ''}${item.impact ? ` (${item.impact})` : ''}`
        );

  const handleDownloadBackup = () => {
    if (onDownloadBackup) {
      onDownloadBackup();
      setBackupDownloaded(true);
    } else if (snapshotData) {
      const jsonStr = JSON.stringify(snapshotData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeletionSnapshot_${displayRecordType.replace(/\s+/g, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    }
  };

  const handleConfirm = () => {
    if (authInput.trim() !== REQUIRED_AUTH_PHONE) {
      setError(`Security code mismatch. You must enter the authorized verification number (${REQUIRED_AUTH_PHONE}) to proceed.`);
      return;
    }
    setError('');
    onConfirm('Security code 7666257368 verified');
    setAuthInput('');
    setBackupDownloaded(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-red-200 overflow-hidden animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Authorized Deletion Safeguard</h3>
              <p className="text-xs text-red-100">VYAPAR ONE ERP Security Protocol</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAuthInput('');
              setError('');
              onClose();
            }}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 text-sm">{displayTitle}</h4>
            <p className="text-xs text-red-700 mt-1">
              Target {displayRecordType}: <span className="font-bold underline">{displayIdentifier}</span>
            </p>
          </div>

          {/* Linked records warning */}
          {displayLinked.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
              <div className="flex items-center space-x-2 font-bold mb-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Linked Data Warning</span>
              </div>
              <p className="mb-2">
                This {displayRecordType.toLowerCase()} is associated with the following active records. Permanent deletion may break ledger or audit continuity:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-amber-950 font-medium">
                {displayLinked.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Safe alternative option */}
          {displaySafeAlt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">Safe Alternative Recommended</p>
                <p className="text-blue-700 mt-0.5">{displaySafeAlt}</p>
              </div>
              {onSafeAlternative && (
                <button
                  type="button"
                  onClick={() => {
                    onSafeAlternative();
                    onClose();
                  }}
                  className="ml-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs shrink-0 transition"
                >
                  Use Alternative
                </button>
              )}
            </div>
          )}

          {/* Backup Action */}
          {(onDownloadBackup || snapshotData) && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Export Backup Archive</span>
                <p className="text-slate-500">Download snapshot of this record before deletion</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  backupDownloaded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {backupDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Snapshot Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Save Snapshot</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Security Authorization Code Input */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Enter Authorized Verification Code to Confirm Deletion:
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              For system integrity, enter the authorized administrator verification number:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={authInput}
                onChange={(e) => {
                  setAuthInput(e.target.value);
                  setError('');
                }}
                placeholder="Enter 7666257368"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-2 font-medium bg-red-50 p-2 rounded border border-red-200">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthInput('');
              setError('');
              onClose();
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel (Keep Safe)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            Verify & Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
};

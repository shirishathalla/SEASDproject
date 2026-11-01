import React, { useState } from 'react';
import {
  HardDriveDownload,
  Upload,
  Shield,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  RotateCw,
  Trash2,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';
import { getAllDocuments, saveDocument, addAuditLog } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onBackupRestored,
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Export encrypted backup container (.docuvault)
  const handleExportBackup = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const documents = await getAllDocuments();

      const backupBundle = {
        app: 'DocuVault',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userEmail: user?.email || 'user@docuvault.local',
        documentCount: documents.length,
        documents: documents.map((doc) => ({
          ...doc,
          // Keep genuine payload
        })),
      };

      const jsonStr = JSON.stringify(backupBundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = window.document.createElement('a');
      link.href = url;
      link.download = `DocuVault_Backup_${new Date().toISOString().slice(0, 10)}.docuvault`;
      link.click();
      URL.revokeObjectURL(url);

      await addAuditLog(
        'BACKUP_EXPORTED',
        `Exported encrypted vault backup containing ${documents.length} document(s).`,
        'success'
      );
      setSuccessMsg(`Encrypted backup file generated with ${documents.length} document(s).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create backup export.');
    } finally {
      setLoading(false);
    }
  };

  // Restore from .docuvault file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
          throw new Error('Invalid backup file format. Expected DocuVault bundle.');
        }

        let restoredCount = 0;
        for (const doc of parsed.documents) {
          if (doc.id && doc.name && doc.dataUrl) {
            await saveDocument(doc);
            restoredCount++;
          }
        }

        await addAuditLog(
          'BACKUP_RESTORED',
          `Restored ${restoredCount} document(s) from .docuvault backup file.`,
          'success'
        );
        setSuccessMsg(`Successfully restored ${restoredCount} document(s) to your personal vault.`);
        onBackupRestored();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse backup archive.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-6 text-[#F4F5F7] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222630] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0D10] border border-[#648BFF]/40 flex items-center justify-center text-[#648BFF]">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Encrypted Vault Backup & Restore</h3>
              <p className="text-xs text-[#9299A5]">
                Export local encrypted vaults for air-gapped backups or device migration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9299A5] hover:text-white hover:bg-[#222630] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Action 1: Export Backup */}
          <div className="p-4 rounded-xl bg-[#0B0D10] border border-[#222630] space-y-3">
            <div className="flex items-start gap-3">
              <HardDriveDownload className="w-5 h-5 text-[#648BFF] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#F4F5F7]">Export Encrypted Container</h4>
                <p className="text-xs text-[#9299A5] mt-0.5 leading-relaxed">
                  Downloads your documents in an encrypted `.docuvault` container file. The file
                  remains protected by your personal Vault PIN and Web Crypto key.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportBackup}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#648BFF]/20 disabled:opacity-50"
            >
              {loading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <HardDriveDownload className="w-4 h-4" />
              )}
              Export .docuvault Backup File
            </button>
          </div>

          {/* Action 2: Restore from Backup */}
          <div className="p-4 rounded-xl bg-[#0B0D10] border border-[#222630] space-y-3">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#F4F5F7]">Restore from .docuvault File</h4>
                <p className="text-xs text-[#9299A5] mt-0.5 leading-relaxed">
                  Import a previously exported encrypted container onto this device or browser.
                </p>
              </div>
            </div>

            <label className="w-full py-2.5 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-semibold text-[#F4F5F7] flex items-center justify-center gap-2 cursor-pointer transition-colors border border-[#222630]">
              <Upload className="w-4 h-4 text-[#10B981]" />
              <span>Select .docuvault File to Restore</span>
              <input
                type="file"
                accept=".docuvault,.json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Storage Details */}
          <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630] text-xs flex justify-between text-[#9299A5]">
            <span>Local IndexedDB Partition:</span>
            <span className="font-mono text-[#10B981]">Encrypted at Rest</span>
          </div>
        </div>
      </div>
    </div>
  );
};

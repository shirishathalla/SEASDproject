import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  Clock,
  HardDriveDownload,
  QrCode,
  Users,
  AlertTriangle,
  History,
  FileCheck,
  Sparkles,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, getQRShares, getFamilyMembers, getEmergencyContacts } from '../utils/storage';
import type { AuditLog } from '../utils/storage';

interface SecurityDashboardProps {
  onOpenBackup: () => void;
  onOpenEmergency: () => void;
  onChangePin: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  onOpenBackup,
  onOpenEmergency,
  onChangePin,
}) => {
  const {
    user,
    isVaultUnlocked,
    lockVault,
    autoLockMinutes,
    setAutoLockDuration,
    enableBiometricsAction,
    disableBiometricsAction,
  } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeSharesCount, setActiveSharesCount] = useState<number>(0);
  const [familyCount, setFamilyCount] = useState<number>(0);
  const [emergencyCount, setEmergencyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [fetchedLogs, shares, family, emergency] = await Promise.all([
      getAuditLogs(30),
      getQRShares(),
      getFamilyMembers(),
      getEmergencyContacts(),
    ]);

    setLogs(fetchedLogs);
    setActiveSharesCount(shares.filter((s) => s.status === 'active').length);
    setFamilyCount(family.length);
    setEmergencyCount(emergency.length);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] to-[#0B0D10] border border-[#222630] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#F4F5F7]">Security & Cryptographic Audit</h2>
          </div>
          <p className="text-xs text-[#9299A5] max-w-xl leading-relaxed">
            Review live zero-knowledge cryptographic parameters, session auto-lock rules, platform
            biometric hardware telemetry, and immutable security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isVaultUnlocked ? (
            <button
              onClick={lockVault}
              className="px-4 py-2 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-semibold text-[#EF4444] border border-[#EF4444]/30 flex items-center gap-2 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Vault Now
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-[#EF4444]/15 text-[#EF4444] text-xs font-mono border border-[#EF4444]/30">
              Vault Locked
            </span>
          )}
        </div>
      </div>

      {/* Security Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cryptography Engine */}
        <div className="p-5 rounded-2xl bg-[#171A20] border border-[#222630] space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10">
              Active
            </span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#F4F5F7]">Zero-Knowledge AES-256</h4>
            <p className="text-xs text-[#9299A5] mt-1">
              Client-side PBKDF2 with HMAC-SHA-256 (100,000 rounds). Server receives 0 plaintext bits.
            </p>
          </div>
          <div className="pt-2 border-t border-[#222630] text-[11px] font-mono text-[#9299A5]">
            Salt: {user?.pinSaltHex ? `${user.pinSaltHex.substring(0, 16)}...` : 'Device Local'}
          </div>
        </div>

        {/* Card 2: Biometrics Hardware */}
        <div className="p-5 rounded-2xl bg-[#171A20] border border-[#222630] space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#648BFF]/15 text-[#648BFF] flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                user?.biometricsEnabled
                  ? 'bg-[#10B981]/10 text-[#10B981]'
                  : 'bg-[#222630] text-[#9299A5]'
              }`}
            >
              {user?.biometricsEnabled ? 'Registered' : 'Disabled'}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#F4F5F7]">WebAuthn Platform Sensor</h4>
            <p className="text-xs text-[#9299A5] mt-1">
              Native fingerprint / Face ID platform credential binding with secure PIN fallback.
            </p>
          </div>
          <div className="pt-2 border-t border-[#222630]">
            {user?.biometricsEnabled ? (
              <button
                onClick={disableBiometricsAction}
                className="text-xs text-[#EF4444] hover:underline"
              >
                Disable Biometric Login
              </button>
            ) : (
              <button
                onClick={enableBiometricsAction}
                className="text-xs text-[#648BFF] hover:underline font-medium"
              >
                Enable Platform Sensor
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Inactivity Auto-Lock */}
        <div className="p-5 rounded-2xl bg-[#171A20] border border-[#222630] space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-[#F59E0B] px-2 py-0.5 rounded bg-[#F59E0B]/10">
              {autoLockMinutes === 0 ? 'Disabled' : `${autoLockMinutes} min`}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#F4F5F7]">Session Auto-Lock Duration</h4>
            <p className="text-xs text-[#9299A5] mt-1">
              Automatically purges master session decryption keys from memory upon idle timeout.
            </p>
          </div>
          <div className="pt-2 border-t border-[#222630] flex items-center gap-2">
            {[1, 5, 15, 0].map((mins) => (
              <button
                key={mins}
                onClick={() => setAutoLockDuration(mins)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  autoLockMinutes === mins
                    ? 'bg-[#648BFF] text-white font-bold'
                    : 'bg-[#0B0D10] text-[#9299A5] hover:text-white border border-[#222630]'
                }`}
              >
                {mins === 0 ? 'Never' : `${mins}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Access Controls Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="w-4 h-4 text-[#648BFF]" />
            <div>
              <span className="text-xs text-[#9299A5] block">Active QR Shares</span>
              <span className="text-sm font-bold text-[#F4F5F7] font-mono">{activeSharesCount}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-[#10B981]" />
            <div>
              <span className="text-xs text-[#9299A5] block">Family Members</span>
              <span className="text-sm font-bold text-[#F4F5F7] font-mono">{familyCount}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            <div>
              <span className="text-xs text-[#9299A5] block">Emergency Proxies</span>
              <span className="text-sm font-bold text-[#F4F5F7] font-mono">{emergencyCount}</span>
            </div>
          </div>
          <button
            onClick={onOpenEmergency}
            className="text-xs text-[#648BFF] hover:underline"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Immutable Security Audit Logs */}
      <div className="p-6 rounded-2xl bg-[#171A20] border border-[#222630] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#648BFF]" />
            <h4 className="font-bold text-sm text-[#F4F5F7]">Security Activity & Audit Log</h4>
          </div>
          <button
            onClick={loadData}
            className="text-xs text-[#9299A5] hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success'
                        ? 'bg-[#10B981]'
                        : log.status === 'warning'
                        ? 'bg-[#EF4444]'
                        : 'bg-[#648BFF]'
                    }`}
                  />
                  <span className="font-mono font-semibold text-[#F4F5F7]">{log.action}</span>
                </div>
                <p className="text-[11px] text-[#9299A5] mt-0.5 ml-4">{log.details}</p>
              </div>

              <span className="font-mono text-[10px] text-[#9299A5] ml-4 sm:ml-0 shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

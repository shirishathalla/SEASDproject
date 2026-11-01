import React from 'react';
import {
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Bell,
  Clock,
  Sparkles,
  User,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  expiringCount: number;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenProfile,
  onOpenNotifications,
  expiringCount,
  isDemoMode,
  onToggleDemoMode,
}) => {
  const { user, isVaultUnlocked, lockVault, remainingLockSeconds, autoLockMinutes } = useAuth();

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0B0D10]/90 backdrop-blur-md border-b border-[#222630] px-4 lg:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#648BFF]/20 to-[#171A20] border border-[#648BFF]/40 flex items-center justify-center shadow-lg shadow-[#648BFF]/5">
            <Shield className="w-5 h-5 text-[#648BFF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#F4F5F7] font-sans">
                Docu<span className="text-[#648BFF]">Vault</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#171A20] text-[#9299A5] border border-[#222630]">
                AES-256
              </span>
            </div>
            <p className="hidden sm:block text-xs text-[#9299A5] font-normal">
              Carry your identity securely, not your documents.
            </p>
          </div>
        </div>

        {/* Center / Right Control Panel */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Mode Academic Switch */}
          <button
            onClick={onToggleDemoMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isDemoMode
                ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40 shadow-sm'
                : 'bg-[#171A20] text-[#9299A5] border-[#222630] hover:text-[#F4F5F7]'
            }`}
            title="Toggle fictional academic demonstration documents"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Academic Demo:</span>
            <span>{isDemoMode ? 'Active' : 'Empty Vault'}</span>
          </button>

          {/* Vault Lock Status & Auto-Lock Timer */}
          {isVaultUnlocked ? (
            <div className="flex items-center gap-2 bg-[#171A20] border border-[#222630] px-2.5 py-1 rounded-lg">
              {autoLockMinutes > 0 && (
                <div
                  className="flex items-center gap-1.5 text-xs font-mono text-[#9299A5]"
                  title={`Auto-locks after ${autoLockMinutes} min of inactivity`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#648BFF]" />
                  <span>{formatTime(remainingLockSeconds)}</span>
                </div>
              )}
              <button
                onClick={lockVault}
                className="flex items-center gap-1 text-xs text-[#9299A5] hover:text-[#F4F5F7] bg-[#222630] hover:bg-[#2c3240] px-2 py-1 rounded transition-colors"
                title="Lock vault immediately"
              >
                <Lock className="w-3 h-3 text-[#EF4444]" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 px-2.5 py-1.5 rounded-lg text-xs text-[#EF4444]">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Vault Locked</span>
            </div>
          )}

          {/* Notifications for Expiring Documents */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-[#171A20] border border-[#222630] text-[#9299A5] hover:text-[#F4F5F7] hover:border-[#648BFF]/40 transition-colors"
            title="Document Expiry Notifications"
          >
            <Bell className="w-4 h-4" />
            {expiringCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {expiringCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-[#171A20] border border-[#222630] hover:border-[#648BFF]/40 transition-all text-left"
          >
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.fullName || 'User'}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#648BFF]/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#222630] flex items-center justify-center text-[#648BFF]">
                <User className="w-4 h-4" />
              </div>
            )}
            <span className="hidden lg:inline text-xs font-medium text-[#F4F5F7] truncate max-w-[100px]">
              {user?.fullName?.split(' ')[0] || 'User'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

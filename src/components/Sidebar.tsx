import React from 'react';
import {
  FolderLock,
  Camera,
  Search,
  Bot,
  User,
  ClockAlert,
  Users,
  HeartPulse,
  ShieldCheck,
  QrCode,
  HardDriveDownload,
  AlertTriangle,
} from 'lucide-react';

export type MainTabType =
  | 'vault'
  | 'scan'
  | 'search'
  | 'assistant'
  | 'profile'
  | 'expiry'
  | 'family'
  | 'health'
  | 'security'
  | 'qr-share'
  | 'backup'
  | 'emergency';

interface SidebarProps {
  currentTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  expiringCount: number;
  healthCount: number;
  familyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  expiringCount,
  healthCount,
  familyCount,
}) => {
  const primaryNavItems = [
    { id: 'vault' as MainTabType, label: 'Vault', icon: FolderLock },
    { id: 'scan' as MainTabType, label: 'Add / Scan', icon: Camera, highlight: true },
    { id: 'search' as MainTabType, label: 'Search & OCR', icon: Search },
    { id: 'assistant' as MainTabType, label: 'AI Assistant', icon: Bot },
    { id: 'profile' as MainTabType, label: 'Profile', icon: User },
  ];

  const securityHubItems = [
    {
      id: 'expiry' as MainTabType,
      label: 'Expiry & Renewals',
      icon: ClockAlert,
      badge: expiringCount > 0 ? expiringCount : undefined,
      badgeColor: 'bg-[#EF4444]',
    },
    {
      id: 'health' as MainTabType,
      label: 'Private Health Vault',
      icon: HeartPulse,
      badge: healthCount > 0 ? healthCount : undefined,
      badgeColor: 'bg-[#8B5CF6]',
    },
    {
      id: 'family' as MainTabType,
      label: 'Family Vault',
      icon: Users,
      badge: familyCount > 0 ? familyCount : undefined,
      badgeColor: 'bg-[#648BFF]',
    },
    {
      id: 'emergency' as MainTabType,
      label: 'Emergency Access',
      icon: AlertTriangle,
    },
    {
      id: 'qr-share' as MainTabType,
      label: 'Secure QR Share',
      icon: QrCode,
    },
    {
      id: 'security' as MainTabType,
      label: 'Security & Privacy',
      icon: ShieldCheck,
    },
    {
      id: 'backup' as MainTabType,
      label: 'Backup & Storage',
      icon: HardDriveDownload,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0B0D10] border-r border-[#222630] min-h-[calc(100vh-65px)] p-4 select-none shrink-0">
        <div className="space-y-6 flex-1">
          {/* Main Primary Tabs */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-[#9299A5] uppercase tracking-wider">
              Core Wallet
            </div>
            <nav className="space-y-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#171A20] text-[#648BFF] border border-[#648BFF]/30 shadow-sm'
                        : item.highlight
                        ? 'text-[#F4F5F7] bg-[#171A20]/60 hover:bg-[#171A20] border border-[#222630]'
                        : 'text-[#9299A5] hover:text-[#F4F5F7] hover:bg-[#171A20]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#648BFF]' : ''}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Security & Specialized Hub */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-[#9299A5] uppercase tracking-wider">
              Security & Sharing
            </div>
            <nav className="space-y-1">
              {securityHubItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#171A20] text-[#648BFF] border border-[#648BFF]/30'
                        : 'text-[#9299A5] hover:text-[#F4F5F7] hover:bg-[#171A20]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#648BFF]' : 'text-[#9299A5]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                          item.badgeColor || 'bg-[#222630]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Security Baseline Badge at bottom */}
        <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630] text-xs">
          <div className="flex items-center gap-2 text-[#10B981] font-medium mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Zero-Knowledge Active</span>
          </div>
          <p className="text-[11px] text-[#9299A5] leading-relaxed">
            Keys derived locally via PBKDF2 (100k iters). Encrypted with AES-256-GCM.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 core tabs as requested) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D10]/95 backdrop-blur-lg border-t border-[#222630] px-2 py-2 flex items-center justify-around">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-[#648BFF]'
                  : 'text-[#9299A5] hover:text-[#F4F5F7]'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  isActive ? 'bg-[#648BFF]/15 text-[#648BFF]' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

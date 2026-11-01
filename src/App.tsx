import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, MainTabType } from './components/Sidebar';
import { VaultView } from './components/VaultView';
import { ScannerModal } from './components/ScannerModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { ExpiryDashboard } from './components/ExpiryDashboard';
import { FamilyVaultView } from './components/FamilyVaultView';
import { HealthVaultView } from './components/HealthVaultView';
import { AIAssistantView } from './components/AIAssistantView';
import { SmartSearchView } from './components/SmartSearchView';
import { SecurityDashboard } from './components/SecurityDashboard';
import { QRShareModal } from './components/QRShareModal';
import { BackupModal } from './components/BackupModal';
import { EmergencyAccessModal } from './components/EmergencyAccessModal';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { VaultUnlockModal } from './components/VaultUnlockModal';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  addAuditLog,
  loadAcademicDemoData,
  clearAcademicDemoData,
  DocumentItem,
} from './utils/storage';
import { Shield, EyeOff, Bell, ClockAlert, X, AlertTriangle } from 'lucide-react';

const DocuVaultApp: React.FC = () => {
  const { isAuthenticated, isVaultUnlocked, isPrivacyObscured } = useAuth();

  const [currentTab, setCurrentTab] = useState<MainTabType>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Active Modals
  const [isScanOpen, setIsScanOpen] = useState<boolean>(false);
  const [activeViewerDoc, setActiveViewerDoc] = useState<DocumentItem | null>(null);
  const [activeQRDoc, setActiveQRDoc] = useState<DocumentItem | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Load documents from IndexedDB
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
      setIsDemoMode(docs.some((d) => d.isDemo));
    } catch (err) {
      console.error('[DocuVault Load Error]', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (isVaultUnlocked) {
      loadDocuments();
    }
  }, [isVaultUnlocked, loadDocuments]);

  // Handle Document Operations
  const handleSaveDocument = async (doc: DocumentItem) => {
    await saveDocument(doc);
    await addAuditLog('DOCUMENT_SAVED', `Stored document "${doc.name}" in category "${doc.category}".`, 'success');
    await loadDocuments();
  };

  const handleUpdateDocument = async (doc: DocumentItem) => {
    await saveDocument(doc);
    await addAuditLog('DOCUMENT_UPDATED', `Modified metadata for "${doc.name}".`, 'info');
    await loadDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    const docToDelete = documents.find((d) => d.id === id);
    await deleteDocument(id);
    await addAuditLog('DOCUMENT_DELETED', `Deleted document "${docToDelete?.name || id}".`, 'warning');
    await loadDocuments();
    if (activeViewerDoc?.id === id) setActiveViewerDoc(null);
  };

  const handleToggleFavorite = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const updated = { ...doc, isFavorite: !doc.isFavorite };
    await saveDocument(updated);
    await loadDocuments();
  };

  // Toggle Academic Presentation Demo Mode
  const handleToggleDemoMode = async () => {
    if (isDemoMode) {
      // Clear demo data
      await clearAcademicDemoData();
      setIsDemoMode(false);
    } else {
      // Load safe fictional demo documents
      await loadAcademicDemoData();
      setIsDemoMode(true);
    }
    await loadDocuments();
  };

  // Compute counts for badges
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringDocuments = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const exp = new Date(doc.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30; // 30 days or already expired
  });

  const healthDocsCount = documents.filter(
    (d) =>
      d.category.toLowerCase() === 'health' ||
      d.tags.some((t) => ['health', 'medical', 'prescription'].includes(t.toLowerCase()))
  ).length;

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F4F5F7] flex flex-col font-sans selection:bg-[#648BFF]/30 selection:text-white">
      {/* Background Privacy Shield */}
      {isPrivacyObscured && isVaultUnlocked && (
        <div className="fixed inset-0 z-50 bg-[#0B0D10]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#171A20] border border-[#648BFF]/40 flex items-center justify-center mb-4 text-[#648BFF]">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F4F5F7]">Privacy Shield Activated</h2>
          <p className="text-xs text-[#9299A5] mt-1 max-w-sm">
            DocuVault obscures your sensitive document wallet when the window or tab loses focus
            to protect against shoulder-surfing.
          </p>
          <span className="text-[11px] text-[#648BFF] mt-4 font-mono">
            Click anywhere or refocus window to resume
          </span>
        </div>
      )}

      {/* Auth Modals */}
      {!isAuthenticated && <AuthModal isOpen={true} />}
      {isAuthenticated && !isVaultUnlocked && <VaultUnlockModal />}

      {/* Main Top Navigation */}
      <Navbar
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        expiringCount={expiringDocuments.length}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-6">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'scan') {
              setIsScanOpen(true);
            } else if (tab === 'backup') {
              setIsBackupOpen(true);
            } else if (tab === 'emergency') {
              setIsEmergencyOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          expiringCount={expiringDocuments.length}
          healthCount={healthDocsCount}
          familyCount={0}
        />

        {/* View Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {currentTab === 'vault' && (
            <VaultView
              documents={documents}
              onOpenScan={() => setIsScanOpen(true)}
              onOpenAssistant={() => setCurrentTab('assistant')}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
              onToggleFavorite={handleToggleFavorite}
              onDeleteDocument={handleDeleteDocument}
              onShareQR={(doc) => setActiveQRDoc(doc)}
              onUpdateDocument={handleUpdateDocument}
              isDemoMode={isDemoMode}
              onToggleDemoMode={handleToggleDemoMode}
            />
          )}

          {currentTab === 'search' && (
            <SmartSearchView
              documents={documents}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
            />
          )}

          {currentTab === 'assistant' && (
            <AIAssistantView
              documents={documents}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
            />
          )}

          {currentTab === 'expiry' && (
            <ExpiryDashboard
              documents={documents}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
              onOpenScan={() => setIsScanOpen(true)}
            />
          )}

          {currentTab === 'family' && (
            <FamilyVaultView
              documents={documents}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
            />
          )}

          {currentTab === 'health' && (
            <HealthVaultView
              documents={documents}
              onViewDocument={(doc) => setActiveViewerDoc(doc)}
              onOpenScan={() => setIsScanOpen(true)}
            />
          )}

          {currentTab === 'security' && (
            <SecurityDashboard
              onOpenBackup={() => setIsBackupOpen(true)}
              onOpenEmergency={() => setIsEmergencyOpen(true)}
              onChangePin={() => setCurrentTab('profile')}
            />
          )}

          {currentTab === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Document Upload & Scanner Modal */}
      <ScannerModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSaveDocument={handleSaveDocument}
      />

      {/* 2. Full-Screen Document Viewer & Cryptographic Inspector */}
      <DocumentViewerModal
        document={activeViewerDoc}
        isOpen={!!activeViewerDoc}
        onClose={() => setActiveViewerDoc(null)}
        onShareQR={(doc) => {
          setActiveViewerDoc(null);
          setActiveQRDoc(doc);
        }}
      />

      {/* 3. Secure QR Share Modal */}
      <QRShareModal
        document={activeQRDoc || documents[0] || null}
        isOpen={!!activeQRDoc}
        onClose={() => setActiveQRDoc(null)}
      />

      {/* 4. Encrypted Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onBackupRestored={loadDocuments}
      />

      {/* 5. Emergency Access Modal */}
      <EmergencyAccessModal
        documents={documents}
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onViewDocument={(doc) => {
          setIsEmergencyOpen(false);
          setActiveViewerDoc(doc);
        }}
      />

      {/* 6. Renewal Notifications Drawer */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-[#F4F5F7] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#222630]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#648BFF]" />
                <h4 className="font-bold text-sm">Upcoming Renewal Notifications</h4>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 rounded-lg text-[#9299A5] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expiringDocuments.length > 0 ? (
              <div className="space-y-2.5">
                {expiringDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setActiveViewerDoc(doc);
                    }}
                    className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] hover:border-[#648BFF]/40 cursor-pointer transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="truncate">{doc.name}</span>
                      <span className="text-[10px] font-mono text-[#F59E0B]">
                        {doc.expiryDate}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9299A5]">
                      Category: {doc.category} • Click to open document details
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#9299A5]">
                No documents require renewal in the next 30 days.
              </div>
            )}

            <button
              onClick={() => {
                setIsNotificationsOpen(false);
                setCurrentTab('expiry');
              }}
              className="w-full py-2 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-semibold text-[#648BFF] transition-colors"
            >
              View Full Expiry Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DocuVaultApp />
    </AuthProvider>
  );
}

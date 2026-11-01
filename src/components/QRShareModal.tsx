import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Lock,
  Clock,
  Download,
  Copy,
  Check,
  X,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Eye,
  AlertCircle,
} from 'lucide-react';
import type { DocumentItem, QRShare } from '../utils/storage';
import { saveQRShare, getQRShares, revokeQRShare, addAuditLog } from '../utils/storage';

interface QRShareModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !doc) return null;

  const [activeTab, setActiveTab] = useState<'generate' | 'active_shares'>('generate');
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [requirePassword, setRequirePassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState<boolean>(true);

  // Generated Share result
  const [generatedShare, setGeneratedShare] = useState<QRShare | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Existing active shares for this document
  const [activeShares, setActiveShares] = useState<QRShare[]>([]);
  const [loadingShares, setLoadingShares] = useState<boolean>(false);

  // Recipient Simulation preview
  const [showRecipientPreview, setShowRecipientPreview] = useState<boolean>(false);

  const loadActiveShares = async () => {
    setLoadingShares(true);
    const shares = await getQRShares();
    const docShares = shares.filter((s) => s.documentId === doc.id);
    setActiveShares(docShares);
    setLoadingShares(false);
  };

  useEffect(() => {
    loadActiveShares();
  }, [doc]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();

    const shareCode = `dv_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString();

    const shareUrl = `${window.location.origin}/#share=${shareCode}`;

    try {
      const qrImage = await QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0B0D10',
          light: '#F4F5F7',
        },
      });

      const newShare: QRShare = {
        id: `qr_${Date.now()}`,
        shareCode,
        documentId: doc.id,
        documentName: doc.name,
        createdAt: now.toISOString(),
        expiresAt,
        hasPassword: requirePassword && !!password,
        password: requirePassword ? password : undefined,
        allowDownload,
        status: 'active',
        accessCount: 0,
      };

      await saveQRShare(newShare);
      await addAuditLog(
        'QR_SHARE_CREATED',
        `Generated temporary QR code for document "${doc.name}". Expires in ${expiryHours} hours.`,
        'success'
      );

      setQrDataUrl(qrImage);
      setGeneratedShare(newShare);
      await loadActiveShares();
    } catch (err: any) {
      console.error('[DocuVault QR Error]', err);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeQRShare(id);
    await addAuditLog('QR_SHARE_REVOKED', `Revoked active QR share link for document "${doc.name}".`, 'warning');
    if (generatedShare?.id === id) {
      setGeneratedShare(null);
      setQrDataUrl(null);
    }
    await loadActiveShares();
  };

  const shareLink = generatedShare
    ? `${window.location.origin}/#share=${generatedShare.shareCode}`
    : '';

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-5 sm:p-7 text-[#F4F5F7] relative max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222630] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0D10] border border-[#648BFF]/40 flex items-center justify-center text-[#648BFF]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Secure QR Document Sharing</h3>
              <p className="text-xs text-[#9299A5] truncate max-w-[260px]">{doc.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9299A5] hover:text-white hover:bg-[#222630] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 mb-5 p-1 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'generate' ? 'bg-[#171A20] text-[#648BFF]' : 'text-[#9299A5]'
            }`}
          >
            Generate New QR Share
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active_shares')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'active_shares' ? 'bg-[#171A20] text-[#648BFF]' : 'text-[#9299A5]'
            }`}
          >
            Active Shares ({activeShares.filter((s) => s.status === 'active').length})
          </button>
        </div>

        {/* --- TAB 1: GENERATE SHARE --- */}
        {activeTab === 'generate' && (
          <div className="space-y-4">
            {!generatedShare ? (
              <form onSubmit={handleCreateShare} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs text-[#9299A5]">
                  <span className="font-semibold text-[#F4F5F7] block mb-1">
                    Isolated Single-Document Grant
                  </span>
                  Sharing this document will generate a time-limited, verifiable access token for this
                  exact document only. Your remaining personal vault is never exposed.
                </div>

                {/* Expiration Options */}
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1.5">
                    Link Expiration Window
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 1, label: '1 Hour' },
                      { hours: 24, label: '24 Hours' },
                      { hours: 168, label: '7 Days' },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setExpiryHours(opt.hours)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          expiryHours === opt.hours
                            ? 'bg-[#171A20] text-[#648BFF] border-[#648BFF]/40'
                            : 'bg-[#0B0D10] text-[#9299A5] border-[#222630] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Passphrase Protection */}
                <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-medium text-[#F4F5F7] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requirePassword}
                        onChange={(e) => setRequirePassword(e.target.checked)}
                        className="rounded border-[#222630] text-[#648BFF]"
                      />
                      <span>Require Access Password</span>
                    </label>
                    <Lock className="w-3.5 h-3.5 text-[#9299A5]" />
                  </div>

                  {requirePassword && (
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter access passphrase..."
                      required
                      className="w-full py-2 px-3 bg-[#171A20] border border-[#222630] rounded-xl text-xs focus:border-[#648BFF] focus:outline-none"
                    />
                  )}
                </div>

                {/* Allow Download Checkbox */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs">
                  <div>
                    <span className="font-medium text-[#F4F5F7] block">Recipient Download Permission</span>
                    <span className="text-[11px] text-[#9299A5]">
                      Allow recipient to download the decrypted document file
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="rounded border-[#222630] text-[#648BFF]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20"
                >
                  <QrCode className="w-4 h-4" />
                  Generate Secure QR Code & Link
                </button>
              </form>
            ) : (
              /* Display Generated QR & Link */
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-white inline-block mx-auto shadow-2xl">
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto object-contain" />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs space-y-1.5 text-left">
                  <div className="flex justify-between text-[#9299A5]">
                    <span>Expires At:</span>
                    <span className="font-mono text-[#F4F5F7]">
                      {new Date(generatedShare.expiresAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#9299A5]">
                    <span>Protection:</span>
                    <span className="font-mono text-[#10B981]">
                      {generatedShare.hasPassword ? 'Password Protected' : 'Token Link Only'}
                    </span>
                  </div>
                </div>

                {/* Link Copy Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs font-mono text-[#9299A5] select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-2 rounded-xl bg-[#648BFF] text-white hover:bg-[#5278ea] text-xs font-medium transition-colors shrink-0"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecipientPreview(true)}
                    className="w-full py-2 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-medium text-[#648BFF] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Simulate Recipient View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(generatedShare.id)}
                    className="w-full py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-xs font-medium text-[#EF4444] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: ACTIVE SHARES HISTORY --- */}
        {activeTab === 'active_shares' && (
          <div className="space-y-3">
            {activeShares.length > 0 ? (
              activeShares.map((share) => (
                <div
                  key={share.id}
                  className="p-3.5 rounded-xl bg-[#0B0D10] border border-[#222630] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#F4F5F7]">
                        {share.shareCode.substring(0, 12)}...
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          share.status === 'active'
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : 'bg-[#EF4444]/20 text-[#EF4444]'
                        }`}
                      >
                        {share.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9299A5] block mt-1">
                      Expires: {new Date(share.expiresAt).toLocaleTimeString()} on{' '}
                      {new Date(share.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  {share.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 text-xs font-medium transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#9299A5]">
                No active QR shares for this document.
              </div>
            )}
          </div>
        )}

        {/* Simulated Recipient Modal */}
        {showRecipientPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <div className="w-full max-w-md bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-center text-[#F4F5F7] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base">Recipient Verification Simulator</h4>
                <p className="text-xs text-[#9299A5] mt-1">
                  This simulates how external parties (e.g. airport staff, hospital intake, HR) view
                  your shared document without gaining access to your vault.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0D10] border border-[#222630] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9299A5]">Authorized Document:</span>
                  <span className="font-semibold text-white">{doc.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9299A5]">Category:</span>
                  <span className="font-mono text-[#648BFF]">{doc.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9299A5]">Digital Signature:</span>
                  <span className="font-mono text-[#10B981]">Verified DocuVault Token</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRecipientPreview(false)}
                className="w-full py-2 rounded-xl bg-[#222630] text-xs font-semibold text-white hover:bg-[#2c3240]"
              >
                Close Simulation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

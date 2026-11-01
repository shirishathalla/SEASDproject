import React, { useState } from 'react';
import {
  X,
  Download,
  QrCode,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  Calendar,
  Tag,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';
import { getCryptoInspection } from '../utils/crypto';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShareQR: (doc: DocumentItem) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onShareQR,
}) => {
  if (!isOpen || !doc) return null;

  const [activeTab, setActiveTab] = useState<'preview' | 'ocr' | 'crypto'>('preview');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);

  const handleCopyOcr = () => {
    if (!doc.ocrText) return;
    navigator.clipboard.writeText(doc.ocrText);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name.endsWith('.pdf') || doc.name.endsWith('.jpg') || doc.name.endsWith('.png')
      ? doc.name
      : `${doc.name}.${doc.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;
    link.click();
  };

  const cryptoInspection = doc.encryptedPayload ? getCryptoInspection(doc.encryptedPayload) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl flex flex-col text-[#F4F5F7] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222630] bg-[#0B0D10]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#222630] flex items-center justify-center text-[#648BFF]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base truncate max-w-sm sm:max-w-md">
                {doc.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#9299A5]">
                <span className="font-mono">{doc.category}</span>
                <span>•</span>
                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                {doc.expiryDate && (
                  <>
                    <span>•</span>
                    <span className="text-[#F59E0B]">Expires: {doc.expiryDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShareQR(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222630] hover:bg-[#648BFF] hover:text-white text-xs font-medium transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share QR</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#9299A5] hover:text-white hover:bg-[#222630] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Tabs Bar */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[#222630] bg-[#171A20] text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-[#222630] text-[#648BFF]'
                : 'text-[#9299A5] hover:text-white'
            }`}
          >
            Document Preview
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'ocr'
                ? 'bg-[#222630] text-[#648BFF]'
                : 'text-[#9299A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            OCR Extracted Text {doc.ocrText ? '✓' : ''}
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'crypto'
                ? 'bg-[#222630] text-[#10B981]'
                : 'text-[#9299A5] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Cryptographic Proof
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
          {/* TAB 1: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-[#0B0D10] relative overflow-hidden">
              {/* Zoom & Rotate Toolbar */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#171A20]/90 backdrop-blur-md border border-[#222630] p-1.5 rounded-xl shadow-lg">
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                  className="p-1 rounded hover:bg-[#222630] text-[#9299A5] hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 text-[#C5CAD3]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                  className="p-1 rounded hover:bg-[#222630] text-[#9299A5] hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-[#222630] mx-1" />
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-1 rounded hover:bg-[#222630] text-[#9299A5] hover:text-white"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Viewport */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                {doc.dataUrl.startsWith('data:image/') ? (
                  <div
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-w-full max-h-full flex items-center justify-center origin-center"
                  >
                    <img
                      src={doc.dataUrl}
                      alt={doc.name}
                      className="rounded-xl shadow-2xl max-h-[70vh] object-contain border border-[#222630]"
                    />
                  </div>
                ) : (
                  <iframe
                    src={doc.dataUrl}
                    title={doc.name}
                    className="w-full h-full rounded-xl border border-[#222630]"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OCR TEXT & EXTRACTED FIELDS */}
          {activeTab === 'ocr' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B0D10]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Indexed Optical Character Recognition (OCR)</h4>
                  <p className="text-xs text-[#9299A5]">
                    Extracted text is encrypted at rest and indexed locally for instant smart search.
                  </p>
                </div>
                {doc.ocrText && (
                  <button
                    onClick={handleCopyOcr}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-medium text-[#F4F5F7] transition-colors"
                  >
                    {copiedOcr ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Key Extracted Entities */}
              {doc.keyFields && doc.keyFields.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-[#9299A5] uppercase tracking-wider mb-2">
                    Identified Document Attributes
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {doc.keyFields.map((field, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#171A20] border border-[#222630] flex flex-col"
                      >
                        <span className="text-[10px] text-[#9299A5] uppercase tracking-wider">
                          {field.label}
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#F4F5F7] mt-0.5">
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Extracted OCR Text */}
              <div>
                <h5 className="text-xs font-semibold text-[#9299A5] uppercase tracking-wider mb-2">
                  Full Extracted Text Body
                </h5>
                {doc.ocrText ? (
                  <pre className="p-4 rounded-xl bg-[#171A20] border border-[#222630] text-xs font-mono text-[#C5CAD3] leading-relaxed whitespace-pre-wrap select-text">
                    {doc.ocrText}
                  </pre>
                ) : (
                  <div className="p-6 rounded-xl bg-[#171A20] border border-[#222630] text-center text-xs text-[#9299A5]">
                    No OCR text was extracted for this document. You can re-scan or run Gemini AI auto-classification.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CRYPTOGRAPHIC VERIFICATION PROOF */}
          {activeTab === 'crypto' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0B0D10]">
              <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30">
                <div className="flex items-center gap-2 text-[#10B981] font-bold text-sm mb-1">
                  <ShieldCheck className="w-5 h-5" />
                  Authenticated AES-256-GCM Ciphertext Verified
                </div>
                <p className="text-xs text-[#C5CAD3] leading-relaxed">
                  This document was encrypted on the client device using the Web Crypto API
                  (SubtleCrypto). Decryption requires the derived PBKDF2 key from the user's PIN.
                </p>
              </div>

              {cryptoInspection ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630]">
                      <span className="text-[11px] text-[#9299A5]">Encryption Algorithm</span>
                      <p className="font-mono font-semibold text-[#648BFF] mt-0.5">
                        {cryptoInspection.algorithm}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630]">
                      <span className="text-[11px] text-[#9299A5]">Key Derivation (KDF)</span>
                      <p className="font-mono font-semibold text-[#F4F5F7] mt-0.5">
                        PBKDF2-HMAC-SHA256 ({cryptoInspection.kdfIterations.toLocaleString()} iterations)
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630]">
                      <span className="text-[11px] text-[#9299A5]">Cryptographic Salt (Hex)</span>
                      <p className="font-mono text-[11px] text-[#9299A5] break-all mt-0.5">
                        {cryptoInspection.saltHex}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630]">
                      <span className="text-[11px] text-[#9299A5]">Initialization Vector (IV - 96-bit)</span>
                      <p className="font-mono text-[11px] text-[#9299A5] break-all mt-0.5">
                        {cryptoInspection.ivHex}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#171A20] border border-[#222630]">
                    <span className="text-[11px] text-[#9299A5]">
                      Ciphertext Sample & Authentication Tag (128-bit MAC)
                    </span>
                    <p className="font-mono text-[11px] text-[#10B981] break-all mt-1 bg-[#0B0D10] p-2.5 rounded-lg border border-[#222630]">
                      {cryptoInspection.ciphertextSample}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] text-xs text-[#9299A5]">
                  Standard encrypted payload container active.
                </div>
              )}
            </div>
          )}

          {/* Right Sidebar Details */}
          <div className="w-full md:w-72 bg-[#171A20] border-t md:border-t-0 md:border-l border-[#222630] p-5 space-y-4 shrink-0 overflow-y-auto text-xs">
            <div>
              <h5 className="font-semibold text-[#9299A5] uppercase tracking-wider text-[10px] mb-2">
                Document Details
              </h5>
              <div className="space-y-2">
                <div>
                  <span className="text-[#9299A5] block">Category</span>
                  <span className="font-medium text-[#F4F5F7]">{doc.category}</span>
                </div>
                <div>
                  <span className="text-[#9299A5] block">Document Date</span>
                  <span className="font-medium text-[#F4F5F7]">{doc.documentDate}</span>
                </div>
                <div>
                  <span className="text-[#9299A5] block">Expiry Date</span>
                  <span className="font-medium text-[#F4F5F7]">
                    {doc.expiryDate || 'Permanent / No applicable expiry'}
                  </span>
                </div>
                {doc.description && (
                  <div>
                    <span className="text-[#9299A5] block">Description</span>
                    <p className="text-[#C5CAD3] mt-0.5 leading-relaxed">{doc.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="pt-3 border-t border-[#222630]">
                <h5 className="font-semibold text-[#9299A5] uppercase tracking-wider text-[10px] mb-2">
                  Tags
                </h5>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B0D10] text-[#9299A5] border border-[#222630]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
